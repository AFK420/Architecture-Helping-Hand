# -*- coding: utf-8 -*-
"""Baseline visual QA probe for Architecture Helping Hand.

Loads the app in headless Chromium at multiple viewports, captures per-screen
console errors, page-level horizontal overflow, off-screen/clipped controls,
and screenshots for major screens.
"""
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3578/index.html"
SHOTS = Path("qa-shots")
SHOTS.mkdir(exist_ok=True)

VIEWPORTS = [(390, 844), (768, 1024), (1024, 768), (1280, 800), (1440, 900), (1920, 1080)]
MODES = [
    "converter", "rescale", "detector", "area_volume", "furniture", "reference",
    "workspace", "expression", "multiscale", "chains", "cad_clipboard", "batch_cad",
    "cad_handoff", "stairs", "ramps", "slopes", "export", "projects", "plan",
    "survey", "imports", "ai", "ai_settings",
]

FIND_OVERFLOW_JS = """
() => {
  const doc = document.documentElement;
  const overflowX = doc.scrollWidth - doc.clientWidth;
  const offenders = [];
  const vw = doc.clientWidth;
  for (const el of document.querySelectorAll('body *')) {
    if (!el.offsetParent && el.tagName !== 'BODY') continue; // skip hidden
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 2 || r.left < -2) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && r.left >= -2 && r.right <= vw + 400) continue;
      offenders.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        cls: (typeof el.className === 'string' ? el.className : '').slice(0, 60) || null,
        left: Math.round(r.left), right: Math.round(r.right), vw
      });
      if (offenders.length >= 8) break;
    }
  }
  return { overflowX, offenders, scrollW: doc.scrollWidth, clientW: doc.clientWidth };
}
"""


def main():
    report = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for (w, h) in VIEWPORTS:
            page = browser.new_page(viewport={"width": w, "height": h})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(BASE)
            page.wait_for_timeout(1200)
            vp = {}
            for mode in MODES:
                try:
                    page.evaluate(f"() => {{ if (window.__ahhSwitchMode) window.__ahhSwitchMode('{mode}'); }}")
                    page.wait_for_timeout(80)
                except Exception as e:
                    vp[mode] = {"error": f"switch failed: {e}"}
                    continue
                res = page.evaluate(FIND_OVERFLOW_JS)
                key = f"{mode}"
                entry = {"overflowX": res["overflowX"], "offenders": res["offenders"]}
                if errors:
                    entry["consoleErrors"] = errors[:5]
                vp[key] = entry
            shot_path = SHOTS / f"converter-{w}x{h}.png"
            try:
                page.evaluate("() => window.__ahhSwitchMode && window.__ahhSwitchMode('converter')")
                page.wait_for_timeout(200)
                page.screenshot(path=str(shot_path), full_page=(w <= 768))
            except Exception:
                pass
            report[f"{w}x{h}"] = {"errors": errors[:8], "modes": vp}
            page.close()
        browser.close()
    out = Path("qa-baseline.json")
    out.write_text(json.dumps(report, indent=1), encoding="utf-8")

    # Summary printout
    for vpname, data in report.items():
        bad = []
        for mode, m in data["modes"].items():
            ox = m.get("overflowX", 0)
            if ox > 2:
                bad.append(f"{mode}(+{ox}px)")
        errs = data["errors"]
        print(f"{vpname}: overflow={';'.join(bad) if bad else 'NONE'} | consoleErrors={len(errs)}")
        for e in errs[:3]:
            print(f"    ERR: {e[:160]}")
    print(f"written {out}")


if __name__ == "__main__":
    main()
