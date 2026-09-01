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
        // Validate items
        return parsed.filter(item => item && typeof item === 'object' && item.id);
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

    const item = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toLocaleDateString(),
      ...entry
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
    const headers = ['Timestamp', 'Date', 'Mode', 'Scale', 'Input', 'Result', 'Notes'];
    const rows = historyList.map(h => [
      `"${h.timestamp || ''}"`,
      `"${h.date || ''}"`,
      `"${h.mode || 'Scale'}"`,
      `"${h.scaleStr || ''}"`,
      `"${h.inputStr || ''}"`,
      `"${h.outputStr || ''}"`,
      `"${h.notes || ''}"`
    ]);
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  exportMarkdown() {
    if (historyList.length === 0) return null;
    let md = '# Architecture Helping Hand - Architectural Scaling Log\n\n';
    md += `*Generated on ${new Date().toLocaleString()}*\n\n`;
    md += '| Time | Mode | Scale | Input | Result |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    historyList.forEach(h => {
      md += `| ${h.timestamp || ''} | ${h.mode || 'Scale'} | ${h.scaleStr || '-'} | ${h.inputStr || '-'} | **${h.outputStr || '-'}** |\n`;
    });
    return md;
  }
};
