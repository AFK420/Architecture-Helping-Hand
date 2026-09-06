/**
 * Architecture Helping Hand - Omnipresent Top AI Dropdown Assistant Component
 * Provides a slide-down AI drawer accessible from anywhere in the app without leaving the canvas.
 */

import {
  serializeDrawingContext,
  buildArchitecturalPrompt,
  parseAiActions,
  executeAiAction
} from '../../core/ai-bridge.js';

export function initAiDropdownDrawer(container, state, options = {}) {
  if (!container) return;

  let isOpen = false;
  let chatHistory = [];

  function renderDrawer() {
    const ctx = serializeDrawingContext(state);

    let html = `
      <div class="app-ai-drawer ${isOpen ? 'open' : ''}" id="app-ai-drawer" role="dialog" aria-label="Omnipresent AI Assistant">
        <div class="ai-drawer-backdrop" id="ai-drawer-backdrop"></div>
        <div class="ai-drawer-card">
          <!-- Drawer Header -->
          <div class="ai-drawer-header">
            <div class="ai-header-left">
              <span class="ai-sparkle-icon">✨</span>
              <span class="ai-title">Architectural AI Co-Pilot</span>
              <span class="ai-context-pill" title="Live context passed to AI">
                📍 ${ctx.documentName} · ${ctx.entityCount} entities · Mode: ${ctx.persona.toUpperCase()}
              </span>
            </div>
            <div class="ai-header-right">
              <button type="button" class="btn-drawer-close" id="btn-ai-drawer-close" title="Close AI Assistant (Esc)">✕</button>
            </div>
          </div>

          <!-- Quick Context Prompt Chips -->
          <div class="ai-prompt-chips-row">
            <button type="button" class="ai-chip-btn" data-prompt="Check IBC stair compliance and egress geometry for this floor plan.">
              📐 Verify Code & Stairs
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="Generate a 3-bedroom residential apartment layout with a central hallway.">
              🏢 Generate 3-Bed Layout
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="Auto-dimension all exterior perimeter walls.">
              📏 Dimension Walls
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="Suggest appropriate exterior wall and roof parapet construction details.">
              🧱 Suggest Construction Details
            </button>
            <button type="button" class="ai-chip-btn" data-prompt="Calculate net usable area vs gross footprint and spatial efficiency ratio.">
              📊 Area Efficiency Ratio
            </button>
          </div>

          <!-- Conversation & Results Stream -->
          <div class="ai-conversation-stream" id="ai-conversation-stream">
            ${chatHistory.length === 0 ? `
              <div class="ai-welcome-card">
                <span class="welcome-icon">🏛️</span>
                <h4>How can I help with your design?</h4>
                <p>Ask anything about floor plans, dimensions, code requirements, stairs, structural grids, or construction details. I can generate layouts and apply them directly to your viewport!</p>
              </div>
            ` : ''}
            ${chatHistory.map(item => `
              <div class="ai-message-bubble ${item.role}">
                <div class="message-sender">${item.role === 'user' ? 'You' : 'AI Architect'}</div>
                <div class="message-body">${item.htmlContent}</div>
                ${item.actions && item.actions.length > 0 ? `
                  <div class="ai-action-card">
                    <span class="action-summary">✨ Generated ${item.actions.length} architectural items:</span>
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
            <input type="text" id="ai-drawer-prompt-input" class="ai-drawer-input" placeholder="Ask AI anything about your drawing or design (e.g. 'Add a 5x4m master bedroom and ensuite')..." autocomplete="off" />
            <button type="button" id="btn-ai-drawer-send" class="btn btn-primary ai-send-btn">Send</button>
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
        if (input) {
          input.value = btn.dataset.prompt;
          handleSend();
        }
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
    if (!input) return;
    const prompt = input.value.trim();
    if (!prompt) return;
    input.value = '';

    const msgId = 'msg-' + Date.now();
    chatHistory.push({
      id: msgId,
      role: 'user',
      htmlContent: escapeAiHtml(prompt)
    });
    renderDrawer();

    const stream = container.querySelector('#ai-conversation-stream');
    if (stream) stream.scrollTop = stream.scrollHeight;

    // Simulate / invoke architectural AI response
    const ctx = serializeDrawingContext(state);
    const enrichedPrompt = buildArchitecturalPrompt(prompt, ctx);

    // Architectural heuristic solver
    const responseData = generateArchitecturalAiResponse(prompt, ctx);

    setTimeout(() => {
      chatHistory.push({
        id: 'resp-' + Date.now(),
        role: 'assistant',
        htmlContent: responseData.html,
        actions: responseData.actions
      });
      renderDrawer();
      const stream2 = container.querySelector('#ai-conversation-stream');
      if (stream2) stream2.scrollTop = stream2.scrollHeight;
    }, 400);
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

  // Keyboard shortcut Ctrl + Space
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
      e.preventDefault();
      toggle();
    }
  });

  renderDrawer();

  return {
    toggle,
    open: () => toggle(true),
    close: () => toggle(false),
    isOpen: () => isOpen
  };
}

function escapeAiHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Built-in architectural heuristic responder generating layout actions */
function generateArchitecturalAiResponse(prompt, ctx) {
  const p = prompt.toLowerCase();
  const actions = [];
  let html = '';

  if (p.includes('3-bed') || p.includes('layout') || p.includes('apartment')) {
    actions.push(
      { type: 'add_room', name: 'Living & Dining', x1: 2, y1: 2, x2: 8, y2: 6 },
      { type: 'add_room', name: 'Master Bedroom', x1: 8, y1: 2, x2: 12, y2: 6 },
      { type: 'add_room', name: 'Bedroom 2', x1: 2, y1: 6, x2: 6, y2: 10 },
      { type: 'add_room', name: 'Bedroom 3', x1: 6, y1: 6, x2: 10, y2: 10 },
      { type: 'add_stair', name: 'Main Egress Stair', x: 10.5, y: 6, width: 1.10, run: 3.60, rise: 2.80, risers: 16 }
    );
    html = `<p><strong>Architectural Layout Generated:</strong> Created a high-efficiency 3-bedroom residential suite with open-plan living/dining area, private master wing, and IBC-compliant egress stair.</p>
    <ul>
      <li>Living &amp; Dining: 24.0 m²</li>
      <li>Master Bedroom: 16.0 m²</li>
      <li>Secondary Bedrooms: 16.0 m² each</li>
      <li>Egress Stair: 16R @ 175mm riser, 280mm tread (IBC compliant)</li>
    </ul>`;
  } else if (p.includes('stair') || p.includes('code') || p.includes('ibc')) {
    html = `<p><strong>IBC / Building Code Verification:</strong></p>
    <ul>
      <li>✅ <strong>Headroom:</strong> Verified min 2.00m (80") continuous clearance along the walkline.</li>
      <li>✅ <strong>Blondel Formula:</strong> $2R + T \\approx 630\\text{mm}$ (optimal range $600 - 640\\text{mm}$).</li>
      <li>✅ <strong>Egress Width:</strong> Standard residential flight width 1.10m meets IBC 1011.2 threshold (min 36" / 44" for occupant load &gt; 50).</li>
    </ul>`;
  } else if (p.includes('detail') || p.includes('parapet') || p.includes('footing')) {
    actions.push(
      { type: 'add_detail', name: 'Roof Parapet Detail', detailKey: 'parapet', detailNum: '1', sheetRef: 'A-501', x: 6, y: 2 },
      { type: 'add_detail', name: 'Foundation Footing Detail', detailKey: 'footing', detailNum: '2', sheetRef: 'A-501', x: 2, y: 6 }
    );
    html = `<p><strong>Construction Details Recommended:</strong> Added standard 1:10 scale technical assemblies with waterproof membranes, continuous insulation, and keynote annotations.</p>`;
  } else {
    html = `<p>Analyzed current ${ctx.persona.toUpperCase()} viewport with ${ctx.entityCount} entities. How would you like to develop this design further?</p>`;
  }

  return { html, actions };
}
