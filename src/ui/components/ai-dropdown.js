/**
 * Architecture Helping Hand - Omnipresent Top AI Dropdown Assistant Component
 * Provides a slide-down AI drawer accessible from anywhere in the app without
 * leaving the canvas.
 *
 * Honesty contract (AI_ARCHITECTURE): this drawer is a thin client of the
 * real AI job router. It never fabricates answers. Without a configured
 * provider/key it shows AI UNAVAILABLE and lists what still works. Model
 * answers are rendered verbatim with a provider label; any canvas mutations
 * happen only through the deterministic action pipeline applied by the user.
 */

import {
  serializeDrawingContext,
  buildArchitecturalPrompt,
  parseAiActions,
  executeAiAction
} from '../../core/ai-bridge.js';

const CHAT_JOB_ID = 'generalAssistant';

export function initAiDropdownDrawer(container, state, options = {}) {
  if (!container) return;

  let isOpen = false;
  let chatHistory = [];
  let busy = false;

  function router() {
    return state?.ai?.router || null;
  }

  /** Honest provider readiness: a job is usable only when the router says so. */
  function chatJobStatus() {
    const r = router();
    if (!r || typeof r.listJobStatuses !== 'function') return null;
    try {
      return r.listJobStatuses().find(s => s.jobId === CHAT_JOB_ID) || null;
    } catch (e) {
      return null;
    }
  }

  function aiUnavailableCard(status) {
    const reason = status
      ? (status.status === 'NO KEY'
          ? 'No API key is configured for the assigned provider.'
          : `The assigned model is not ready (${status.status}).`)
      : 'No AI provider is configured.';
    return `
      <div class="ai-welcome-card" data-ai-unavailable="true">
        <span class="welcome-icon">🔒</span>
        <h4>AI UNAVAILABLE</h4>
        <p>${escapeAiHtml(reason)}</p>
        <p style="font-size: 0.72rem; color: var(--text-muted);">Configure a provider in the AI Control Center. The app works fully without AI:</p>
        <ul style="font-size: 0.72rem; color: var(--text-muted); text-align: left; margin: 0.3rem 0 0 1rem;">
          <li>Drawing &amp; geometry tools</li>
          <li>Measurements &amp; calculations</li>
          <li>Issues (QA) &amp; requirements</li>
          <li>Exports &amp; project management</li>
        </ul>
      </div>`;
  }

  function renderDrawer() {
    const ctx = serializeDrawingContext(state);
    const status = chatJobStatus();
    const aiReady = status && status.status === 'READY';

    let html = `
      <div class="app-ai-drawer ${isOpen ? 'open' : ''}" id="app-ai-drawer" role="dialog" aria-label="Omnipresent AI Assistant">
        <div class="ai-drawer-backdrop" id="ai-drawer-backdrop"></div>
        <div class="ai-drawer-card">
          <!-- Drawer Header -->
          <div class="ai-drawer-header">
            <div class="ai-header-left">
              <span class="ai-sparkle-icon">✨</span>
              <span class="ai-title">Architectural AI Co-Pilot</span>
              <span class="ai-context-pill" title="Live context passed to the configured AI provider">
                📍 ${ctx.documentName} · ${ctx.entityCount} entities · Mode: ${ctx.persona.toUpperCase()}
              </span>
            </div>
            <div class="ai-header-right">
              <span class="ai-context-pill" title="Provider routing status for this drawer" style="${aiReady ? 'color: #4ade80;' : 'color: #f59e0b;'}">
                ${aiReady ? `AI READY · ${escapeAiHtml(String(status.providerId || ''))}` : 'AI UNAVAILABLE'}
              </span>
              <button type="button" class="btn-drawer-close" id="btn-ai-drawer-close" title="Close AI Assistant (Esc)">✕</button>
            </div>
          </div>

          <!-- Quick Context Prompt Chips -->
          <div class="ai-prompt-chips-row">
            <button type="button" class="ai-chip-btn" data-prompt="Check IBC stair compliance and egress geometry for this floor plan." ${aiReady ? '' : 'disabled'}>
              📐 Verify Code &amp; Stairs
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="Review this plan's room proportions and circulation." ${aiReady ? '' : 'disabled'}>
              🏢 Review Layout
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="What should I dimension next on this drawing?" ${aiReady ? '' : 'disabled'}>
              📏 Dimension Advice
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="Suggest appropriate exterior wall and roof parapet construction details." ${aiReady ? '' : 'disabled'}>
              🧱 Construction Details
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="Calculate net usable area vs gross footprint and spatial efficiency ratio." ${aiReady ? '' : 'disabled'}>
              📊 Area Efficiency
            </button>
          </div>

          <!-- Conversation & Results Stream -->
          <div class="ai-conversation-stream" id="ai-conversation-stream">
            ${chatHistory.length === 0 ? (aiReady ? `
              <div class="ai-welcome-card">
                <span class="welcome-icon">🏛️</span>
                <h4>How can I help with your design?</h4>
                <p>Ask anything about floor plans, dimensions, code requirements, stairs, structural grids, or construction details. Answers cite the live project facts.</p>
              </div>
            ` : aiUnavailableCard(status)) : ''}
            ${chatHistory.map(item => `
              <div class="ai-message-bubble ${item.role}">
                <div class="message-sender">${item.role === 'user' ? 'You' : `AI · ${escapeAiHtml(item.sourceLabel || 'model')}`}</div>
                <div class="message-body">${item.htmlContent}</div>
                ${item.actions && item.actions.length > 0 ? `
                  <div class="ai-action-card">
                    <span class="action-summary">✨ Model proposed ${item.actions.length} action(s):</span>
                    <button type="button" class="btn btn-sm btn-primary ai-apply-btn" data-action-idx="${item.id}">
                      ➕ Apply to Viewport
                    </button>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>

          <!-- Input Bar -->
          <div class="ai-drawer-input-strip">
            <input type="text" id="ai-drawer-prompt-input" class="ai-drawer-input"
              placeholder="${aiReady ? 'Ask AI about your drawing or design…' : 'AI unavailable — configure a provider in the AI Control Center'}"
              autocomplete="off" ${aiReady ? '' : 'disabled'} />
            <button type="button" id="btn-ai-drawer-send" class="btn btn-primary ai-send-btn" ${aiReady && !busy ? '' : 'disabled'}>${busy ? '…' : 'Send'}</button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    attachEvents();
  }

  function attachEvents() {
    const backdrop = container.querySelector('#ai-drawer-backdrop');
    const closeBtn = container.querySelector('#btn-ai-drawer-close');
    const sendBtn = container.querySelector('#btn-ai-drawer-send');
    const input = container.querySelector('#ai-drawer-prompt-input');

    backdrop?.addEventListener('click', () => toggle(false));
    closeBtn?.addEventListener('click', () => toggle(false));

    sendBtn?.addEventListener('click', handleSend);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      } else if (e.key === 'Escape') {
        toggle(false);
      }
    });

    container.querySelectorAll('.ai-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled || !input) return;
        input.value = btn.dataset.prompt;
        handleSend();
      });
    });

    container.querySelectorAll('.ai-apply-btn').forEach(applyBtn => {
      applyBtn.addEventListener('click', () => {
        const item = chatHistory.find(h => h.id === applyBtn.dataset.actionIdx);
        if (item && item.actions) {
          let appliedCount = 0;
          for (const act of item.actions) {
            executeAiAction(act, state.plan);
            appliedCount++;
          }
          if (typeof options.onActionApplied === 'function') {
            options.onActionApplied(appliedCount);
          }
          applyBtn.textContent = '✅ Applied to Canvas!';
          applyBtn.disabled = true;
        }
      });
    });
  }

  async function handleSend() {
    const input = container.querySelector('#ai-drawer-prompt-input');
    if (!input || busy) return;
    const prompt = input.value.trim();
    if (!prompt) return;

    const r = router();
    const status = chatJobStatus();
    if (!r || !status || status.status !== 'READY') {
      // Never fabricate: show the honest state instead.
      chatHistory.push({
        id: 'msg-' + Date.now(),
        role: 'user',
        htmlContent: escapeAiHtml(prompt)
      });
      chatHistory.push({
        id: 'resp-' + Date.now(),
        role: 'assistant',
        sourceLabel: 'system',
        htmlContent: `<p><strong>AI UNAVAILABLE</strong></p><p>${escapeAiHtml(status ? (status.status === 'NO KEY' ? 'No API key configured for the assigned provider.' : `Assigned model not ready (${status.status}).`) : 'No AI provider is configured.')}</p><p>Open the AI Control Center to configure a provider. All drawing, measurement, QA, and export tools work without AI.</p>`
      });
      renderDrawer();
      return;
    }

    input.value = '';
    chatHistory.push({
      id: 'msg-' + Date.now(),
      role: 'user',
      htmlContent: escapeAiHtml(prompt)
    });
    busy = true;
    chatHistory.push({ id: 'pending', role: 'assistant', sourceLabel: 'waiting', htmlContent: '<p><em>Asking the model…</em></p>' });
    renderDrawer();
    const stream = container.querySelector('#ai-conversation-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;

    // Real call through the job router — the same path the AI Studio uses.
    // The router builds its own scoped facts pack; the enriched prompt is
    // kept only for logging/debug parity with the legacy path.
    const ctx = serializeDrawingContext(state);
    const enrichedPrompt = buildArchitecturalPrompt(prompt, ctx);
    if (enrichedPrompt && typeof options.onEnrichedPrompt === 'function') {
      options.onEnrichedPrompt(enrichedPrompt);
    }

    let result;
    try {
      result = await r.runAIJob(CHAT_JOB_ID, {
        userMessage: prompt,
        scopeHint: prompt
      });
    } catch (e) {
      result = { ok: false, message: e?.message || 'The AI request failed.' };
    }

    chatHistory = chatHistory.filter(h => h.id !== 'pending');
    const sourceLabel = result.ok
      ? `${result.providerId || status.providerId} · ${result.modelId || status.modelId}`
      : 'system';

    if (result.ok) {
      // Deterministic action pipeline: parse structured proposals (if any)
      // and offer them for user-approved apply. Never auto-mutate.
      const actions = parseAiActions(result.text || '');
      chatHistory.push({
        id: 'resp-' + Date.now(),
        role: 'assistant',
        sourceLabel,
        htmlContent: `<p>${escapeAiHtml(String(result.text || '')).replace(/\n/g, '<br>')}</p>`,
        actions
      });
    } else {
      chatHistory.push({
        id: 'resp-' + Date.now(),
        role: 'assistant',
        sourceLabel,
        htmlContent: `<p><strong>AI request failed:</strong> ${escapeAiHtml(result.message || 'Unknown error.')}</p><p>The app continues to work fully without AI.</p>`
      });
    }

    busy = false;
    renderDrawer();
    const stream2 = container.querySelector('#ai-conversation-stream');
    if (stream2) stream2.scrollTop = stream2.scrollHeight;
  }

  function toggle(show) {
    isOpen = typeof show === 'boolean' ? show : !isOpen;
    renderDrawer();
    if (isOpen) {
      setTimeout(() => {
        container.querySelector('#ai-drawer-prompt-input')?.focus();
      }, 100);
    }
  }

  // Keyboard shortcut Ctrl + Space (skipped while typing — Ctrl+Space is an
  // IME toggle / completion chord in many editors)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
      if (typing) return;
      e.preventDefault();
      toggle();
    }
  });

  renderDrawer();

  return {
    toggle,
    open: () => toggle(true),
    close: () => toggle(false),
    isOpen: () => isOpen,
    isProviderReady: () => {
      const s = chatJobStatus();
      return !!(s && s.status === 'READY');
    }
  };
}

function escapeAiHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
