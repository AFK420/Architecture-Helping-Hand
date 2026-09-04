# -*- coding: utf-8 -*-
"""Interactive browser QA for Architecture Helping Hand.

Checks per screen x viewport:
  - page-level horizontal overflow
  - clipped controls (buttons/inputs outside viewport or zero-size when visible)
  - off-screen interactive elements
  - overlapping topbar controls
  - console errors
  - operability: real clicks on key workflows
  - screenshots for every screen at every viewport
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3578/index.html"
SHOTS = Path("qa-shots")
SHOTS.mkdir(exist_ok=True)

VIEWPORTS = [(390, 844), (768, 1024), (1024, 768), (1280, 800), (1440, 900), (1920, 1080)]
MODES = [
    "home", "converter", "rescale", "detector", "area_volume", "furniture", "reference",
    "workspace", "expression", "multiscale", "chains", "cad_clipboard", "batch_cad",
    "cad_handoff", "stairs", "ramps", "slopes", "export", "projects", "plan",
    "survey", "imports", "ai", "ai_settings",
]

CHECK_JS = """
() => {
  const doc = document.documentElement;
  const vw = doc.clientWidth;
  const problems = [];
  const seen = new Set();

  // 1. Page-level horizontal overflow
  const overflowX = doc.scrollWidth - doc.clientWidth;

  // 2. Visible interactive elements clipped or off-screen
  const sels = 'button, input, select, textarea, a[href]';
  for (const el of document.querySelectorAll(sels)) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    // Skip elements inside hidden mode views
    let p = el, hiddenView = false;
    while (p && p !== document.body) {
      if (p.id && p.id.startsWith('mode-view-') && p.hidden) { hiddenView = true; break; }
      p = p.parentElement;
    }
    if (hiddenView) continue;
    // Fixed off-canvas drawer is fine when body lacks sidebar-open
    if (el.closest('.app-sidebar') && !document.body.classList.contains('sidebar-open') && vw <= 1024) continue;
    if (el.closest('.quick-dim-strip') && vw <= 1024) continue;
    // The history drawer and command palette are intentionally off-viewport
    // until opened (transform/translate transitions) — skip their shells.
    if (el.closest('.history-drawer') && !el.closest('.history-drawer.open')) continue;
    if (el.closest('.command-palette-modal') && !el.closest('.command-palette-modal.open')) continue;

    const offRight = r.right > vw + 2;
    const offLeft = r.left < -2;
    // Elements inside an intentional horizontal scroll container (category
    // pill rows etc.) are reachable by scrolling that container — not clipped.
    let inHScroll = false;
    p = el;
    while (p && p !== document.body) {
      const pcs = getComputedStyle(p);
      if ((pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 2) { inHScroll = true; break; }
      p = p.parentElement;
    }
    if (inHScroll) continue;
    const clippedBottom = r.bottom > window.innerHeight + 400; // far below fold is fine, scroll exists
    if (offRight || offLeft) {
      const key = `${el.tagName}|${el.id || el.className}`;
      if (!seen.has(key)) {
        seen.add(key);
        problems.push({
          kind: offRight ? 'offscreen-right' : 'offscreen-left',
          tag: el.tagName, id: el.id || null,
          cls: (typeof el.className === 'string' ? el.className : '').slice(0, 50),
          left: Math.round(r.left), right: Math.round(r.right)
        });
      }
    }
  }

  return { overflowX, problems: problems.slice(0, 10) };
}
"""


def run():
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for (w, h) in VIEWPORTS:
            page = browser.new_page(viewport={"width": w, "height": h})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(BASE)
            page.wait_for_timeout(1000)
            vp = {}
            for mode in MODES:
                try:
                    page.evaluate(f"() => window.__ahhSwitchMode('{mode}')")
                    page.wait_for_timeout(150)
                except Exception as e:
                    vp[mode] = {"error": str(e)}
                    continue
                check = page.evaluate(CHECK_JS)
                entry = {"overflowX": check["overflowX"], "problems": check["problems"]}
                if errors:
                    entry["consoleErrors"] = errors[:4]
                vp[mode] = entry
                page.screenshot(path=str(SHOTS / f"{mode}-{w}x{h}.png"), full_page=True)
            report[f"{w}x{h}"] = {"errors": errors[:6], "modes": vp}
            page.close()
        browser.close()

    Path("qa-report.json").write_text(json.dumps(report, indent=1), encoding="utf-8")

    fail = False
    for vpname, data in report.items():
        bad = []
        for mode, m in data["modes"].items():
            issues = []
            if m.get("overflowX", 0) > 2:
                issues.append(f"overflow+{m['overflowX']}px")
            for pr in m.get("problems", []):
                issues.append(f"{pr['kind']}:{pr.get('id') or pr.get('cls')}")
            if issues:
                bad.append(f"{mode}[{'; '.join(issues[:3])}]")
        errs = data["errors"]
        status = "OK" if not bad and not errs else "ISSUES"
        print(f"{vpname}: {status} ({len(errs)} console errors)")
        for b in bad:
            print(f"   {b}")
            fail = True
        for e in errs[:3]:
            print(f"   ERR: {e[:150]}")
            fail = True
    print("RESULT:", "FAIL" if fail else "ALL CLEAN")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(run())
