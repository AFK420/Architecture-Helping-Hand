/**
 * Architecture Helping Hand - AI Orchestrator
 * Phase 9.6 + Phase 12: the single entry point for all AI requests.
 *
 *   AI Orchestrator → specialist mode → context builder (facts pack) →
 *   provider → structured response → validator → numeric fact-check → UI
 *
 * AI SUGGESTS. CORE VERIFIES. — the orchestrator never trusts model output:
 * responses are validated against the mode's schema and numeric claims are
 * compared against deterministic facts. No autonomous loops, one request =
 * one response. Network transport is injected (sendPrompt from services).
 *
 * The application is FULLY functional without AI: every failure returns a
 * controlled { ok: false, errorCode } and the UI stays usable.
 */

import { AI_ERROR_CODES, normalizeProviderError, providerSupports } from './providers/provider.js';
import { getModeProfile, AI_MODES } from './modes/modes.js';
import { validateStructuredResponse, validateNumericClaims, CRITIC_RESPONSE_SCHEMA } from './schemas/validators.js';

/** Local error code for unknown mode (kept in the same namespace shape). */
const ERROR_MISSING_MODE = 'MISSING_MODE';

/**
 * Creates the orchestrator.
 *
 * @param {Object} options
 * @param {Object} options.provider - provider handle from createProvider
 * @param {Function} options.getKey - () => apiKey | null (from the key store)
 * @param {Function} options.buildFactsPack - (modeId) => { text, data, factChecks }
 * @param {Object} [options.toolRegistry] - optional registered tools
 * @param {Function} [options.now] - clock override (tests)
 */
export function createOrchestrator(options = {}) {
  const { provider, getKey, buildFactsPack } = options;
  if (!provider) throw new TypeError('Orchestrator requires a provider');
  if (typeof getKey !== 'function') throw new TypeError('Orchestrator requires a key getter');

  function requireReady(needed = {}) {
    if (!providerSupports(provider, needed)) {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: `Provider "${provider.label}" lacks required capabilities.` };
    }
    const apiKey = getKey();
    if (!apiKey) {
      return { ok: false, errorCode: AI_ERROR_CODES.PROVIDER_UNCONFIGURED, message: 'AI is not configured — add an API key in settings. The app works fully without AI.' };
    }
    return { ok: true };
  }

  /**
   * Runs a mode request end-to-end.
   *
   * @param {Object} request
   * @param {string} request.mode - one of AI_MODES
   * @param {string} request.userMessage - the student's question/answer
   * @param {Object} [request.requiredCapabilities] - e.g. { vision: true }
   * @param {Object} [request.factsOptions] - passed to the facts pack builder
   * @returns {Promise<Object>} { ok, mode, text?, structured?, consistency?, errorCode?, message? }
   */
  async function run(request = {}) {
    const modeId = request.mode || AI_MODES.CRITIC;
    const profile = getModeProfile(modeId);
    if (!profile) {
      return { ok: false, errorCode: ERROR_MISSING_MODE, message: `Unknown AI mode "${modeId}"` };
    }

    const ready = requireReady(request.requiredCapabilities);
    if (!ready.ok) return { ok: false, mode: modeId, ...ready };

    const facts = buildFactsPack ? buildFactsPack(modeId, request.factsOptions) : { text: '', data: {}, factChecks: [] };

    const userPrompt = [
      'FACTS PACK (deterministic, from the application — trust these numbers):',
      facts.text || '(no project data available)',
      '',
      `STUDENT (${profile.label} mode):`,
      request.userMessage || '(no message)'
    ].join('\n');

    let providerResult;
    try {
      providerResult = await provider.sendPrompt({
        systemPrompt: profile.systemPrompt,
        userPrompt,
        options: { expectsStructured: profile.expectsStructured, apiKey: getKey() }
      });
    } catch (err) {
      const normalized = normalizeProviderError(err);
      return { ok: false, mode: modeId, ...normalized };
    }

    if (!providerResult.ok) {
      const normalized = normalizeProviderError(providerResult);
      return { ok: false, mode: modeId, ...normalized };
    }

    const text = providerResult.text;

    // Structured modes: parse + validate JSON from the response
    if (profile.expectsStructured) {
      const structured = extractJson(text);
      if (!structured) {
        return { ok: false, mode: modeId, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: 'AI response was not valid structured JSON.', rawText: text };
      }
      const validation = validateStructuredResponse(structured, CRITIC_RESPONSE_SCHEMA);
      if (!validation.ok) {
        return { ok: false, mode: modeId, errorCode: AI_ERROR_CODES.MALFORMED_RESPONSE, message: `AI response failed validation: ${validation.errors[0]}`, rawText: text, validationErrors: validation.errors };
      }
      // Enforce trust labels on findings that lack one
      for (const finding of structured.findings || []) {
        if (!finding.trust) finding.trust = 'INFERENCE';
      }
      // Numeric fact-check against deterministic values
      const numeric = validateNumericClaims(text, facts.factChecks || []);
      return {
        ok: true, mode: modeId,
        structured,
        text,
        consistency: {
          numericClaimsChecked: numeric.claims.length,
          mismatches: numeric.mismatches,
          status: numeric.mismatches.length === 0 ? 'CONSISTENT' : 'NEEDS VERIFICATION'
        }
      };
    }

    // Unstructured modes: still run numeric fact-checking over the prose
    const numeric = validateNumericClaims(text, facts.factChecks || []);
    return {
      ok: true, mode: modeId, text,
      consistency: {
        numericClaimsChecked: numeric.claims.length,
        mismatches: numeric.mismatches,
        status: numeric.mismatches.length === 0 ? 'CONSISTENT' : 'NEEDS VERIFICATION'
      }
    };
  }

  return { run, provider, getModeProfile };
}

/** Extracts the first JSON object from a model response (tolerates prose fences). */
export function extractJson(text) {
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
