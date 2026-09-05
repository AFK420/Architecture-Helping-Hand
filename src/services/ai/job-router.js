/**
 * Architecture Helping Hand - AI Job Router (Phase 15, M6)
 * The single entry point the rest of the application uses:
 *
 *   runAIJob("brutalCritic", { userMessage, context })
 *
 * Pipeline:
 *   Job → resolve assignment → capability check → configured key check →
 *   model status check → context budget vs model window → transport →
 *   normalized response → AI validators (structured schema + numeric claims)
 *
 * Free-cost safety (hard rules):
 *  - fallbackPolicy default is NEVER — no automatic model/provider switch
 *  - no retry loops: one request = one transport call
 *  - quota/rate-limit returns control to the user immediately
 *
 * Assignments + activity log persist WITHOUT keys and WITHOUT project data.
 */

import { AI_ERROR_CODES, normalizeProviderError } from '../../ai/providers/provider.js';
import { getModeProfile, AI_MODES } from '../../ai/modes/modes.js';
import {
  validateStructuredResponse, validateNumericClaims, CRITIC_RESPONSE_SCHEMA
} from '../../ai/schemas/validators.js';

/** Persistent storage key for job assignments (NO keys, NO project data). */
export const AI_JOB_SETTINGS_KEY = 'archiscale_ai_jobs';

/** Activity log storage key (metadata only — never prompts, never keys). */
export const AI_ACTIVITY_LOG_KEY = 'archiscale_ai_activity';

const MAX_ACTIVITY_ENTRIES = 60;

/**
 * AI job definitions. Each job maps to an existing AI mode profile (system
 * prompt + schema) plus its own routing requirements. The user can reassign
 * any job to any model; these definitions never hard-code a provider.
 */
export const AI_JOB_DEFINITIONS = Object.freeze([
  { jobId: 'generalAssistant', label: 'General Assistant', description: 'Open questions and everyday project help.', mode: AI_MODES.MENTOR, requiredCapabilities: { text: true } },
  { jobId: 'tutor', label: 'Tutor', description: 'Socratic teaching on the current project.', mode: AI_MODES.TUTOR, requiredCapabilities: { text: true } },
  { jobId: 'designMentor', label: 'Design Mentor', description: 'Concept development, possibilities, trade-offs.', mode: AI_MODES.MENTOR, requiredCapabilities: { text: true } },
  { jobId: 'studioCritic', label: 'Studio Critic', description: 'Evidence-cited design critique (structured).', mode: AI_MODES.CRITIC, requiredCapabilities: { text: true, structuredOutput: true } },
  { jobId: 'brutalCritic', label: 'Brutal Critic', description: 'Unsentimental critique of the weakest parts.', mode: AI_MODES.BRUTAL, requiredCapabilities: { text: true, structuredOutput: true } },
  { jobId: 'jury', label: 'Jury', description: 'Jury-preparation interrogation of the concept.', mode: AI_MODES.JURY, requiredCapabilities: { text: true, structuredOutput: true } },
  { jobId: 'ideation', label: 'Ideation', description: 'Genuinely different design strategies.', mode: AI_MODES.IDEATION, requiredCapabilities: { text: true } },
  { jobId: 'bestPractice', label: 'Best Practice', description: 'Reference guidance with deterministic calculations.', mode: AI_MODES.BEST_PRACTICE, requiredCapabilities: { text: true } },
  { jobId: 'projectAnalysis', label: 'Project Analysis', description: 'Whole-project structured review.', mode: AI_MODES.CRITIC, requiredCapabilities: { text: true, structuredOutput: true } },
  { jobId: 'imageAnalysis', label: 'Image Analysis', description: 'Interpret sketches, plans, and site photos.', mode: null, requiredCapabilities: { text: true, vision: true } },
  { jobId: 'conceptImage', label: 'Concept Image (Coming Soon / Not Currently Available)', description: 'Conceptual (never technical) image generation — Coming Soon / Not Currently Available.', mode: null, requiredCapabilities: { text: true, imageGen: true } }
]);

/** Fallback policies. Default is NEVER — free-cost safety. */
export const FALLBACK_POLICIES = Object.freeze({
  NEVER: 'never',
  SAME_PROVIDER: 'same-provider',
  ANY_CONFIGURED: 'any-configured'
});

export function getJobDefinition(jobId) {
  return AI_JOB_DEFINITIONS.find(j => j.jobId === jobId) || null;
}

