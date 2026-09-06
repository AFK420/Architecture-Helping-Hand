"""
Python script to verify Studio Personas & Adaptive Modality UI in browser
"""
import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    artifacts_dir = r"C:\Users\owner\.gemini\antigravity\brain\fc81e1a4-8c91-4a87-a084-a56e4974d989"
    index_path = r"file:///E:/Scaler/index.html"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Use full workstation resolution
        page = await browser.new_page(viewport={"width": 1600, "height": 960})

        print("Navigating to index.html...")
        await page.goto(index_path)
        await page.wait_for_timeout(1000)

        # 1. Switch to Plan View (Architecture Studio)
        print("Switching to Plan View mode...")
        await page.evaluate("window.__ahhSwitchMode('plan')")
        await page.wait_for_timeout(1000)

        # Collapse sidebar to let the center viewport shine
        await page.evaluate("document.body.classList.add('sidebar-hidden')")
        await page.wait_for_timeout(400)

        # Screenshot 1: Center-Graph Viewport with Studio Persona (Framed on all 4 sides)
        print("Screenshot 1: Studio Mode...")
        shot1 = os.path.join(artifacts_dir, "studio_center_viewport_studio.png")
        await page.screenshot(path=shot1, full_page=False)
        print(f"Captured: {shot1}")

        # 2. Switch to AutoCAD Persona
        print("Switching to AutoCAD Persona...")
        await page.click('button[data-persona="autocad"]')
        await page.wait_for_timeout(500)
        shot2 = os.path.join(artifacts_dir, "studio_persona_autocad.png")
        await page.screenshot(path=shot2, full_page=False)
        print(f"Captured: {shot2}")

        # 3. Switch to Rhino Persona
        print("Switching to Rhino Persona...")
        await page.click('button[data-persona="rhino"]')
        await page.wait_for_timeout(500)
        shot3 = os.path.join(artifacts_dir, "studio_persona_rhino.png")
        await page.screenshot(path=shot3, full_page=False)
        print(f"Captured: {shot3}")

        # 3b. Trigger Rhino 4-Viewport Split (view_4split)
        print("Triggering Rhino 4-Viewport Split...")
        # Click the 4-viewport tool in the ribbon or palette
        await page.evaluate("""() => {
            const btn = document.querySelector('button[data-tool="view_4split"]') || document.querySelector('.palette-tool-btn[data-tool="view_4split"]');
            if (btn) btn.click();
            else {
                const cmdInput = document.getElementById('commandbar-input');
                if (cmdInput) {
                    cmdInput.value = '4VIEW';
                    cmdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                }
            }
        }""")
        await page.wait_for_timeout(700)
        shot3b = os.path.join(artifacts_dir, "studio_rhino_4viewport.png")
        await page.screenshot(path=shot3b, full_page=False)
        print(f"Captured: {shot3b}")

        # 4. Switch to Photoshop Persona
        print("Switching to Photoshop Persona...")
        await page.click('button[data-persona="photoshop"]')
        await page.wait_for_timeout(500)
        shot4 = os.path.join(artifacts_dir, "studio_persona_photoshop.png")
        await page.screenshot(path=shot4, full_page=False)
        print(f"Captured: {shot4}")

        # 5. Switch to SketchUp Persona
        print("Switching to SketchUp Persona...")
        await page.click('button[data-persona="sketchup"]')
        await page.wait_for_timeout(500)
        shot5 = os.path.join(artifacts_dir, "studio_persona_sketchup.png")
        await page.screenshot(path=shot5, full_page=False)
        print(f"Captured: {shot5}")

        # 6. Test Universal Tool Search
        print("Testing universal live search in left palette...")
        await page.click('button[data-persona="studio"]')
        await page.wait_for_timeout(400)
        search_input = page.locator('#palette-tool-search')
        await search_input.fill('stair')
        await page.wait_for_timeout(500)
        shot6 = os.path.join(artifacts_dir, "studio_palette_search.png")
        await page.screenshot(path=shot6, full_page=False)
        print(f"Captured: {shot6}")
        await search_input.fill('')

        # 7. Test C-Panels: Detailing Tab
        print("Testing right C-Panels tabs...")
        await page.click('button[data-panel-tab="details"]')
        await page.wait_for_timeout(400)
        shot7 = os.path.join(artifacts_dir, "studio_cpanels_details.png")
        await page.screenshot(path=shot7, full_page=False)
        print(f"Captured: {shot7}")

        # 8. Open Omnipresent AI Assistant Dropdown Drawer
        print("Opening Top Omnipresent AI Assistant Drawer...")
        await page.click('#top-menubar-ai-btn')
        await page.wait_for_timeout(800)
        shot8 = os.path.join(artifacts_dir, "studio_ai_dropdown_drawer.png")
        await page.screenshot(path=shot8, full_page=False)
        print(f"Captured: {shot8}")

        await browser.close()
        print("All visual verification screenshots captured successfully!")

if __name__ == '__main__':
    asyncio.run(main())
