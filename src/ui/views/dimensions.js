/** One dimension workspace; the four existing controllers keep their engines. */
export function createDimensionsView(context) {
  const { state, views } = context;
  function selectWorkflow(id = state.dimensionWorkflow || 'expression') {
    if (!['expression', 'workspace', 'chains', 'multiscale'].includes(id)) id = 'expression';
    state.dimensionWorkflow = id;
    const host = document.getElementById('mode-view-dimensions');
    if (!host) return;
    host.querySelectorAll('[data-dimension-workflow]').forEach(btn => {
      const active = btn.dataset.dimensionWorkflow === id;
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });
    host.querySelectorAll('.dimension-panel').forEach(panel => {
      panel.hidden = panel.id !== `dimension-panel-${id}`;
    });
    if (id === 'workspace') views.callController('workspace', 'renderWorkspace');
    if (id === 'expression') views.callController('expression', 'calculateExpression');
    if (id === 'chains') views.callController('chains', 'calculateAndRenderChain');
    if (id === 'multiscale') views.callController('multiscale', 'calculateMultiScale');
  }
  return {
    id: 'dimensions',
    mount() {
      const buttons = Array.from(document.querySelectorAll('[data-dimension-workflow]'));
      buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => selectWorkflow(btn.dataset.dimensionWorkflow));
        btn.addEventListener('keydown', e => {
          let next = index;
          if (e.key === 'ArrowRight') next = (index + 1) % buttons.length;
          else if (e.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = buttons.length - 1;
          else return;
          e.preventDefault();
          selectWorkflow(buttons[next].dataset.dimensionWorkflow);
          buttons[next].focus();
        });
      });
    },
    onModeEnter() { selectWorkflow(); },
    getController() { return { selectWorkflow }; }
  };
}
