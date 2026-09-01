/**
 * ArchiScale - History & Export Manager
 */

const STORAGE_KEY = 'archiscale_calculation_history';
const MAX_HISTORY_ITEMS = 50;

let historyList = [];

// Initialize history from localStorage
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    historyList = JSON.parse(saved);
  }
} catch (e) {
  historyList = [];
}

export function getHistory() {
  return [...historyList];
}

export function addHistoryEntry(entry) {
  const item = {
    id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: new Date().toLocaleDateString(),
    ...entry
  };

  // Avoid consecutive duplicates
  if (historyList.length > 0) {
    const last = historyList[0];
    if (last.mode === item.mode && last.inputStr === item.inputStr && last.outputStr === item.outputStr && last.scaleStr === item.scaleStr) {
      return;
    }
  }

  historyList.unshift(item);
  if (historyList.length > MAX_HISTORY_ITEMS) {
    historyList.pop();
  }

  saveHistory();
  return item;
}

export function removeHistoryEntry(id) {
  historyList = historyList.filter(item => item.id !== id);
  saveHistory();
}

export function clearHistory() {
  historyList = [];
  saveHistory();
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyList));
  } catch (e) {}
}

export function exportHistoryCSV() {
  if (historyList.length === 0) return null;

  const headers = ['Timestamp', 'Date', 'Mode', 'Scale', 'Input', 'Result', 'Notes'];
  const rows = historyList.map(h => [
    `"${h.timestamp}"`,
    `"${h.date}"`,
    `"${h.mode || 'Scale'}"`,
    `"${h.scaleStr || ''}"`,
    `"${h.inputStr || ''}"`,
    `"${h.outputStr || ''}"`,
    `"${h.notes || ''}"`
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function exportHistoryMarkdown() {
  if (historyList.length === 0) return null;

  let md = '# ArchiScale - Architectural Scaling Log\n\n';
  md += `*Generated on ${new Date().toLocaleString()}*\n\n`;
  md += '| Time | Mode | Scale | Input | Result |\n';
  md += '| :--- | :--- | :--- | :--- | :--- |\n';

  historyList.forEach(h => {
    md += `| ${h.timestamp} | ${h.mode || 'Scale'} | ${h.scaleStr || '-'} | ${h.inputStr || '-'} | **${h.outputStr || '-'}** |\n`;
  });

  return md;
}
