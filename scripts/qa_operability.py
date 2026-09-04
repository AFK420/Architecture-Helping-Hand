# -*- coding: utf-8 -*-
"""Operability QA: actually click through representative workflows."""
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:3578/index.html"

results = []


def check(name, fn):
    try:
        fn()
        results.append((name, "PASS", ""))
    except Exception as e:
        results.append((name, "FAIL", str(e)[:300]))


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(BASE)
        page.wait_for_timeout(1000)

        # 1. Convert 2400mm at 1:50 via Quick Dimension (global strip)
        def t_quickdim():
            page.click("#quick-dim-toggle-btn")
            page.wait_for_timeout(200)
            page.fill("#quick-dim-input", "2400mm")
            page.click("#btn-run-quick-dim")
            page.wait_for_timeout(300)
            real = page.text_content("#quick-dim-real-val").strip()
            draw = page.text_content("#quick-dim-drawing-val").strip()
            assert "2.4" in real or "2400" in real, f"real: {real}"
            assert draw and draw != "---", f"drawing: {draw}"
            page.click("#quick-dim-close-btn")
        check("Quick Dimension: 2400mm @ 1:50", t_quickdim)

        # 2. Stair calculator: 2.8m rise -> results show sensible numbers
        def t_stairs():
            page.evaluate("() => window.__ahhSwitchMode('stairs')")
            page.wait_for_timeout(300)
            run_val = page.text_content("#stairs-run-val").strip()
            count = page.text_content("#stairs-riser-count-val").strip()
            assert run_val and "0 " not in run_val.replace("0 mm", "X") , f"run: {run_val}"
            assert count.isdigit() and int(count) > 2, f"risers: {count}"
            svg = page.evaluate("() => document.getElementById('stairs-svg-wrap').innerHTML")
            assert "NaN" not in svg, "NaN in stair svg"
        check("Stairs: default 2.8m rise computes", t_stairs)

        # 3. Ramp: 1.2m rise @ 8.33% -> run ~14.4m
        def t_ramps():
            page.evaluate("() => window.__ahhSwitchMode('ramps')")
            page.wait_for_timeout(300)
            page.fill("#ramps-rise", "1.2m")
            page.fill("#ramps-slope", "8.33")
            page.click("#btn-run-ramps")
            page.wait_for_timeout(300)
            run = page.text_content("#ramps-run-val").strip()
            assert "14" in run or "14.4" in run, f"run: {run}"
        check("Ramps: 1.2m rise @ 8.33% -> ~14.4m run", t_ramps)

        # 4. Dimension chain via quick add
        def t_chains():
            page.evaluate("() => window.__ahhSwitchMode('chains')")
            page.wait_for_timeout(300)
            before = page.evaluate("() => document.querySelectorAll('#chains-table-body tr').length")
            page.fill("#chains-quick-input", "1200 + 1800 + 900")
            page.click("#chains-add-btn")
            page.wait_for_timeout(300)
            after = page.evaluate("() => document.querySelectorAll('#chains-table-body tr').length")
            assert after > before, f"segments {before} -> {after}"
            total = page.text_content("#chains-overall-val").strip()
            assert total and total != "---", f"total: {total}"
        check("Dimension Chains: quick add 3 segments", t_chains)

        # 5. Furniture search
        def t_furniture():
            page.evaluate("() => window.__ahhSwitchMode('furniture')")
            page.wait_for_timeout(300)
            page.fill("#furniture-search-input", "sofa")
            page.wait_for_timeout(300)
            count = page.text_content("#furniture-results-count").strip()
            assert "of" in count, f"count text: {count}"
            page.fill("#furniture-search-input", "")
        check("Furniture: search 'sofa' filters", t_furniture)

        # 6. Create a project, check Home reflects it
        def t_project():
            page.evaluate("() => window.__ahhSwitchMode('projects')")
            page.wait_for_timeout(300)
            page.fill("#projects-name-input", "QA Villa Study")
            page.click("#btn-project-save")
            page.wait_for_timeout(300)
            page.evaluate("() => window.__ahhSwitchMode('home')")
            page.wait_for_timeout(300)
            name = page.text_content("#home-project-name").strip()
            assert "QA Villa" in name, f"home shows: {name}"
        check("Projects: create + Home snapshot reflects it", t_project)

        # 7. Plan canvas: add a room via the tool select + draw is pointer-based;
        #    verify the entity list renders and canvas responds to zoom keys
        def t_plan():
            page.evaluate("() => window.__ahhSwitchMode('plan')")
            page.wait_for_timeout(300)
            page.select_option("#plan-tool-select", "room")
            box = page.locator("#plan-svg").bounding_box()
            page.mouse.move(box["x"] + 100, box["y"] + 100)
            page.mouse.down()
            page.mouse.move(box["x"] + 200, box["y"] + 180, steps=5)
            page.mouse.up()
            page.wait_for_timeout(300)
            status = page.text_content("#plan-status-badge").strip()
            assert "1 entities" in status, f"status: {status}"
        check("Plan Canvas: draw a room by drag", t_plan)

        # 8. Import: paste CSV, run, send to plan
        def t_import():
            page.evaluate("() => window.__ahhSwitchMode('imports')")
            page.wait_for_timeout(300)
            page.fill("#imports-text-box", "name,width,depth\nRoom A,4.0,3.0\nRoom B,5.0,2.5")
            page.select_option("#imports-format-select", "csv")
            page.click("#btn-run-imports")
            page.wait_for_timeout(300)
            report = page.text_content("#imports-report-box").strip()
            assert "room" in report.lower() or "2" in report, f"report: {report[:80]}"
        check("Imports: paste CSV and run", t_import)

        # 9. Export center builds a preview
        def t_export():
            page.evaluate("() => window.__ahhSwitchMode('export')")
            page.wait_for_timeout(300)
            preview = page.input_value("#export-preview-box").strip()
            assert preview and preview != "", "empty export preview"
        check("Export Center: builds preview", t_export)

        # 10. AI Control Center renders providers
        def t_ai_settings():
            page.evaluate("() => window.__ahhSwitchMode('ai_settings')")
            page.wait_for_timeout(300)
            providers = page.evaluate("() => document.querySelectorAll('.ai-provider-row').length")
            jobs = page.evaluate("() => document.querySelectorAll('.ai-job-row').length")
            assert providers >= 3, f"providers: {providers}"
            assert jobs >= 10, f"jobs: {jobs}"
        check("AI Control Center: providers + jobs render", t_ai_settings)

        # 11. AI Studio: vision job shows image upload
        def t_ai_studio():
            page.evaluate("() => window.__ahhSwitchMode('ai')")
            page.wait_for_timeout(300)
            page.select_option("#ai-job-select", "imageAnalysis")
            page.wait_for_timeout(200)
            shown = page.evaluate("() => document.getElementById('ai-image-group').style.display === 'block'")
            assert shown, "image group not shown for vision job"
        check("AI Studio: vision job reveals image upload", t_ai_studio)

        # 12. Sidebar search navigation
        def t_sidebar():
            page.fill("#sidebar-search", "ramp")
            page.wait_for_timeout(200)
            items = page.evaluate("() => [...document.querySelectorAll('.sidebar-item')].map(b => b.dataset.mode)")
            assert items == ["ramps"], f"search: {items}"
            page.click(".sidebar-item[data-mode='ramps']")
            page.wait_for_timeout(300)
            visible = page.evaluate("() => !document.getElementById('mode-view-ramps').hidden")
            assert visible, "ramps not visible after sidebar click"
        check("Sidebar: search + navigate", t_sidebar)

        # 13. Command palette (search text is 'Export' per palette engine casing)
        def t_palette():
            page.keyboard.press("Control+k")
            page.wait_for_timeout(250)
            page.keyboard.type("Export Center")
            page.wait_for_timeout(250)
            page.keyboard.press("Enter")
            page.wait_for_timeout(300)
            visible = page.evaluate("() => !document.getElementById('mode-view-export').hidden")
            assert visible, "export not opened via palette"
        check("Command palette: open Export via Ctrl+K", t_palette)

        # 14. History drawer
        def t_history():
            page.click("#history-toggle-btn")
            page.wait_for_timeout(300)
            opened = page.evaluate("() => document.getElementById('history-drawer').classList.contains('open')")
            assert opened, "history drawer did not open"
            page.click("#close-history-btn")
            page.wait_for_timeout(200)
        check("History drawer: open + close", t_history)

        # 15. Keyboard shortcuts
        def t_shortcuts():
            page.keyboard.press("7")
            page.wait_for_timeout(250)
            visible = page.evaluate("() => !document.getElementById('mode-view-workspace').hidden")
            assert visible, "mode 7 shortcut failed"
            page.keyboard.press("Escape")
        check("Keyboard: mode shortcut 7", t_shortcuts)

        # 16. Empty-state honesty: home with no project would show empty state
        # (project created in #6, so check the AI empty state instead)
        def t_ai_empty():
            page.evaluate("() => window.__ahhSwitchMode('ai')")
            page.wait_for_timeout(300)
            empty = page.evaluate("() => document.getElementById('ai-response-empty').style.display !== 'none'")
            assert empty, "AI response empty state missing"
        check("AI Studio: empty state visible", t_ai_empty)

        browser.close()

    print()
    fails = 0
    for name, status, msg in results:
        print(f"{status}: {name}" + (f" — {msg}" if msg else ""))
        if status == "FAIL":
            fails += 1
    print(f"\n{len(results) - fails}/{len(results)} passed, {fails} failed")
    if errors:
        print("PAGE ERRORS:")
        for e in errors[:5]:
            print("  ", e[:200])
    return 1 if fails else 0


if __name__ == "__main__":
    raise SystemExit(run())
