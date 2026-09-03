/**
 * Architecture Helping Hand - History & Logging Service
 */

import { StorageService } from './storage.js';

export const HISTORY_STORAGE_KEY = 'archiscale_calculation_history';
let historyList = [];

function loadHistoryFromStorage() {
  try {
    const saved = StorageService.getItem(HISTORY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // Validate items: require a well-formed service-generated id (defense
        // against poisoned/persisted payloads — ids flow into DOM attributes
        // and querySelector lookups in the journal view).
        const idOk = id => typeof id === 'string' && /^hist_\d+_[a-z0-9]+$/.test(id);
        return parsed.filter(item => item && typeof item === 'object' && idOk(item.id))
          // Also strip any spread-in fields the service computes itself, so a
          // persisted entry cannot override id/timestamp through addEntry.
          .map(item => ({
            ...item,
            id: item.id,
            timestamp: typeof item.timestamp === 'string' ? item.timestamp.slice(0, 40) : '',
            date: typeof item.date === 'string' ? item.date.slice(0, 40) : ''
          }));
      }
    }
  } catch (e) {
    // Corrupted data handling
  }
  return [];
}

historyList = loadHistoryFromStorage();

export const HistoryService = {
  getHistory() {
    return [...historyList];
  },

  reload() {
    historyList = loadHistoryFromStorage();
    return [...historyList];
  },

  addEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      throw new Error('History entry must be a valid object');
    }

    // Service-owned identity fields are computed here and MUST NOT be
    // overridable through the spread — the caller's entry comes last in
    // the object literal below only for optional free-form fields, so the
    // protected fields are re-asserted after the spread.
    const item = {
      stateSnapshot: null,
      ...entry,
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      operation: entry.operation || entry.mode || 'Scale Converter',
      mode: entry.mode || entry.operation || 'Scale Converter',
      scaleStr: entry.scaleStr || (entry.scaleRatio ? `1:${entry.scaleRatio}` : '-'),
      inputStr: entry.inputStr || '',
      outputStr: entry.outputStr || ''
    };

    historyList.unshift(item);
    if (historyList.length > 100) {
      historyList.pop();
    }
    this.save();
    return item;
  },

  removeEntry(id) {
    historyList = historyList.filter(item => item.id !== id);
    this.save();
  },

  clear() {
    historyList = [];
    this.save();
  },

  save() {
    try {
      StorageService.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyList));
    } catch (e) {}
  },

  exportCSV() {
    if (historyList.length === 0) return null;
    const headers = ['Timestamp', 'Date', 'Operation', 'Scale', 'Input', 'Result', 'Notes'];
    const rows = historyList.map(h => [
      `"${h.timestamp || ''}"`,
      `"${h.date || ''}"`,
      `"${h.operation || h.mode || 'Scale'}"`,
      `"${h.scaleStr || ''}"`,
      `"${h.inputStr || ''}"`,
      `"${h.outputStr || ''}"`,
      `"${h.notes || ''}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  exportMarkdown() {
    if (historyList.length === 0) return null;
    let md = '# Architecture Helping Hand - Architectural Calculation Journal\n\n';
    md += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    md += '| Time | Operation | Scale | Input | Result |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    historyList.forEach(h => {
      md += `| ${h.timestamp || ''} | ${h.operation || h.mode || 'Scale'} | ${h.scaleStr || '-'} | ${h.inputStr || '-'} | **${h.outputStr || '-'}** |\n`;
    });
    return md;
  }
};
