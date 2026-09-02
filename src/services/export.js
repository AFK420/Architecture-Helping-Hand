/**
 * Architecture Helping Hand - Export Services
 * Phase: Universal Export Center — side-effect layer.
 *
 * Download, clipboard, and print behavior. All pure serialization lives in
 * core/export/export-model.js; nothing here computes content.
 */

import { EXPORT_CONTENT_TYPES } from '../core/export/export-model.js';

/**
 * Triggers a browser download of text content. Returns a promise-like
 * result the caller can toast about. Safe for file:// (uses Blob + anchor).
 */
export function downloadExport(content, fileName, format) {
  const contentType = EXPORT_CONTENT_TYPES[format] || 'text/plain';
  try {
    const blob = new Blob([content], { type: `${contentType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (e) {
    return false;
  }
}

/** Copies export content through the app's existing clipboard helper. */
export function copyExport(text, copyFn, label) {
  if (typeof copyFn !== 'function') return false;
  copyFn(text, label || 'Export copied');
  return true;
}

/**
 * Opens a print-focused window with the export content and calls print().
 * PDF export strategy: browser print-to-PDF via a print stylesheet — no
 * heavy PDF runtime dependency.
 */
export function printExport(title, content) {
  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) return false;
  const safeTitle = String(title || 'Export').replace(/</g, '&lt;');
  const safeBody = String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>${safeTitle}</title>
  <style>
    body { font-family: 'JetBrains Mono', Consolas, monospace; font-size: 11pt; padding: 1.5rem; white-space: pre-wrap; color: #111; background: #fff; }
    h1 { font-size: 13pt; border-bottom: 1px solid #333; padding-bottom: 0.4rem; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body><h1>${safeTitle}</h1>${safeBody}</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => { try { win.print(); } catch (e) {} }, 250);
  return true;
}
