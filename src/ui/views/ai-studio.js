/**
 * Architecture Helping Hand - AI Studio View (Mode 20)
 * Phase 15 (M8): the visible, task-focused AI workspace. NOT a chatbot —
 * one job, one question, one validated answer. All routing goes through the
 * job router service; all project context flows through the scoped facts
 * pack; all rendering escapes model output before DOM insertion.
 *
 * Write-permission contract (rule 46): the AI response is READ/SUGGEST only.
 * "Save to Journal" writes a project note the user explicitly triggered —
 * the AI never mutates project state on its own.
 */

import { buildScopedFactsPack } from '../../ai/context/project-context.js';
import { AI_JOB_DEFINITIONS } from '../../services/ai/job-router.js';

export function createAiStudioView(context) {
  const { state, dom, showToast, setUnifiedResultState, AudioService, switchMode, escapeHtml } = context;

  let lastResult = null; // normalized job-router result (text only, no keys)
  let imageData = null;  // { imageBase64, mimeType } for vision jobs
  let busy = false;

  function escape(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function router() {
    return state.ai?.router || null;
  }

  function currentProject() {
    try {
      return context.projectStore?.getProject() || null;
    } catch (e) {
      return null;
    }
  }

  function currentPlanEntities() {
    return Array.isArray(state.plan?.entities) ? state.plan.entities : [];
  }

  function showError(message) {
    if (dom.aiErrorMsg) {
      dom.aiErrorMsg.textContent = `⚠️ ${message}`;
      dom.aiErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'ai', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.aiErrorMsg) {
      dom.aiErrorMsg.style.display = 'none';
      dom.aiErrorMsg.textContent = '';
    }
  }

  // ------------------------------------------------------------------
  // Job selector + image visibility
  // ------------------------------------------------------------------

  function populateJobs() {
    if (!dom.aiJobSelect) return;
    const statuses = router() ? router().listJobStatuses() : [];
    dom.aiJobSelect.innerHTML = AI_JOB_DEFINITIONS.map(def => {
      const st = statuses.find(s => s.jobId === def.jobId);
      const mark = !st ? '' : (st.status === 'READY' ? '✓' : `· ${st.status.toLowerCase()}`);
      return `<option value="${escape(def.jobId)}">${escape(def.label)} ${escape(mark)}</option>`;
    }).join('');
    renderJobHint();
  }

  /** Plain-language description of the selected job (what it does, what it needs). */
  function renderJobHint() {
    if (!dom.aiJobHint) return;
    const jobId = selectedJobId();
    const def = AI_JOB_DEFINITIONS.find(j => j.jobId === jobId);
    if (!def) {
      dom.aiJobHint.textContent = '';
      dom.aiJobHint.style.display = 'none';
      return;
    }
    const caps = Object.entries(def.requiredCapabilities)
      .filter(([, needed]) => needed)
      .map(([cap]) => capName(cap));
    const capText = caps.length > 0 ? ` Needs: ${caps.join(', ')}.` : '';
    dom.aiJobHint.textContent = `${def.description}${capText}`;
    dom.aiJobHint.style.display = 'block';
  }

  function capName(cap) {
    return {
      structuredOutput: 'structured output',
      toolCalling: 'tool calling',
      imageGen: 'image generation',
      vision: 'vision (an image upload)',
      text: 'text',
      reasoning: 'reasoning'
    }[cap] || cap;
  }

  function selectedJobId() {
    return dom.aiJobSelect?.value || 'generalAssistant';
  }

  function requiresImage(jobId) {
    const def = AI_JOB_DEFINITIONS.find(j => j.jobId === jobId);
    return !!def && jobId === 'imageAnalysis';
  }

  function refreshImageGroup() {
    if (dom.aiImageGroup) {
      dom.aiImageGroup.style.display = requiresImage(selectedJobId()) ? 'block' : 'none';
    }
    renderJobHint();
  }

  // ------------------------------------------------------------------
  // Response rendering (all model output escaped — rule 45)
  // ------------------------------------------------------------------

  function renderResponse() {
    if (!dom.aiResponseBody || !dom.aiResponseEmpty) return;
    if (!lastResult || !lastResult.ok) {
      dom.aiResponseEmpty.style.display = 'block';
      dom.aiResponseBody.style.display = 'none';
      if (dom.aiModelBadge) dom.aiModelBadge.textContent = '—';
      if (dom.aiConsistencyStrip) dom.aiConsistencyStrip.style.display = 'none';
      return;
    }
    dom.aiResponseEmpty.style.display = 'none';
    dom.aiResponseBody.style.display = 'block';

    const provider = lastResult.providerId || '—';
    const model = lastResult.modelId || '—';
    if (dom.aiModelBadge) dom.aiModelBadge.textContent = `${provider} · ${model}`;

    if (lastResult.structured && Array.isArray(lastResult.structured.findings)) {
      dom.aiResponseBody.innerHTML = renderStructured(lastResult.structured);
    } else {
      dom.aiResponseBody.innerHTML = `<div class="ai-prose">${escape(lastResult.text || '')}</div>`;
    }

    renderConsistency();
  }

  function renderStructured(structured) {
    const parts = [];
    if (structured.summary) {
      parts.push(`<div style="margin-bottom: 0.6rem;"><strong>SUMMARY</strong><br/>${escape(structured.summary)}</div>`);
    }
    if (structured.verdict) {
      parts.push(`<div style="margin-bottom: 0.8rem;"><strong>VERDICT</strong><br/>${escape(structured.verdict)}</div>`);
    }
    const findings = Array.isArray(structured.findings) ? structured.findings : [];
    findings.forEach((f, idx) => {
      const severity = f.severity === 'high' ? 'var(--color-error)' : f.severity === 'medium' ? 'var(--color-warning)' : 'var(--text-tertiary)';
      const evidence = Array.isArray(f.evidence) ? f.evidence.map(e => `<li>${escape(e)}</li>`).join('') : '';
      parts.push(`
        <div style="border: 1px solid var(--border-color-light); border-left: 3px solid ${severity}; border-radius: 5px; padding: 0.55rem 0.7rem; margin-bottom: 0.55rem; background: var(--bg-card-header);">
          <div style="font-weight: 700; font-size: 0.78rem; margin-bottom: 0.25rem;">${escape(f.title || `Finding ${idx + 1}`)}
            <span style="color: ${severity}; font-weight: 400; font-size: 0.68rem;"> · ${escape((f.severity || 'low').toUpperCase())}</span>
            ${f.trust ? `<span style="color: var(--text-muted); font-weight: 400; font-size: 0.66rem;"> · ${escape(f.trust)}</span>` : ''}
          </div>
          ${f.observation ? `<div style="margin-bottom: 0.3rem;">${escape(f.observation)}</div>` : ''}
          ${evidence ? `<div style="margin-bottom: 0.3rem;"><span style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase;">Evidence</span><ul style="margin: 0.15rem 0 0.3rem 1.1rem; padding: 0; font-size: 0.76rem;">${evidence}</ul></div>` : ''}
          ${f.whyItMatters ? `<div style="margin-bottom: 0.3rem;"><em>Why it matters:</em> ${escape(f.whyItMatters)}</div>` : ''}
          ${f.recommendation ? `<div style="margin-bottom: 0.3rem;"><strong>Recommendation:</strong> ${escape(f.recommendation)}</div>` : ''}
          ${f.alternative ? `<div style="margin-bottom: 0.3rem;"><em>Alternative:</em> ${escape(f.alternative)}</div>` : ''}
          ${f.tradeOff ? `<div style="margin-bottom: 0.3rem;"><em>Trade-off:</em> ${escape(f.tradeOff)}</div>` : ''}
          ${f.testNext ? `<div style="font-size: 0.72rem; color: var(--text-secondary);">→ Test next: ${escape(f.testNext)}</div>` : ''}
        </div>`);
    });
    return parts.join('');
  }

  function renderConsistency() {
    if (!dom.aiConsistencyStrip || !lastResult?.consistency) return;
    const c = lastResult.consistency;
    dom.aiConsistencyStrip.style.display = 'block';
    if (c.status === 'CONSISTENT') {
      dom.aiConsistencyStrip.style.background = 'var(--color-success-subtle)';
      dom.aiConsistencyStrip.style.color = 'var(--color-success)';
      dom.aiConsistencyStrip.textContent = `Numeric check: ${c.numericClaimsChecked} AI claim(s) consistent with core calculations.`;
    } else {
      dom.aiConsistencyStrip.style.background = 'var(--color-warning-subtle)';
      dom.aiConsistencyStrip.style.color = 'var(--color-warning)';
      const first = (c.mismatches && c.mismatches[0]) || {};
      dom.aiConsistencyStrip.textContent = `NEEDS VERIFICATION — ${c.mismatches.length} numeric claim(s) did not match core calculations. ${first.note || ''}`.slice(0, 220);
    }
  }

  // ------------------------------------------------------------------
  // Context summary strip (what would be / was sent)
  // ------------------------------------------------------------------

  function updateContextSummary(dropped) {
    if (!dom.aiContextSummary) return;
    const pack = buildScopedFactsPack({
      project: currentProject(),
      planEntities: currentPlanEntities(),
      request: { scopeHint: dom.aiQuestionInput?.value || '' }
    });
    const rooms = pack.data.rooms.length;
    const furn = pack.data.furniture.length;
    const conflicts = pack.data.conflicts.length;
    const meas = pack.data.measurements.length;
    const decisions = pack.data.decisions.length;
    const droppedNote = (dropped && dropped.length) ? ` · REDUCED: ${dropped.join('; ')}` : '';
    dom.aiContextSummary.textContent =
      `Context: ${rooms} rooms · ${furn} furniture · ${conflicts} conflicts · ${meas} measurements · ${decisions} decisions${droppedNote}`;
  }

  // ------------------------------------------------------------------
  // Run job
  // ------------------------------------------------------------------

  async function runJob() {
    const r = router();
    if (!r) {
      showError('AI services are not initialized.');
      return;
    }
    if (busy) return;
    const jobId = selectedJobId();
    const userMessage = dom.aiQuestionInput?.value?.trim() || '';
    const includeContext = dom.aiIncludeContextToggle ? dom.aiIncludeContextToggle.checked : true;

    if (requiresImage(jobId) && !imageData) {
      showError('Choose an image for the vision job first.');
      return;
    }
    if (!requiresImage(jobId) && !userMessage) {
      showError('Write a question or instruction first.');
      return;
    }

    busy = true;
    clearError();
    setUnifiedResultState({ toolPrefix: 'ai', status: 'running' });
    if (dom.aiRunBtn) {
      const btnText = dom.aiRunBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'ASKING…';
      dom.aiRunBtn.disabled = true;
    }
    updateContextSummary(null);

    try {
      const request = {
        userMessage: userMessage || (requiresImage(jobId) ? 'Describe this architectural image.' : '')
      };
      if (requiresImage(jobId) && imageData) {
        request.image = imageData;
      }
      if (includeContext) {
        // Scope hint: use the question so a named-room question narrows context.
        request.scope = { rooms: currentPlanEntities().filter(e => e.kind === 'room') };
        request.scopeHint = userMessage;
      } else {
        request.scope = { rooms: [] };
      }

      const result = await r.runAIJob(jobId, {
        ...request,
        factsOptions: { scopeHint: includeContext ? userMessage : '' }
      });

      // The router builds the pack internally via the bound context builder;
      // reflect the actual scoped pack (with disclosures) in the summary.
      lastResult = result;
      if (result.ok && includeContext) {
        const pack = buildScopedFactsPack({
          project: currentProject(),
          planEntities: currentPlanEntities(),
          request: { scopeHint: userMessage }
        });
        updateContextSummary(pack.dropped);
      } else if (includeContext) {
        updateContextSummary(null);
      } else if (dom.aiContextSummary) {
        dom.aiContextSummary.textContent = 'Context: not included (user opted out).';
      }

      if (!result.ok) {
        showError(result.message || 'AI request failed.');
        AudioService.playKeyClick();
      } else {
        AudioService.playSuccess();
        setUnifiedResultState({ toolPrefix: 'ai', status: 'success' });
      }
      renderResponse();
      populateJobs();
    } catch (err) {
      showError(`Unexpected error: ${err?.message || 'unknown'}`);
    } finally {
      busy = false;
      if (dom.aiRunBtn) {
        const btnText = dom.aiRunBtn.querySelector('.btn-text');
        if (btnText) btnText.textContent = 'RUN AI JOB';
        dom.aiRunBtn.disabled = false;
      }
    }
  }

  // ------------------------------------------------------------------
  // Image handling (vision job)
  // ------------------------------------------------------------------

  async function handleImageFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      showError('Only PNG, JPEG, or WebP images are supported.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showError('Image is larger than 8 MB — use a smaller export.');
      return;
    }
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          const comma = dataUrl.indexOf(',');
          resolve(comma >= 0 ? dataUrl.slice(comma + 1) : '');
        };
        reader.onerror = () => reject(new Error('read failed'));
        reader.readAsDataURL(file);
      });
      if (!base64) {
        showError('Image could not be read.');
        return;
      }
      imageData = { imageBase64: base64, mimeType: file.type };
      clearError();
      showToast('Image attached — ask a question and run the job');
    } catch (e) {
      showError('Image could not be read.');
    }
  }

  // ------------------------------------------------------------------
  // Save / copy actions
  // ------------------------------------------------------------------

  function saveToJournal() {
    if (!lastResult || !lastResult.ok || !lastResult.text) {
      showToast('Run a successful AI job first', 'warning');
      return;
    }
    const projectStore = context.projectStore;
    if (!projectStore) {
      showToast('Project store unavailable', 'warning');
      return;
    }
    const jobId = lastResult.jobId || 'ai';
    const def = AI_JOB_DEFINITIONS.find(j => j.jobId === jobId);
    const title = `AI ${def ? def.label : jobId} — ${new Date().toLocaleString()}`;
    const body = (lastResult.text || '').slice(0, 4000);
    const res = projectStore.updateProject(draft => {
      draft.notes.push({ id: `note-ai-${Date.now().toString(36)}`, title, body, createdAt: new Date().toISOString(), source: 'ai' });
      return draft;
    });
    if (res.ok) {
      showToast('AI response saved to the project journal');
      AudioService.playSuccess();
    } else {
      showToast(res.errors?.[0] || 'Save failed', 'warning');
    }
  }

  function copyResponse() {
    if (!lastResult || !lastResult.ok || !lastResult.text) {
      showToast('Run a successful AI job first', 'warning');
      return;
    }
    context.copyToClipboard(lastResult.text, 'AI response');
  }

  // ------------------------------------------------------------------
  // View contract
  // ------------------------------------------------------------------

  return {
    id: 'ai',
    mount() {
      populateJobs();
      refreshImageGroup();
      renderResponse();
      updateContextSummary(null);
    },
    onModeEnter() {
      populateJobs();
      refreshImageGroup();
    },
    getController() {
      return {
        runJob,
        populateJobs,
        saveToJournal,
        copyResponse,
        handleImageFile,
        refreshImageGroup,
        setSaveNoteHandler(fn) { if (fn) fn(); }
      };
    }
  };
}

/** Exported for tests: the view's rendering helpers are pure on input. */
export const AI_STUDIO_TEST_HOOKS = { buildScopedFactsPack };
