import asyncio
import os
import sys
from playwright.async_api import async_playwright

DOC_DIR = r"e:\Scaler"
ARTIFACT_DIR = r"C:\Users\owner\.gemini\antigravity\brain\fc81e1a4-8c91-4a87-a084-a56e4974d989"
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "studio_phase3_verified.png")

async def main():
    print("Starting Phase 3 visual verification...", flush=True)
    html_path = os.path.join(DOC_DIR, "index.html")
    file_url = f"file:///{html_path.replace(os.sep, '/')}"

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        await page.goto(file_url, wait_until="domcontentloaded")
        await page.wait_for_timeout(1000)
        print("DOM content loaded", flush=True)

        # 1. Switch to Plan Canvas mode
        await page.evaluate("""() => {
            const btn = document.querySelector('.sidebar-item[data-mode="plan"]');
            if (btn) btn.click();
        }""")
        await page.wait_for_timeout(800)
        print("Switched to Plan Canvas mode", flush=True)

        # 2. Add 5m Wall via contextual toolbar Quick Add
        quick_wall_btn = page.locator("#ctx-quick-wall")
        await quick_wall_btn.click()
        await page.wait_for_timeout(400)
        print("Added 5m wall", flush=True)

        # 3. Select the wall and add Door and Window
        wall_row = page.locator('.plan-entity-row[data-id^="wall-"]').first
        await wall_row.click()
        await page.wait_for_timeout(300)

        add_door_btn = page.locator("#ctx-wall-door")
        await add_door_btn.click()
        await page.wait_for_timeout(300)
        print("Added door to wall", flush=True)

        await wall_row.click()
        await page.wait_for_timeout(300)

        add_win_btn = page.locator("#ctx-wall-win")
        await add_win_btn.click()
        await page.wait_for_timeout(300)
        print("Added window to wall", flush=True)

        # 4. Re-select wall and trigger Auto-Dimension!
        await wall_row.click()
        await page.wait_for_timeout(300)

        autodim_btn = page.locator("#ctx-wall-autodim")
        assert await autodim_btn.is_visible(), "Auto-Dimension button must be visible in wall toolbar"
        await autodim_btn.click()
        await page.wait_for_timeout(500)
        print("Clicked Auto-Dimension on wall", flush=True)

        # Fit plan to view so wall and dimensions are beautifully centered
        fit_btn = page.locator("#btn-plan-fit")
        if await fit_btn.is_visible():
            await fit_btn.click()
            await page.wait_for_timeout(400)
            print("Centered view via Fit button", flush=True)

        # 5. Verify dimension entities generated in the entity list and SVG
        dim_rows = await page.locator('.plan-entity-row[data-id^="dim-"]').count()
        print(f"Generated dimension entities count: {dim_rows}", flush=True)
        assert dim_rows >= 2, "Auto-dimension must generate dimension chain strings"

        # 6. Select the first dimension entity in list
        dim_row = page.locator('.plan-entity-row[data-id^="dim-"]').first
        await dim_row.click()
        await page.wait_for_timeout(400)
        print("Selected dimension entity", flush=True)

        # 7. Test Dimension Contextual Toolbar
        tick_btn = page.locator("#ctx-dim-tick")
        arrow_btn = page.locator("#ctx-dim-arrow")
        dot_btn = page.locator("#ctx-dim-dot")
        dual_btn = page.locator("#ctx-dim-dual")

        assert await tick_btn.is_visible(), "Tick style button must be visible"
        assert await arrow_btn.is_visible(), "Arrow style button must be visible"
        assert await dot_btn.is_visible(), "Dot style button must be visible"

        # Switch to Arrow style
        await arrow_btn.click()
        await page.wait_for_timeout(300)
        print("Changed dimension style to Arrow", flush=True)

        # Toggle Dual Unit ON
        await dual_btn.click()
        await page.wait_for_timeout(300)
        print("Enabled dual unit display [ft-in]", flush=True)

        # 8. Test Dimension Properties Inspector
        prop_style_select = page.locator("#prop-dim-style")
        assert await prop_style_select.is_visible(), "Dimension style select in inspector must be visible"
        style_val = await prop_style_select.input_value()
        print(f"Inspector dimension style value: {style_val}", flush=True)
        assert style_val == "arrow", "Inspector must reflect arrow style"

        # 9. Verify SVG contains witness lines and markers
        svg_el = page.locator("#plan-svg")
        dim_lines = await page.locator("#plan-svg g.plan-entity line[stroke-width]").count()
        print(f"Dimension/witness lines in SVG: {dim_lines}", flush=True)
        assert dim_lines >= 3, "Must render witness and dimension lines in SVG"

        # 10. Test Hover Osnap marker
        # Activate wall tool to trigger snap tracking
        wall_tool_btn = page.locator('.tool-palette-btn[data-tool="wall"]')
        await wall_tool_btn.click()
        await page.wait_for_timeout(300)

        # Move mouse near wall start (which is around canvas center)
        box = await svg_el.bounding_box()
        # Probe coordinates near the wall
        await page.mouse.move(box["x"] + 140, box["y"] + 180)
        await page.wait_for_timeout(300)

        # Switch back to Select tool so selection is clean
        select_btn = page.locator('.tool-palette-btn[data-tool="select"]')
        await select_btn.click()
        await page.wait_for_timeout(300)

        # Re-select the dimension entity so its contextual toolbar and inspector are active for screenshot
        await dim_row.click()
        await page.wait_for_timeout(400)

        # Capture visual verification screenshot
        await page.screenshot(path=SCREENSHOT_PATH, full_page=False)
        print(f"Visual verification screenshot saved to: {SCREENSHOT_PATH}", flush=True)

        await browser.close()
        print("SUCCESS: Phase 3 Studio visual verification complete!", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
