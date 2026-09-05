/**
 * Architecture Helping Hand - AI Control Center View (Mode 21)
 * Phase 15 (M7): providers, keys, model catalog, job assignments, activity.
 *
 * Security contract rendered here:
 *  - keys show masked only; typing a new key replaces (never re-displays)
 *  - session vs persistent storage is an explicit choice with a plain-
 *    language explanation
 *  - connection tests are explicit button actions (the only live requests)
 *  - disabled providers say so; retired models never silently reassign
 */

import { AI_JOB_DEFINITIONS, FALLBACK_POLICIES } from '../../services/ai/job-router.js';

export function createAiControlCenterView(context) {
  const { state, dom, showToast, setUnifiedResultState, AudioService } = context;

  function escape(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ai() {
    return state.ai || null; // { http, transports, providerManager, modelCatalog, router }
  }

  function showError(message) {
    if (dom.aiSettingsErrorMsg) {
      dom.aiSettingsErrorMsg.textContent = `⚠️ ${message}`;
      dom.aiSettingsErrorMsg.style.display = 'block';
    }
    setUnifiedResultState({ toolPrefix: 'ai-settings', status: 'error', errorText: `⚠️ ${message}` });
  }

  function clearError() {
    if (dom.aiSettingsErrorMsg) {
      dom.aiSettingsErrorMsg.style.display = 'none';
      dom.aiSettingsErrorMsg.textContent = '';
    }
  }

  // ------------------------------------------------------------------
  // Providers panel
  // ------------------------------------------------------------------

  function renderProviders() {
    const svc = ai();
    if (!svc || !dom.aiProvidersList) return;
    const statuses = svc.providerManager.listProviderStatuses();
    dom.aiProvidersList.innerHTML = statuses.map(s => {
      const dot = s.hasKey ? '●' : '○';
      const dotColor = s.hasKey ? 'var(--color-success)' : 'var(--text-muted)';
      const stateText = !s.enabled ? 'Disabled' : (s.hasKey ? 'Configured' : 'No key');
      return `
        <div class="ai-provider-row" role="listitem" data-provider="${escape(s.id)}" style="border: 1px solid var(--border-color-light); border-radius: 6px; padding: 0.6rem 0.75rem; background: var(--bg-card-header);">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <div style="font-size: 0.82rem;">
              <strong style="color: var(--accent-primary);">${escape(s.label)}</strong>
              <span style="color: ${dotColor};"> ${dot}</span>
              <span style="color: var(--text-muted); font-size: 0.72rem;"> ${escape(stateText)}${s.hasKey ? ` · <span title="masked">${escape(s.maskedKey)}</span>` : ''}</span>
            </div>
            <label style="display: flex; gap: 0.35rem; align-items: center; font-size: 0.7rem; color: var(--text-secondary); cursor: pointer;">
              <input type="checkbox" class="ai-provider-enabled" data-provider="${escape(s.id)}" ${s.enabled ? 'checked' : ''} style="width: auto;" />
              Enabled
            </label>
          </div>
          <div class="ai-provider-detail" style="display: block; margin-top: 0.55rem;">
            <p style="margin: 0 0 0.5rem; font-size: 0.72rem; color: var(--text-muted);">${escape(s.description)} <a href="${escape(s.docsUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary);">Docs ↗</a></p>
            <div class="input-row-group" style="margin-bottom: 0.5rem;">
              <label class="input-label" style="font-size: 0.68rem;" for="ai-provider-key-${escape(s.id)}">API key ${s.hasKey ? '(paste a new key to replace)' : ''}</label>
              <div style="display: flex; gap: 0.5rem;">
                <input type="password" id="ai-provider-key-${escape(s.id)}" class="text-input ai-provider-key-input" data-provider="${escape(s.id)}" placeholder="${escape(s.hasKey ? '•••••••• (stored)' : (s.keyHint || 'API key'))}" autocomplete="off" style="flex: 1;" aria-label="API key for ${escape(s.label)}" aria-describedby="ai-provider-key-hint-${escape(s.id)}" />
                <button type="button" class="result-action-btn ai-provider-key-save" data-provider="${escape(s.id)}" title="Save the key" style="padding: 0.3rem 0.6rem;"><span>💾</span></button>
                <button type="button" class="result-action-btn ai-provider-key-clear" data-provider="${escape(s.id)}" title="Remove the stored key" style="padding: 0.3rem 0.6rem;"><span>🗑</span></button>
              </div>
              <p id="ai-provider-key-hint-${escape(s.id)}" class="field-hint" style="font-size: 0.66rem; color: var(--text-muted); margin: 0.3rem 0 0;">${escape(s.keyHint || 'Paste the API key from the provider\'s dashboard. It is shown masked only and never enters a project document.')}</p>
              <label style="display: flex; gap: 0.4rem; align-items: center; font-size: 0.68rem; color: var(--text-secondary); margin-top: 0.35rem; cursor: pointer;">
                <input type="radio" name="ai-key-mode-${escape(s.id)}" class="ai-key-mode" data-provider="${escape(s.id)}" value="session" ${s.keyMode === 'session' ? 'checked' : ''} style="width: auto;" />
                Session only (safest — cleared when the tab closes)
              </label>
              <label style="display: flex; gap: 0.4rem; align-items: center; font-size: 0.68rem; color: var(--text-secondary); cursor: pointer;">
                <input type="radio" name="ai-key-mode-${escape(s.id)}" class="ai-key-mode" data-provider="${escape(s.id)}" value="persistent" ${s.keyMode === 'persistent' ? 'checked' : ''} style="width: auto;" />
                Persist locally (convenient — stored in this browser's localStorage, NOT an OS secret manager)
              </label>
            </div>
            ${s.endpointEditable ? `
            <div class="input-row-group" style="margin-bottom: 0.5rem;">
              <label class="input-label" style="font-size: 0.68rem;">API endpoint (advanced)</label>
              <input type="text" class="text-input ai-provider-endpoint" data-provider="${escape(s.id)}" value="${escape(s.endpoint)}" style="width: 100%; font-family: var(--font-family-mono); font-size: 0.7rem;" aria-label="API endpoint for ${escape(s.label)}" />
            </div>` : ''}
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <button type="button" class="result-action-btn ai-provider-test" data-provider="${escape(s.id)}" title="Send a minimal live test request (no project data)"><span>🔌 Test</span></button>
              <button type="button" class="result-action-btn ai-provider-discover" data-provider="${escape(s.id)}" title="Fetch the provider's model list"><span>🔄 Models</span></button>
            </div>
            <div class="ai-provider-status" data-provider="${escape(s.id)}" style="margin-top: 0.45rem; font-size: 0.7rem; color: var(--text-muted);"></div>
          </div>
          <button type="button" class="ai-provider-toggle" data-provider="${escape(s.id)}" style="background: none; border: none; color: var(--text-tertiary); font-size: 0.68rem; cursor: pointer; padding: 0; margin-top: 0.3rem;">Details ▴</button>
        </div>`;
    }).join('');

    // Wire interactions
    dom.aiProvidersList.querySelectorAll('.ai-provider-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.ai-provider-row');
        const detail = row?.querySelector('.ai-provider-detail');
        if (detail) {
          const open = detail.style.display !== 'none';
          detail.style.display = open ? 'none' : 'block';
          btn.textContent = open ? 'Details ▾' : 'Details ▴';
        }
      });
    });
    dom.aiProvidersList.querySelectorAll('.ai-provider-enabled').forEach(cb => {
      cb.addEventListener('change', () => {
        const res = svc.providerManager.setEnabled(cb.dataset.provider, cb.checked);
        if (res.ok) {
          showToast(`${cb.dataset.provider} ${cb.checked ? 'enabled' : 'disabled'}`);
          renderProviders();
          renderJobs();
        }
      });
    });
    dom.aiProvidersList.querySelectorAll('.ai-provider-key-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.provider;
        const input = dom.aiProvidersList.querySelector(`.ai-provider-key-input[data-provider="${pid}"]`);
        const value = input?.value || '';
        if (!value.trim()) {
          showError('Type the key before saving.');
          return;
        }
        const res = svc.providerManager.setKey(pid, value);
        if (res.ok) {
          if (input) input.value = '';
          clearError();
          showToast(`Key saved (${res.mode} storage) — shown masked only`);
          AudioService.playSuccess();
          renderProviders();
          renderJobs();
        } else {
          showError(res.error);
        }
      });
    });
    dom.aiProvidersList.querySelectorAll('.ai-provider-key-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid = btn.dataset.provider;
        svc.providerManager.clearKey(pid);
        showToast('Key removed');
        renderProviders();
        renderJobs();
      });
    });
    dom.aiProvidersList.querySelectorAll('.ai-key-mode').forEach(radio => {
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        const res = svc.providerManager.setKeyMode(radio.dataset.provider, radio.value);
        if (res.ok) {
          showToast(radio.value === 'session'
            ? 'Session-only selected — any persisted key for this provider was cleared'
            : 'Persistent storage selected — the key stays in this browser');
          renderProviders();
        }
      });
    });
    dom.aiProvidersList.querySelectorAll('.ai-provider-endpoint').forEach(input => {
      input.addEventListener('change', () => {
        const res = svc.providerManager.setEndpoint(input.dataset.provider, input.value);
        if (!res.ok) {
          showError(res.error);
        } else {
          clearError();
          showToast('Endpoint updated');
        }
      });
    });
    dom.aiProvidersList.querySelectorAll('.ai-provider-test').forEach(btn => {
      btn.addEventListener('click', () => testProvider(btn.dataset.provider, btn));
    });
    dom.aiProvidersList.querySelectorAll('.ai-provider-discover').forEach(btn => {
      btn.addEventListener('click', () => discoverModels(btn.dataset.provider, btn));
    });
  }

  /** Explicit, user-triggered live connection test (the only one). */
  async function testProvider(providerId, btn) {
    const svc = ai();
    if (!svc) return;
    const statusEl = dom.aiProvidersList?.querySelector(`.ai-provider-status[data-provider="${providerId}"]`);
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Testing…';
    // Test against the assigned model when one exists for this provider.
    const assigned = svc.router?.listJobStatuses().find(s => s.providerId === providerId && s.modelId);
    const transport = svc.transports.get(providerId);
    const res = await svc.providerManager.testConnection(providerId, {
      transport,
      modelId: assigned?.modelId || null
    });
    if (btn) btn.disabled = false;
    if (statusEl) {
      if (res.ok) {
        statusEl.textContent = `● CONNECTED${res.latencyMs != null ? ` (${res.latencyMs} ms)` : ''}${res.modelId ? ` · ${res.modelId}` : ''}`;
        statusEl.style.color = 'var(--color-success)';
        AudioService.playSuccess();
      } else {
        statusEl.textContent = `✕ ${res.message}`;
        statusEl.style.color = 'var(--color-error)';
        AudioService.playKeyClick();
      }
    }
  }

  /** Explicit, user-triggered model discovery (network). */
  async function discoverModels(providerId, btn) {
    const svc = ai();
    if (!svc) return;
    const statusEl = dom.aiProvidersList?.querySelector(`.ai-provider-status[data-provider="${providerId}"]`);
    if (!svc.providerManager.hasKey(providerId)) {
      if (statusEl) {
        statusEl.textContent = '✕ Set an API key before refreshing models.';
        statusEl.style.color = 'var(--color-error)';
      }
      return;
    }
    const transport = svc.transports.get(providerId);
    if (!transport?.listModels) return;
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = 'Discovering models…';
    const status = svc.providerManager.getProviderStatus(providerId);
    let res;
    try {
      res = await transport.listModels({ endpoint: status.endpoint, apiKey: svc.providerManager.getRawKey(providerId) });
    } catch (err) {
      res = { ok: false, message: err?.message || 'discovery failed' };
    }
    if (btn) btn.disabled = false;
    if (res.ok) {
      const merge = svc.modelCatalog.mergeDiscovery(providerId, res.models);
      if (statusEl) {
        statusEl.textContent = `● ${merge.total} models in catalog (+${merge.added} new)`;
        statusEl.style.color = 'var(--color-success)';
      }
      showToast(`${providerId}: ${merge.added} new model(s), ${merge.updated} updated`);
      renderCatalog();
      renderJobs();
    } else {
      // Discovery failure does NOT break the provider — manual entry remains.
      if (statusEl) {
        statusEl.textContent = `✕ ${res.message || 'Discovery unavailable'} — use manual model entry below.`;
        statusEl.style.color = 'var(--color-warning)';
      }
    }
  }

  // ------------------------------------------------------------------
  // Jobs panel
  // ------------------------------------------------------------------

  function statusColor(status) {
    switch (status) {
      case 'READY': return 'var(--color-success)';
      case 'NOT CONFIGURED': return 'var(--text-muted)';
      case 'NO KEY': return 'var(--color-warning)';
      case 'PROVIDER DISABLED':
      case 'MODEL UNAVAILABLE':
      case 'CAPABILITY MISMATCH': return 'var(--color-error)';
      case 'LAST ERROR': return 'var(--color-warning)';
      default: return 'var(--text-muted)';
    }
  }

  function renderJobs() {
    const svc = ai();
    if (!svc || !dom.aiJobsList) return;
    const statuses = svc.router.listJobStatuses();
    const readyCount = statuses.filter(s => s.status === 'READY').length;
    if (dom.aiJobsReadyBadge) dom.aiJobsReadyBadge.textContent = `${readyCount} READY`;

    dom.aiJobsList.innerHTML = statuses.map(st => {
      const assigned = svc.router.getAssignment(st.jobId);
      const def = AI_JOB_DEFINITIONS.find(j => j.jobId === st.jobId);
      const modelText = st.status === 'NOT CONFIGURED'
        ? 'Not configured'
        : `${st.providerId || '?'} · ${st.modelId || '?'}`;
      const detail = st.lastError ? ` — ${escape(st.lastError.errorCode)}` : '';
      const caps = def
        ? Object.entries(def.requiredCapabilities).filter(([, needed]) => needed).map(([cap]) => cap === 'structuredOutput' ? 'structured' : (cap === 'imageGen' ? 'image gen (Coming Soon / Not Currently Available)' : cap))
        : [];
      const capsText = caps.length > 0 ? caps.join(' · ') : '';
      return `
        <div class="ai-job-row" role="listitem" data-job="${escape(st.jobId)}" style="border: 1px solid var(--border-color-light); border-radius: 5px; padding: 0.45rem 0.6rem; display: flex; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; min-width: 0;">
          <div style="font-size: 0.78rem; min-width: 0; flex: 1 1 160px;">
            <strong style="color: var(--text-primary);">${escape(st.label)}</strong>
            <span style="color: ${statusColor(st.status)}; font-size: 0.68rem; font-weight: 700;"> ● ${escape(st.status)}${detail}</span>
            <div style="color: var(--text-muted); font-size: 0.68rem; margin-top: 0.1rem;">${escape(def ? def.description : '')}</div>
            ${capsText ? `<div style="color: var(--text-muted); font-size: 0.64rem;">Requires: ${escape(capsText)}</div>` : ''}
            <div style="color: var(--text-muted); font-size: 0.66rem; margin-top: 0.1rem; font-family: var(--font-family-mono);">${escape(modelText)}</div>
          </div>
          <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
            <select class="calc-select ai-job-provider" data-job="${escape(st.jobId)}" style="min-width: 110px; flex: 1 1 110px; max-width: 100%; font-size: 0.7rem;" aria-label="Provider for ${escape(st.label)}">
              <option value="">Provider…</option>
              ${svc.providerManager.listProviderStatuses().map(p =>
                `<option value="${escape(p.id)}" ${assigned?.providerId === p.id ? 'selected' : ''}>${escape(p.label)}</option>`).join('')}
            </select>
            <select class="calc-select ai-job-model" data-job="${escape(st.jobId)}" style="min-width: 150px; flex: 1 1 150px; max-width: 100%; font-size: 0.7rem;" aria-label="Model for ${escape(st.label)}"></select>
            <button type="button" class="result-action-btn ai-job-save" data-job="${escape(st.jobId)}" style="padding: 0.25rem 0.55rem; font-size: 0.68rem;" title="Assign the selected provider/model"><span>Assign</span></button>
            <button type="button" class="result-action-btn ai-job-clear" data-job="${escape(st.jobId)}" style="padding: 0.25rem 0.55rem; font-size: 0.68rem;" title="Remove the assignment"><span>✕</span></button>
          </div>
        </div>`;
    }).join('');

    // Populate model dropdowns for the currently-chosen provider
    dom.aiJobsList.querySelectorAll('.ai-job-row').forEach(row => {
      const jobId = row.dataset.job;
      const providerSel = row.querySelector('.ai-job-provider');
      const modelSel = row.querySelector('.ai-job-model');
      const fillModels = pid => {
        const def = AI_JOB_DEFINITIONS.find(j => j.jobId === jobId);
        const models = pid ? svc.modelCatalog.listModels(pid) : [];
        modelSel.innerHTML = '<option value="">Model…</option>' + models.map(m =>
          `<option value="${escape(m.modelId)}">${escape(m.displayName)}${m.origin === 'manual' ? ' (user declared)' : ''}</option>`).join('');
        const assigned = svc.router.getAssignment(jobId);
        if (assigned && assigned.providerId === pid) {
          modelSel.value = assigned.modelId;
        }
        void def;
      };
      fillModels(providerSel.value);
      providerSel.addEventListener('change', () => fillModels(providerSel.value));
    });

    dom.aiJobsList.querySelectorAll('.ai-job-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const jobId = btn.dataset.job;
        const row = btn.closest('.ai-job-row');
        const pid = row?.querySelector('.ai-job-provider')?.value;
        const mid = row?.querySelector('.ai-job-model')?.value;
        if (!pid || !mid) {
          showError('Choose both a provider and a model before assigning.');
          return;
        }
        const res = svc.router.assignModel(jobId, { providerId: pid, modelId: mid, fallbackPolicy: FALLBACK_POLICIES.NEVER });
        if (res.ok) {
          clearError();
          showToast('Job assigned — fallback policy: never (default)');
          AudioService.playSuccess();
          renderJobs();
        } else {
          showError(res.error);
        }
      });
    });
    dom.aiJobsList.querySelectorAll('.ai-job-clear').forEach(btn => {
      btn.addEventListener('click', () => {
        svc.router.clearAssignment(btn.dataset.job);
        renderJobs();
      });
    });
  }

  // ------------------------------------------------------------------
  // Catalog panel
  // ------------------------------------------------------------------

  function renderCatalog() {
    const svc = ai();
    if (!svc || !dom.aiCatalogList) return;
    const search = dom.aiCatalogSearch?.value || '';
    const providerFilter = dom.aiCatalogProviderFilter?.value || '';
    const caps = {
      vision: dom.aiFilterVision?.checked || false,
      structuredOutput: dom.aiFilterStructured?.checked || false,
      imageGen: dom.aiFilterImageGen?.checked || false
    };
    const models = svc.modelCatalog.queryModels({
      search,
      providerId: providerFilter || undefined,
      capabilities: caps
    });
    if (dom.aiCatalogCountBadge) dom.aiCatalogCountBadge.textContent = `${models.length} MODELS`;

    if (models.length === 0) {
      dom.aiCatalogList.innerHTML = '<div style="font-size: 0.75rem; color: var(--text-muted); font-style: italic;">No models match — run a provider\'s Models refresh or add a custom model below.</div>';
      return;
    }

    dom.aiCatalogList.innerHTML = models.map(m => {
      const capChips = [
        m.capabilities.vision ? 'Vision' : null,
        m.capabilities.reasoning ? 'Reasoning' : null,
        m.capabilities.structuredOutput ? 'Structured' : null,
        m.capabilities.toolCalling ? 'Tools' : null,
        m.capabilities.imageGen ? 'ImageGen (Coming Soon / Not Currently Available)' : null
      ].filter(Boolean).map(c => `<span style="border: 1px solid var(--border-color-light); border-radius: 3px; padding: 0 0.3rem; font-size: 0.62rem; margin-right: 0.25rem;">${escape(c)}</span>`).join('');
      const ctx = m.capabilities.contextLimit ? `${(m.capabilities.contextLimit / 1000).toFixed(0)}k ctx` : 'ctx ?';
      const statusColor = m.status === 'READY' ? 'var(--color-success)' : m.status === 'RETIRED' || m.status === 'UNAVAILABLE' ? 'var(--color-error)' : 'var(--text-muted)';
      return `
        <div class="ai-catalog-row" role="listitem" data-provider="${escape(m.providerId)}" data-model="${escape(m.modelId)}" style="border: 1px solid var(--border-color-light); border-radius: 5px; padding: 0.4rem 0.6rem; display: flex; justify-content: space-between; gap: 0.5rem; align-items: center;">
          <div style="font-size: 0.74rem; min-width: 0;">
            <strong style="color: var(--text-primary);">${escape(m.displayName)}</strong>
            <span style="color: var(--text-muted); font-size: 0.66rem;"> · ${escape(m.providerId)} · ${escape(m.modelId)} · ${escape(ctx)}</span>
            <div style="margin-top: 0.2rem;">${capChips}<span style="color: ${statusColor}; font-size: 0.64rem; font-weight: 700;"> ● ${escape(m.status)}</span>
            ${m.origin === 'manual' ? '<span style="color: var(--text-muted); font-size: 0.62rem;"> · user declared</span>' : ''}</div>
          </div>
          <button type="button" class="result-action-btn ai-catalog-remove" data-provider="${escape(m.providerId)}" data-model="${escape(m.modelId)}" style="padding: 0.2rem 0.5rem; font-size: 0.66rem;" title="Remove this model from the catalog"><span>✕</span></button>
        </div>`;
    }).join('');

    dom.aiCatalogList.querySelectorAll('.ai-catalog-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const res = svc.modelCatalog.removeModel(btn.dataset.provider, btn.dataset.model);
        if (res.ok) {
          showToast('Model removed from catalog');
          renderCatalog();
          renderJobs();
        }
      });
    });
  }

  function populateProviderFilters() {
    const svc = ai();
    if (!svc) return;
    const options = '<option value="">All providers</option>' +
      svc.providerManager.listProviderStatuses().map(p => `<option value="${escape(p.id)}">${escape(p.label)}</option>`).join('');
    if (dom.aiCatalogProviderFilter && !dom.aiCatalogProviderFilter.options.length) {
      dom.aiCatalogProviderFilter.innerHTML = options;
    }
    if (dom.aiManualProvider && !dom.aiManualProvider.options.length) {
      dom.aiManualProvider.innerHTML = svc.providerManager.listProviderStatuses()
        .map(p => `<option value="${escape(p.id)}">${escape(p.label)}</option>`).join('');
    }
  }

  function addManualModel() {
    const svc = ai();
    if (!svc) return;
    const pid = dom.aiManualProvider?.value;
    const modelId = dom.aiManualModelId?.value?.trim();
    const displayName = dom.aiManualModelName?.value?.trim();
    if (!pid || !modelId) {
      showError('Choose a provider and enter the exact model ID.');
      return;
    }
    const capabilities = {
      text: dom.aiManualCapText?.checked ?? true,
      reasoning: !!dom.aiManualCapReasoning?.checked,
      structuredOutput: !!dom.aiManualCapStructured?.checked,
      toolCalling: !!dom.aiManualCapStructured?.checked,
      vision: !!dom.aiManualCapVision?.checked,
      imageGen: !!dom.aiManualCapImagegen?.checked
    };
    const res = svc.modelCatalog.addManualModel(pid, { modelId, displayName, capabilities });
    if (res.ok) {
      clearError();
      showToast(`Model "${modelId}" added (user declared)`);
      if (dom.aiManualModelId) dom.aiManualModelId.value = '';
      if (dom.aiManualModelName) dom.aiManualModelName.value = '';
      renderCatalog();
      renderJobs();
      AudioService.playSuccess();
    } else {
      showError(res.error);
    }
  }

  // ------------------------------------------------------------------
  // Activity panel
  // ------------------------------------------------------------------

  function renderActivity() {
    const svc = ai();
    if (!svc || !dom.aiActivityList) return;
    const log = svc.router.getActivityLog();
    if (log.length === 0) {
      dom.aiActivityList.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">No AI activity yet.</div>';
      return;
    }
    dom.aiActivityList.innerHTML = log.slice(0, 20).map(e => {
      const color = e.outcome === 'SUCCESS' ? 'var(--color-success)' : 'var(--color-error)';
      const tokens = (e.inputTokens != null || e.outputTokens != null)
        ? ` · ${e.inputTokens ?? '?'}→${e.outputTokens ?? '?'} tok` : '';
      return `<div style="display: flex; justify-content: space-between; gap: 0.5rem;">
        <span style="color: var(--text-muted);">${escape(new Date(e.at).toLocaleTimeString())} · ${escape(e.jobId || '—')} · ${escape(e.providerId || '—')}${tokens}</span>
        <span style="color: ${color}; font-weight: 700;">${escape(e.outcome === 'SUCCESS' ? '✓' : `✕ ${e.errorCode || 'ERROR'}`)}</span>
      </div>`;
    }).join('');
  }

  // ------------------------------------------------------------------
  // View contract
  // ------------------------------------------------------------------

  function renderAll() {
    populateProviderFilters();
    renderProviders();
    renderJobs();
    renderCatalog();
    renderActivity();
    clearError();
  }

  return {
    id: 'ai_settings',
    mount() {
      renderAll();
    },
    onModeEnter() {
      renderAll();
    },
    getController() {
      return { renderAll, renderJobs, renderCatalog, renderActivity, addManualModel, testProvider, discoverModels };
    }
  };
}