/** Rough token estimate: chars/4 heuristic (documented approximation). */
export function estimateTokens(text) {
  if (typeof text !== 'string' || !text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Creates the job router.
 *
 * @param {Object} options
 * @param {Object} options.providerManager - services/ai/provider-manager.js
 * @param {Object} options.modelCatalog   - services/ai/model-catalog.js
 * @param {Object} options.transports     - services/ai/transports/index.js
 * @param {Function} [options.buildFactsPack] - (scope) => { text, data, factChecks }
 * @param {Object} [options.storage]      - persistence for assignments + log
 * @param {Function} [options.now]
 */
export function createJobRouter(options = {}) {
  const { providerManager, modelCatalog, transports, buildFactsPack } = options;
  const storage = options.storage;
  const now = options.now || (() => new Date().toISOString());

  if (!providerManager) throw new Error('createJobRouter requires a providerManager');
  if (!modelCatalog) throw new Error('createJobRouter requires a modelCatalog');
  if (!transports || typeof transports.get !== 'function') throw new Error('createJobRouter requires transports');

  let assignments = loadAssignments();
  let activityLog = loadActivity();
  const lastErrors = new Map(); // jobId → { at, errorCode, message }

  function loadAssignments() {
    try {
      const raw = storage?.getItem(AI_JOB_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.assignments) return sanitizeAssignments(parsed.assignments);
      }
    } catch (e) {}
    return {};
  }

  /** Only sane assignments survive a load (bad storage never breaks routing). */
  function sanitizeAssignments(saved) {
    const out = {};
    for (const def of AI_JOB_DEFINITIONS) {
      const a = saved[def.jobId];
      if (a && typeof a === 'object' && typeof a.providerId === 'string' && typeof a.modelId === 'string') {
        out[def.jobId] = {
          providerId: a.providerId,
          modelId: a.modelId,
          fallbackPolicy: Object.values(FALLBACK_POLICIES).includes(a.fallbackPolicy) ? a.fallbackPolicy : FALLBACK_POLICIES.NEVER,
          temperature: typeof a.temperature === 'number' ? a.temperature : null,
          maxOutputTokens: typeof a.maxOutputTokens === 'number' ? a.maxOutputTokens : null,
          reasoningEffort: typeof a.reasoningEffort === 'string' ? a.reasoningEffort : null
        };
      }
    }
    return out;
  }

  function persistAssignments() {
    try {
      storage?.setItem(AI_JOB_SETTINGS_KEY, JSON.stringify({ version: 1, assignments, updatedAt: now() }));
    } catch (e) {}
  }

  function loadActivity() {
    try {
      const raw = storage?.getItem(AI_ACTIVITY_LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.slice(0, MAX_ACTIVITY_ENTRIES);
      }
    } catch (e) {}
    return [];
  }

  function persistActivity() {
    try {
      storage?.setItem(AI_ACTIVITY_LOG_KEY, JSON.stringify(activityLog.slice(0, MAX_ACTIVITY_ENTRIES)));
    } catch (e) {}
  }

  // ------------------------------------------------------------------
  // Assignment management
  // ------------------------------------------------------------------

  /**
   * Assigns a model to a job. Refuses when the assignment cannot work:
   * unknown provider, disabled provider, missing key is allowed (status
   * surfaces NO KEY — the user may configure later), model capabilities
   * missing a job requirement.
   */
  function assignModel(jobId, { providerId, modelId, fallbackPolicy, temperature, maxOutputTokens, reasoningEffort }) {
    const def = getJobDefinition(jobId);
    if (!def) return { ok: false, error: `Unknown job "${jobId}".` };
    const providerStatus = providerManager.getProviderStatus(providerId);
    if (!providerStatus) return { ok: false, error: `Unknown provider "${providerId}".` };
    if (!providerStatus.enabled) return { ok: false, error: `${providerStatus.label} is disabled — enable it before assigning.` };
    const model = modelCatalog.getModel(providerId, modelId);
    if (!model) return { ok: false, error: `Model "${modelId}" is not in the ${providerStatus.label} catalog — add it first.` };
    for (const [cap, needed] of Object.entries(def.requiredCapabilities)) {
      if (needed && !model.capabilities[cap]) {
        return { ok: false, error: `Selected model does not support ${capName(cap)}. Choose another model.` };
      }
    }
    assignments[jobId] = {
      providerId,
      modelId,
      fallbackPolicy: Object.values(FALLBACK_POLICIES).includes(fallbackPolicy) ? fallbackPolicy : FALLBACK_POLICIES.NEVER,
      temperature: typeof temperature === 'number' ? temperature : null,
      maxOutputTokens: typeof maxOutputTokens === 'number' ? maxOutputTokens : null,
      reasoningEffort: typeof reasoningEffort === 'string' ? reasoningEffort : null
    };
    persistAssignments();
    return { ok: true, assignment: { ...assignments[jobId] } };
  }

  function clearAssignment(jobId) {
    delete assignments[jobId];
    persistAssignments();
    return { ok: true };
  }

  function getAssignment(jobId) {
    return assignments[jobId] || null;
  }

  function capName(cap) {
    return { structuredOutput: 'structured output', toolCalling: 'tool calling', imageGen: 'image generation', vision: 'vision', text: 'text', reasoning: 'reasoning' }[cap] || cap;
  }

  /**
   * Health status per job for the UI: READY / NO KEY / PROVIDER DISABLED /
   * MODEL UNAVAILABLE / NOT CONFIGURED / CAPABILITY MISMATCH / LAST ERROR.
   */
  function getJobStatus(jobId) {
    const def = getJobDefinition(jobId);
    if (!def) return { jobId, status: 'UNKNOWN', label: jobId };
    const a = assignments[jobId];
    if (!a) return { jobId, status: 'NOT CONFIGURED', label: def.label };
    const providerStatus = providerManager.getProviderStatus(a.providerId);
    if (!providerStatus) return { jobId, status: 'UNKNOWN', label: def.label };
    if (!providerStatus.enabled) return { jobId, status: 'PROVIDER DISABLED', label: def.label, providerId: a.providerId, modelId: a.modelId };
    const model = modelCatalog.getModel(a.providerId, a.modelId);
    if (!model) return { jobId, status: 'MODEL UNAVAILABLE', label: def.label, providerId: a.providerId, modelId: a.modelId };
    if (model.status === 'RETIRED' || model.status === 'UNAVAILABLE') {
      return { jobId, status: 'MODEL UNAVAILABLE', label: def.label, providerId: a.providerId, modelId: a.modelId };
    }
    for (const [cap, needed] of Object.entries(def.requiredCapabilities)) {
      if (needed && !model.capabilities[cap]) {
        return { jobId, status: 'CAPABILITY MISMATCH', label: def.label, providerId: a.providerId, modelId: a.modelId, detail: capName(cap) };
      }
    }
    if (!providerStatus.hasKey) return { jobId, status: 'NO KEY', label: def.label, providerId: a.providerId, modelId: a.modelId };
    const lastError = lastErrors.get(jobId) || null;
    return {
      jobId,
      status: lastError ? 'LAST ERROR' : 'READY',
      label: def.label,
      providerId: a.providerId,
      modelId: a.modelId,
      providerLabel: providerStatus.label,
      modelLabel: model.displayName,
      lastError
    };
  }

  function listJobStatuses() {
    return AI_JOB_DEFINITIONS.map(def => getJobStatus(def.jobId));
  }

  // ------------------------------------------------------------------
  // Execution
  // ------------------------------------------------------------------

  function logActivity(entry) {
    activityLog.unshift({
      at: now(),
      jobId: entry.jobId || null,
      providerId: entry.providerId || null,
      modelId: entry.modelId || null,
      outcome: entry.outcome || 'ERROR',
      errorCode: entry.errorCode || null,
      inputTokens: typeof entry.inputTokens === 'number' ? entry.inputTokens : null,
      outputTokens: typeof entry.outputTokens === 'number' ? entry.outputTokens : null,
      durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : null
      // deliberately NO prompt text, NO project data, NO keys
    });
    activityLog = activityLog.slice(0, MAX_ACTIVITY_ENTRIES);
    persistActivity();
  }

  function getActivityLog() {
    return activityLog.slice();
  }

  function clearActivityLog() {
    activityLog = [];
    persistActivity();
  }

  /** Last error per job (usage/health UI). */
  function recordError(jobId, errorCode, message) {
    lastErrors.set(jobId, { at: now(), errorCode, message });
  }

  function clearError(jobId) {
    lastErrors.delete(jobId);
  }

  /**
   * Context budget check: refuses to send context that clearly exceeds the
   * model's known window, and reports compression in the result so the UI
   * can disclose "Context reduced to fit selected model."
   */
  function checkContextBudget(model, contextText) {
    const window = model?.capabilities?.contextLimit || null;
    if (!window) return { fits: true, reduced: false }; // unknown window: send, provider will judge
    const estimate = estimateTokens(contextText) + 512; // + prompt scaffolding margin
    if (estimate <= window * 0.9) return { fits: true, reduced: false, estimate, window };
    return { fits: false, reduced: true, estimate, window };
  }

  /**
   * Runs one AI job. ALWAYS resolves to a controlled object — never throws.
   *
   * @param {string} jobId
   * @param {Object} request - { userMessage, context?, factsOptions?, image?, requiredCapabilities override }
   * @returns {Promise<Object>} normalized result or controlled failure
   */
  async function runAIJob(jobId, request = {}) {
    const def = getJobDefinition(jobId);
    if (!def) {
      return { ok: false, errorCode: AI_ERROR_CODES.UNKNOWN, message: `Unknown AI job "${jobId}".` };
    }
    const status = getJobStatus(jobId);
    if (status.status === 'NOT CONFIGURED') {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: `"${def.label}" has no model assigned — configure it in the AI Control Center. The app works fully without AI.` };
    }
    if (status.status === 'PROVIDER DISABLED') {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: `The assigned provider (${status.providerId}) is disabled. Reassign the job or enable the provider.` };
    }
    if (status.status === 'MODEL UNAVAILABLE') {
      return { ok: false, errorCode: AI_ERROR_CODES.INVALID_MODEL, message: `The assigned model (${status.modelId}) is unavailable — choose another model. No automatic switch was made.` };
    }
    if (status.status === 'CAPABILITY MISMATCH') {
      return { ok: false, errorCode: AI_ERROR_CODES.UNKNOWN, message: `Assigned model lacks ${status.detail} — reassign this job.` };
    }
    if (status.status === 'NO KEY') {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: `No API key for ${status.providerId} — add one in the AI Control Center. The app works fully without AI.` };
    }

    const assignment = assignments[jobId];
    const providerStatus = providerManager.getProviderStatus(assignment.providerId);
    const model = modelCatalog.getModel(assignment.providerId, assignment.modelId);
    const transport = transports.get(assignment.providerId);
    if (!transport) {
      return { ok: false, errorCode: AI_ERROR_CODES.UNKNOWN, message: 'No transport for the assigned provider.' };
    }

    // Build context (facts pack scoped by the caller) unless the caller
    // supplies prebuilt prompt parts (vision / image jobs).
    let systemPrompt = null;
    let userPrompt = null;
    let factChecks = [];
    const modeProfile = def.mode ? getModeProfile(def.mode) : null;

    if (request.image) {
      // Vision / image jobs: context is a short project summary, the image
      // travels separately through transport options.
      systemPrompt = request.systemPrompt || (jobId === 'conceptImage'
        ? 'Generate a CONCEPTUAL architectural image. Output is for inspiration only — never a technical drawing.'
        : 'You analyze architectural images (sketches, plans, site photos). NEVER present pixel-derived measurements as exact geometry — describe relationships with confidence levels.');
      userPrompt = request.userMessage || request.prompt || 'Describe this architectural image.';
    } else {
      const facts = buildFactsPack
        ? buildFactsPack({ jobId, scope: request.scope, options: request.factsOptions, request })
        : { text: '', data: {}, factChecks: [] };
      factChecks = facts.factChecks || [];
      systemPrompt = modeProfile ? modeProfile.systemPrompt : (request.systemPrompt || 'You are an architecture assistant.');
      userPrompt = [
        'FACTS PACK (deterministic, from the application — trust these numbers):',
        facts.text || '(no project data available)',
        '',
        `STUDENT (${def.label}):`,
        request.userMessage || '(no message)'
      ].join('\n');
    }

    const budget = checkContextBudget(model, userPrompt);
    if (!budget.fits) {
      return {
        ok: false,
        errorCode: AI_ERROR_CODES.UNKNOWN,
        message: `Context too large for this model (~${budget.estimate} tokens vs ${budget.window} window). Select relevant context or a larger model.`,
        contextBudget: budget
      };
    }

    const started = Date.now();
    let transportResult;
    try {
      transportResult = await transport.sendPrompt({
        endpoint: providerStatus.endpoint,
        apiKey: providerManager.getRawKey(assignment.providerId),
        modelId: assignment.modelId,
        systemPrompt,
        userPrompt,
        options: {
          expectsStructured: modeProfile ? modeProfile.expectsStructured : false,
          temperature: assignment.temperature ?? undefined,
          maxOutputTokens: assignment.maxOutputTokens ?? undefined,
          reasoningEffort: assignment.reasoningEffort ?? undefined,
          imageBase64: request.image?.imageBase64,
          mimeType: request.image?.mimeType
        }
      });
    } catch (err) {
      const normalized = normalizeProviderError(err);
      recordError(jobId, normalized.errorCode, normalized.message);
      logActivity({ jobId, providerId: assignment.providerId, modelId: assignment.modelId, outcome: 'ERROR', errorCode: normalized.errorCode, durationMs: Date.now() - started });
      return { ok: false, jobId, ...normalized };
    }
    const durationMs = Date.now() - started;

    if (!transportResult.ok) {
      const normalized = normalizeProviderError(transportResult);
      recordError(jobId, normalized.errorCode, normalized.message);
      logActivity({ jobId, providerId: assignment.providerId, modelId: assignment.modelId, outcome: 'ERROR', errorCode: normalized.errorCode, durationMs });
      // Fallback policy (default NEVER): never switch silently — candidates
      // are computed and surfaced to the user instead.
      if (assignment.fallbackPolicy !== FALLBACK_POLICIES.NEVER) {
        const candidates = computeFallbackCandidates(jobId, normalized.errorCode);
        if (candidates.length > 0) {
          return { ok: false, jobId, ...normalized, fallbackCandidates: candidates };
        }
      }
      return { ok: false, jobId, ...normalized };
    }

    clearError(jobId);
    logActivity({
      jobId,
      providerId: assignment.providerId,
      modelId: assignment.modelId,
      outcome: 'SUCCESS',
      inputTokens: transportResult.usage?.inputTokens ?? null,
      outputTokens: transportResult.usage?.outputTokens ?? null,
      durationMs
    });

    // Structured validation for structured modes.
    const expectsStructured = modeProfile ? modeProfile.expectsStructured : false;
    let structured = null;
    if (expectsStructured) {
      const parsed = extractJsonObject(transportResult.text);
      if (!parsed) {
        recordError(jobId, AI_ERROR_CODES.MALFORMED_RESPONSE, 'AI response was not valid structured JSON.');
        return { ok: false, jobId, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'AI response was not valid structured JSON.', rawText: transportResult.text };
      }
      const validation = validateStructuredResponse(parsed, CRITIC_RESPONSE_SCHEMA);
      if (!validation.ok) {
        recordError(jobId, AI_ERROR_CODES.MALFORMED_RESPONSE, validation.errors[0]);
        return { ok: false, jobId, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: `AI response failed validation: ${validation.errors[0]}`, rawText: transportResult.text };
      }
      for (const finding of parsed.findings || []) {
        if (!finding.trust) finding.trust = 'INFERENCE';
      }
      structured = parsed;
    }

    const numeric = validateNumericClaims(transportResult.text, factChecks);
    return {
      ok: true,
      jobId,
      providerId: assignment.providerId,
      modelId: assignment.modelId,
      text: transportResult.text,
      structured,
      usage: transportResult.usage,
      durationMs,
      consistency: {
        numericClaimsChecked: numeric.claims.length,
        mismatches: numeric.mismatches,
        status: numeric.mismatches.length === 0 ? 'CONSISTENT' : 'NEEDS VERIFICATION'
      }
    };
  }

  /**
   * Computes fallback candidates per policy WITHOUT executing: the UI calls
   * this to offer the user explicit alternatives (no silent switch).
   */
  function computeFallbackCandidates(jobId, errorCode) {
    const a = assignments[jobId];
    const def = getJobDefinition(jobId);
    if (!a || !def) return [];
    if (a.fallbackPolicy === FALLBACK_POLICIES.NEVER) return [];
    const candidates = [];
    for (const status of providerManager.listProviderStatuses()) {
      if (!status.enabled || !status.hasKey) continue;
      if (a.fallbackPolicy === FALLBACK_POLICIES.SAME_PROVIDER && status.id !== a.providerId) continue;
      for (const model of modelCatalog.listModels(status.id)) {
        if (model.status !== 'READY') continue;
        let okCaps = true;
        for (const [cap, needed] of Object.entries(def.requiredCapabilities)) {
          if (needed && !model.capabilities[cap]) okCaps = false;
        }
        if (okCaps) candidates.push({ providerId: status.id, modelId: model.modelId, displayName: model.displayName });
      }
    }
    return candidates.slice(0, 10);
  }

  return {
    runAIJob,
    assignModel,
    clearAssignment,
    getAssignment,
    getJobStatus,
    listJobStatuses,
    computeFallbackCandidates,
    getActivityLog,
    clearActivityLog,
    getLastError: jobId => lastErrors.get(jobId) || null,
    clearError,
    estimateTokens,
    checkContextBudget,
    AI_JOB_DEFINITIONS,
    FALLBACK_POLICIES
  };
}

/** Extracts the first JSON object from model text (fence tolerant). */
export function extractJsonObject(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch (e) {
    return null;
  }
}
