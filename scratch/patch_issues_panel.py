p = r'E:\Scaler\src\ui\views\plan.js'
src = open(p, encoding='utf-8').read()

src = src.replace(
"import { attachIdentity, createModelEventBus, deriveFacts } from '../../core/project-schema.js';",
"""import { attachIdentity, createModelEventBus, deriveFacts } from '../../core/project-schema.js';
import { runAllChecks } from '../../core/issue-engine.js';""", 1)

marker = "  function selectedEntities() {\n    return entities().filter(e => state.plan.selectedIds.has(e.id));\n  }\n"
panel = marker + """
  let lastIssuesReport = null;

  /**
   * Runs the deterministic issue engine over the document and renders an
   * interactive panel: click an issue -> selects its entities and shows
   * evidence + recommendation via toast.
   */
  function runIssues() {
    const report = runAllChecks(entities(), { roomMinArea: 7.5 });
    const sevRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const issues = [...report.issues].sort((a, b) =>
      (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9));
    lastIssuesReport = { issues, ranAt: report.ranAt };

    const host = dom.planPropContent;
    if (!host) return { issues };
    if (issues.length === 0) {
      host.innerHTML = '<div class="issues-panel">' +
        '<div class="plan-prop-title">ISSUES &mdash; none found</div>' +
        '<div class="issues-empty">The deterministic audit found no issues in ' +
        entities().length + ' entities. Rules run: ' + report.rulesRun + '.</div></div>';
      return { issues };
    }
    const sevClass = s => ({ critical: 'sug-critical', high: 'sug-high', medium: 'sug-med', low: 'sug-low', info: 'sug-info' }[s] || 'sug-info');
    const rows = issues.map((iss, i) =>
      '<div class="suggestion-row ' + sevClass(iss.severity) + ' issue-row" data-index="' + i + '">' +
      '<div class="suggestion-sev">' + escapeHtml(iss.status) + '<br>' + escapeHtml(iss.severity.toUpperCase()) + '</div>' +
      '<div class="suggestion-body">' +
      '<div class="suggestion-problem">' + escapeHtml(iss.message) + '</div>' +
      '<div class="suggestion-evidence">rule: ' + escapeHtml(iss.rule) + ' &middot; entities: ' + iss.entityIds.length + '</div>' +
      '<div class="suggestion-rec">' + escapeHtml(iss.recommendation) + '</div>' +
      '</div></div>').join('');
    host.innerHTML = '<div class="issues-panel">' +
      '<div class="plan-prop-title">ISSUES &mdash; ' + issues.length + ' found</div>' +
      '<div class="issues-summary">' + report.failed + ' FAIL &middot; ' + report.warning +
      ' WARNING &middot; rules run: ' + report.rulesRun + '</div>' + rows + '</div>';
    host.querySelectorAll('.issue-row').forEach(row => {
      row.addEventListener('click', () => {
        const iss = issues[Number(row.dataset.index)];
        if (!iss) return;
        if (iss.entityIds.length > 0) {
          state.plan.selectedIds = new Set(iss.entityIds.filter(id => entities().some(e => e.id === id)));
          render();
        }
        showToast(iss.message + ' — ' + iss.recommendation, 'info', 5000);
      });
    });
    return { issues };
  }
"""
assert marker in src
src = src.replace(marker, panel, 1)
open(p, 'w', encoding='utf-8', newline='\n').write(src)
print('panel inserted')
