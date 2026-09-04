/**
 * Architecture Helping Hand - Responsive Layout & Ergonomics Test Suite
 * Validates desktop, tablet, and mobile (360px - 1440px) responsive rules.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message, received) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} (Received: ${JSON.stringify(received)})`);
    failed++;
  }
}

console.log('🧪 Running tests/responsive.test.js...');

const cssPath = path.join(__dirname, '../css/main.css');
const css = fs.readFileSync(cssPath, 'utf8');

// 1. Breakpoint Coverage
{
  assert(css.includes('@media (min-width: 1281px)'), 'Desktop workstation breakpoint (min-width: 1281px) defined');
  assert(css.includes('@media (max-width: 1280px)'), 'Standard desktop/laptop breakpoint (max-width: 1280px) defined');
  assert(css.includes('@media (max-width: 1024px)'), 'Tablet breakpoint (max-width: 1024px) defined');
  assert(css.includes('@media (max-width: 768px)'), 'Mobile & mini tablet breakpoint (max-width: 768px) defined');
  assert(css.includes('@media (max-width: 380px)'), 'Ultra-compact mobile 360px breakpoint (max-width: 380px) defined');
  assert(css.includes('@media print'), 'Print-specific stylesheet (@media print) defined');
}

// 2. Viewport Overflow Protection
{
  assert(css.includes('overflow-x: clip') || css.includes('overflow-x: hidden'), 'Global overflow-x protection enabled (page never scrolls horizontally)');
  assert(css.includes('max-width: 100vw'), 'Main wrapper bounded to viewport width on small screens');
  assert(css.includes('.table-scroll-container') || css.includes('.workspace-table-container'), 'Data tables wrapped in scroll containers');
  assert(css.includes('.col-paper') && css.includes('position: sticky'), 'First column of reference table is sticky on mobile');
}

// 2b. Application Shell Responsive Behavior (sidebar / top bar)
{
  assert(css.includes('.app-sidebar'), 'Sidebar shell styles defined');
  assert(css.includes('.app-topbar'), 'Top bar shell styles defined');
  assert(css.includes('.tool-surface'), 'Tool surface container defined');
  assert(css.includes('body.sidebar-open .app-sidebar'), 'Mobile drawer opens via body.sidebar-open');
  assert(css.includes('body.sidebar-hidden .app-sidebar'), 'Desktop sidebar can be toggled hidden');
  // Every grid template in the sheet must be minmax-safe or explicitly single-column
  const gridTemplates = [...css.matchAll(/grid-template-columns:\s*([^;]+);/g)].map(m => m[1].trim());
  const unsafe = gridTemplates.filter(t =>
    /^1fr/.test(t) || /(^|\s)1fr(\s|$)/.test(t) && !t.includes('minmax(') && !t.includes('repeat(') && !t.includes('auto')
  );
  assert(unsafe.length === 0, 'No bare 1fr grid templates that ignore min-content (QA regression pin)', unsafe.slice(0, 4));
}

// 3. Touch Ergonomics & Form Controls
{
  assert(css.includes('font-size: 16px !important'), 'Form inputs set to 16px on mobile to prevent iOS Safari auto-zoom');
  assert(css.includes('min-height: 42px'), 'Interactive inputs and controls have minimum 42px touch target');
  assert(css.includes('min-height: 46px'), 'Primary calculation buttons have minimum 46px touch target');
  assert(css.includes('.swap-btn') && css.includes('min-height: 42px'), 'Direction swap button has touch-accessible dimensions');
}

// 4. Horizontal Touch Scroll Affordances
{
  assert(css.includes('.sidebar-nav') && css.includes('-webkit-overflow-scrolling: touch'), 'Sidebar tool navigation supports momentum touch scrolling');
  assert(css.includes('.preset-category-pills') && css.includes('-webkit-overflow-scrolling: touch'), 'Preset category pills support momentum touch scrolling');
  assert(css.includes('.furn-cat-pills-row') && css.includes('-webkit-overflow-scrolling: touch'), 'Furniture category pills support momentum touch scrolling');
  assert(css.includes('.ref-quick-chips') && css.includes('-webkit-overflow-scrolling: touch'), 'Reference scale chips support momentum touch scrolling');
}

// 5. Responsive Multi-Column Layout Flow
{
  assert(css.includes('grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr)'), 'Desktop utilizes multi-column calculation instrument workspace');
  assert(css.includes('repeat(3, 1fr)'), 'Desktop furniture catalog utilizes 3-column space-planning grid');
  assert(css.includes('pipeline-flow-banner') && css.includes('flex-direction: column'), 'Calculation pipeline stacks gracefully into vertical flow on mobile');
}

// 6. Number Display Clamping & No-Clipping
{
  assert(css.includes('clamp('), 'Result hero values use responsive fluid typography clamp()');
  assert(css.includes('overflow-wrap: anywhere') || css.includes('word-break: break-all'), 'Numeric displays prevent container overflow on large numbers');
}

console.log(`Summary: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) process.exit(1);
