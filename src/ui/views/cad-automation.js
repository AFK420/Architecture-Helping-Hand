/**
 * Architecture Helping Hand — AutoCAD & BIM Workflow Automation View
 *
 * Interactive CAD & BIM automation center featuring:
 *   1. AutoLISP & Script Generator (AIA Layer Setup .lsp, .scr, Batch DWG .bat)
 *   2. Stair & Ramp 1:1 CAD Detail Generator (Cross-sections, stringers, handrails, dimensions)
 *   3. Parking Lot & ADA Stall Bay Layout Generator (Stalls, drive aisles, ADA aisles, ISA symbols)
 *   4. Graphical Door & Window Elevation Schedule (CAD sheet with elevations, frames, swings, tags)
 *   5. AutoCAD Plot Style Table (CTB) & Pen Weight Manager (AIA standard pen weights, scripts, guides)
 *   6. AutoCAD Native Tool Palette Generator (.atc XML catalog)
 *   7. CAD Layer Standardizer & Purger (DXF Hygiene, Zero-Length Purge, Duplicate Purge, Remapper)
 *   8. Autodesk Revit & BIM Integration (Shared Parameters .txt, Dynamo Python, BIM Schedules)
 */

import {
  AIA_STANDARD_LAYERS,
  generateAiaLayersAutoLisp,
  generateAiaLayersScript,
  generateAutoCadToolPaletteAtc,
  sanitizeAndStandardizeDxf,
  generateRevitSharedParametersFile,
  generateDynamoPythonBatchPlacer,
  generateBimSchedule
} from '../../core/cad-bim-automation.js';
import {
  generateStairCadDetail,
  generateRampCadDetail,
  generateParkingBayCadDetail,
  generateDoorWindowElevationSchedule,
  STANDARD_DOOR_TYPES,
  STANDARD_WINDOW_TYPES,
  AIA_PLOT_STYLE_PENS,
  generateLayerLineweightScript,
  generatePlotStyleAutoLisp,
  generatePlotStyleReportText
} from '../../core/cad-generators.js';
import { generateWindowsDwgBatchBat, generateAutoCadBatchDwgScript } from '../../core/export/autocad-scripts.js';
import { createZipArchive } from '../../core/export/zip-packager.js';
import { downloadExport } from '../../services/export.js';
import { FURNITURE_DATABASE } from '../../core/furniture.js';
import { createFurnitureAsset } from '../../core/furniture-assets.js';

export function createCadAutomationView(context) {
  const { showToast, copyToClipboard, AudioService } = context;

  let activeSubTab = 'layers'; // 'layers', 'stairs_ramps', 'parking', 'doors_windows', 'plot_styles', 'tool_palette', 'dxf_hygiene', 'bim'
  let sanitizeResults = null;
  let activeScheduleType = 'doors';
  let activePaletteCategory = 'all';

  // State for Stair & Ramp generator
  let stairRampMode = 'stairs'; // 'stairs' or 'ramps'
  let stairParams = { totalRiseMm: 2700, riserCount: 15, treadDepthMm: 280, nosingMm: 25, includeHandrail: true };
  let rampParams = { totalRiseMm: 600, slopeRatio: 12, landingLengthMm: 1500, includeHandrail: true };

  // State for Parking Bay generator
  let parkingParams = { stallCount: 16, angle: 90, stallWidthMm: 2700, stallDepthMm: 5500, aisleWidthMm: 7300, adaCount: 2, vanAdaCount: 1, doubleBay: true, includeTireStops: true };

  // State for Door/Window elevation schedule
  let selectedDoors = ['D01', 'D02', 'D03'];
  let selectedWindows = ['W01', 'W02', 'W03'];

  // Sample messy DXF text for testing the purger/standardizer
  const sampleMessyDxf = [
    '  0', 'SECTION',
    '  2', 'ENTITIES',
    '  0', 'LINE',
    '  8', 'Layer 1',
    ' 10', '0.0', ' 20', '0.0',
    ' 11', '1200.0', ' 21', '0.0',
    ' 62', '1',
    '  0', 'LINE', // Duplicate line
    '  8', 'walls',
    ' 10', '0.0', ' 20', '0.0',
    ' 11', '1200.0', ' 21', '0.0',
    '  0', 'LINE', // Zero length degenerate line
    '  8', 'temp',
    ' 10', '500.0', ' 20', '500.0',
    ' 11', '500.0', ' 21', '500.0',
    '  0', 'LINE',
    '  8', 'doors',
    ' 10', '1200.0', ' 20', '0.0',
    ' 11', '1200.0', ' 21', '900.0',
    '  0', 'LINE',
    '  8', 'windows',
    ' 10', '1500.0', ' 20', '0.0',
    ' 11', '2400.0', ' 21', '0.0',
    '  0', 'ENDSEC',
    '  0', 'EOF'
  ].join('\n');

  function render() {
    const container = document.getElementById('mode-view-cad_automation');
    if (!container) return;

    container.innerHTML = `
      <header class="simple-tool-header" style="margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <h2 class="card-title" style="display: flex; align-items: center; gap: 0.5rem; margin: 0;">
              <span>⚡</span> AutoCAD &amp; BIM Workflow Automation
            </h2>
            <p style="margin: 0.25rem 0 0; color: var(--text-secondary); font-size: 0.875rem;">
              AutoLISP script generators, Stair &amp; Ramp details, Parking bays, Door/Window elevations, CTB Plot Styles, Tool Palettes (.atc), and BIM schedules.
            </p>
          </div>
          <div class="sub-tab-group" role="tablist" style="display: flex; flex-wrap: wrap; gap: 0.35rem; background: var(--bg-surface-secondary, rgba(255,255,255,0.06)); padding: 0.25rem; border-radius: 8px; border: 1px solid var(--border-color, rgba(255,255,255,0.1));">
            ${[
              { id: 'layers', label: '📜 Layers' },
              { id: 'stairs_ramps', label: '🪜 Stairs & Ramps' },
              { id: 'parking', label: '🚗 Parking Bays' },
              { id: 'doors_windows', label: '🚪 Door & Window' },
              { id: 'plot_styles', label: '🖨️ Plot Styles (CTB)' },
              { id: 'tool_palette', label: '🎨 Palettes (.atc)' },
              { id: 'dxf_hygiene', label: '🧹 DXF Purger' },
              { id: 'bim', label: '🏢 Revit & BIM' }
            ].map(tab => `
              <button class="sub-tab-btn ${activeSubTab === tab.id ? 'active' : ''}" data-subtab="${tab.id}" role="tab" style="padding: 0.4rem 0.65rem; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; border: none; background: ${activeSubTab === tab.id ? 'var(--accent-primary, #3b82f6)' : 'transparent'}; color: ${activeSubTab === tab.id ? '#fff' : 'var(--text-secondary)'};">
                ${tab.label}
              </button>
            `).join('')}
          </div>
        </div>
      </header>

      <div class="cad-automation-body">
        ${activeSubTab === 'layers' ? renderLayersTab()
        : activeSubTab === 'stairs_ramps' ? renderStairsRampsTab()
        : activeSubTab === 'parking' ? renderParkingTab()
        : activeSubTab === 'doors_windows' ? renderDoorsWindowsTab()
        : activeSubTab === 'plot_styles' ? renderPlotStylesTab()
        : activeSubTab === 'tool_palette' ? renderToolPaletteTab()
        : activeSubTab === 'dxf_hygiene' ? renderDxfHygieneTab()
        : renderBimTab()}
      </div>
    `;

    bindEvents();
  }

  // --- Subtab 1: Layers ---
  function renderLayersTab() {
    return `
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start;">
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">AIA National CAD Standard (NCS) / ISO 13567 Layer Matrix</h3>
              <span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                ${AIA_STANDARD_LAYERS.length} Certified Layers
              </span>
            </div>
            <div style="max-height: 400px; overflow-y: auto; border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 6px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.825rem; text-align: left;">
                <thead style="position: sticky; top: 0; background: var(--bg-surface-secondary, #1e293b); z-index: 2;">
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 0.5rem 0.75rem;">Color</th>
                    <th style="padding: 0.5rem 0.75rem;">Layer Name</th>
                    <th style="padding: 0.5rem 0.75rem;">Linetype</th>
                    <th style="padding: 0.5rem 0.75rem;">Weight</th>
                    <th style="padding: 0.5rem 0.75rem;">Description</th>
                  </tr>
                </thead>
                <tbody>
                  ${AIA_STANDARD_LAYERS.map(l => `
                    <tr style="border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));">
                      <td style="padding: 0.45rem 0.75rem;">
                        <span style="display: inline-block; width: 14px; height: 14px; border-radius: 3px; background: ${l.colorHex}; vertical-align: middle; border: 1px solid rgba(255,255,255,0.2);" title="ACI ${l.colorIndex}"></span>
                        <span style="margin-left: 0.35rem; color: var(--text-secondary); font-size: 0.75rem;">${l.colorIndex}</span>
                      </td>
                      <td style="padding: 0.45rem 0.75rem; font-family: monospace; font-weight: 600; color: #38bdf8;">${l.name}</td>
                      <td style="padding: 0.45rem 0.75rem; color: var(--text-secondary); font-family: monospace;">${l.linetype}</td>
                      <td style="padding: 0.45rem 0.75rem; color: var(--text-secondary);">${l.lineweightMm} mm</td>
                      <td style="padding: 0.45rem 0.75rem; color: var(--text-secondary);">${l.description}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- How to Use Guidance Box -->
            <div style="margin-top: 1rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
              <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
                <span>💡</span> How to Use AIA Standard Layers in AutoCAD
              </h4>
              <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                <li><strong>Method 1 (Instant Drag &amp; Drop):</strong> Click <em>Download AutoLISP (.lsp)</em>. Drag <code>setup_aia_layers.lsp</code> directly into any open AutoCAD <code>.dwg</code> window. All 24 layers, colors, and linetypes are created automatically in 1 second!</li>
                <li><strong>Method 2 (AutoCAD Script):</strong> Click <em>AutoCAD Script (.scr)</em>. In AutoCAD, type <code>SCRIPT</code>, select <code>setup_aia_layers.scr</code>, and press Enter.</li>
                <li><strong>Verification:</strong> Type <code>LAYER</code> in AutoCAD to see all newly created AIA certified layers.</li>
              </ol>
            </div>
          </div>
        </div>
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <h3 style="margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600;">Export Layer Automation</h3>
            <p style="margin: 0 0 1rem; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.4;">
              Instantly create all 24 AIA standard layers in any active drawing without opening templates manually.
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              <button type="button" class="action-tool-btn primary" id="btn-download-aia-lisp" style="width: 100%; text-align: left; padding: 0.6rem 0.85rem;">
                <div style="font-weight: 600;">Download AutoLISP (.lsp)</div>
                <div style="font-size: 0.75rem; opacity: 0.85;">Drag & drop into open .dwg window</div>
              </button>
              <button type="button" class="action-tool-btn" id="btn-download-aia-scr" style="width: 100%; text-align: left; padding: 0.6rem 0.85rem;">
                <div style="font-weight: 600;">AutoCAD Script (.scr)</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Run via SCRIPT command or batch setup</div>
              </button>
              <button type="button" class="action-tool-btn" id="btn-copy-aia-lisp" style="width: 100%; padding: 0.5rem 0.85rem;">
                Copy AutoLISP to Clipboard
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Subtab 2: Stairs & Ramps CAD Detail Generator ---
  function renderStairsRampsTab() {
    const isStair = stairRampMode === 'stairs';
    const detail = isStair ? generateStairCadDetail(stairParams) : generateRampCadDetail(rampParams);

    return `
      <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start;">
        <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="display: flex; gap: 0.25rem; margin-bottom: 1rem; background: var(--bg-surface-secondary); padding: 0.2rem; border-radius: 6px;">
            <button type="button" class="sub-tab-btn ${isStair ? 'active' : ''}" data-stair-mode="stairs" style="flex:1; padding: 0.35rem; font-size: 0.75rem; border-radius: 4px; border:none; background:${isStair ? 'var(--accent-primary, #3b82f6)' : 'transparent'}; color:${isStair ? '#fff' : 'inherit'}; cursor:pointer;">🪜 Stair Detail</button>
            <button type="button" class="sub-tab-btn ${!isStair ? 'active' : ''}" data-stair-mode="ramps" style="flex:1; padding: 0.35rem; font-size: 0.75rem; border-radius: 4px; border:none; background:${!isStair ? 'var(--accent-primary, #3b82f6)' : 'transparent'}; color:${!isStair ? '#fff' : 'inherit'}; cursor:pointer;">♿ ADA Ramp</button>
          </div>

          ${isStair ? `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Total Rise (mm)
                <input type="number" class="form-input" id="input-stair-rise" value="${stairParams.totalRiseMm}" min="500" max="6000" step="50" style="width: 100%; margin-top: 0.25rem;">
              </label>
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Riser Count
                <input type="number" class="form-input" id="input-stair-count" value="${stairParams.riserCount}" min="2" max="35" style="width: 100%; margin-top: 0.25rem;">
                <span style="font-size: 0.75rem; color: #38bdf8; display: block; margin-top: 0.2rem;">Riser Height: <strong>${detail.specs.riserHeight.toFixed(1)} mm</strong></span>
              </label>
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Tread Depth / Going (mm)
                <input type="number" class="form-input" id="input-stair-tread" value="${stairParams.treadDepthMm}" min="200" max="450" step="10" style="width: 100%; margin-top: 0.25rem;">
              </label>
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Nosing Overhang (mm)
                <input type="number" class="form-input" id="input-stair-nosing" value="${stairParams.nosingMm}" min="0" max="50" step="5" style="width: 100%; margin-top: 0.25rem;">
              </label>
              <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
                <input type="checkbox" id="chk-stair-handrail" ${stairParams.includeHandrail ? 'checked' : ''}> Include 900mm Handrails &amp; Balusters
              </label>
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Total Rise (mm)
                <input type="number" class="form-input" id="input-ramp-rise" value="${rampParams.totalRiseMm}" min="50" max="2000" step="25" style="width: 100%; margin-top: 0.25rem;">
              </label>
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Slope Ratio (1:X)
                <input type="number" class="form-input" id="input-ramp-ratio" value="${rampParams.slopeRatio}" min="4" max="24" step="1" style="width: 100%; margin-top: 0.25rem;">
                <span style="font-size: 0.75rem; color: #38bdf8; display: block; margin-top: 0.2rem;">Slope: <strong>1:${rampParams.slopeRatio} (${(100/rampParams.slopeRatio).toFixed(2)}%)</strong></span>
              </label>
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Landing Length (mm)
                <input type="number" class="form-input" id="input-ramp-landing" value="${rampParams.landingLengthMm}" min="1200" max="2400" step="100" style="width: 100%; margin-top: 0.25rem;">
              </label>
              <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
                <input type="checkbox" id="chk-ramp-handrail" ${rampParams.includeHandrail ? 'checked' : ''}> Include ADA Handrails &amp; Extensions
              </label>
            </div>
          `}

          <div style="margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <button type="button" class="action-tool-btn primary" id="btn-download-stair-dxf" style="width: 100%;">
              Download 1:1 CAD Section (.DXF)
            </button>
            <button type="button" class="action-tool-btn" id="btn-download-stair-zip" style="width: 100%;">
              Download CAD Pack (.ZIP)
            </button>
            <button type="button" class="action-tool-btn" id="btn-copy-stair-lsp" style="width: 100%;">
              Copy AutoLISP Command
            </button>
          </div>
        </div>

        <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">1:1 Millimeter CAD Section Preview</h3>
            ${isStair ? `
              <div style="display: flex; gap: 0.5rem; font-size: 0.75rem;">
                <span class="badge" style="background: rgba(34,197,94,0.15); color: #4ade80; padding: 0.2rem 0.5rem; border-radius: 4px;">2R+G: ${detail.specs.blondel.toFixed(1)} mm</span>
                <span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 0.2rem 0.5rem; border-radius: 4px;">Pitch: ${detail.specs.pitchDegrees}&deg;</span>
              </div>
            ` : `
              <span class="badge" style="background: rgba(34,197,94,0.15); color: #4ade80; padding: 0.2rem 0.5rem; border-radius: 4px;">ADA §405 Compliant</span>
            `}
          </div>
          <div style="width: 100%; height: 320px; border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 6px; overflow: hidden;">
            ${isStair ? detail.svg : `
              <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; background: #0f172a; padding: 1.5rem; text-align: center;">
                <div style="font-size: 1.1rem; font-weight: 600; color: #38bdf8; margin-bottom: 0.5rem;">ADA Ramp Section Generated</div>
                <div style="color: #94a3b8; font-size: 0.85rem; max-width: 480px; line-height: 1.5;">
                  Ramp Run: <strong>${Math.round(detail.specs.rampRun)} mm</strong> | Total Rise: <strong>${detail.specs.totalRise} mm</strong><br>
                  Slope: <strong>1:${detail.specs.slopeRatio} (${detail.specs.slopePercent}%)</strong> | Landings: <strong>${detail.specs.landingLength} mm</strong><br>
                  Includes 100mm curb protection and 900mm handrails with 300mm level ADA extensions.
                </div>
              </div>
            `}
          </div>

          <!-- How to Use Guidance Box -->
          <div style="margin-top: 0.85rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
            <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
              <span>💡</span> How to Use Stair &amp; Ramp Sections in AutoCAD
            </h4>
            <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
              <li><strong>Open Directly in AutoCAD:</strong> Click <em>Download 1:1 CAD Section (.DXF)</em>. Double-click the downloaded <code>.dxf</code> file — AutoCAD opens it directly in 1:1 millimeters.</li>
              <li><strong>Save as Native .DWG:</strong> Inside AutoCAD, press <code>Ctrl + Shift + S</code> (or type <code>SAVEAS</code>) and choose <em>AutoCAD Drawing (*.dwg)</em>.</li>
              <li><strong>Insert into Active Project:</strong> In your building section DWG, type <code>INSERT</code> (or <code>CLASSICINSERT</code>), browse to the downloaded file, and place the section.</li>
              <li><strong>Layers Included:</strong> <code>A-FLOR-STRS</code> (flight &amp; nosing), <code>A-FLOR-HRAL</code> (handrail &amp; balusters), <code>A-ANNO-DIMS</code> (dimensions &amp; pitch).</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  // --- Subtab 3: Parking Lot & ADA Stall Bay Layout ---
  function renderParkingTab() {
    const bay = generateParkingBayCadDetail(parkingParams);

    return `
      <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start;">
        <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <h3 style="margin: 0 0 1rem; font-size: 1rem; font-weight: 600;">Parking Bay Configuration</h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <label style="font-size: 0.8rem; color: var(--text-secondary);">Total Standard Stalls
              <input type="number" class="form-input" id="input-parking-stalls" value="${parkingParams.stallCount}" min="4" max="40" step="2" style="width: 100%; margin-top: 0.25rem;">
            </label>
            <label style="font-size: 0.8rem; color: var(--text-secondary);">Stall Angle
              <select class="form-select" id="select-parking-angle" style="width: 100%; margin-top: 0.25rem;">
                <option value="90" ${parkingParams.angle === 90 ? 'selected' : ''}>90&deg; (Perpendicular - Two-Way)</option>
                <option value="60" ${parkingParams.angle === 60 ? 'selected' : ''}>60&deg; (Angled - One-Way)</option>
                <option value="45" ${parkingParams.angle === 45 ? 'selected' : ''}>45&deg; (Angled - One-Way)</option>
              </select>
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Standard ADA
                <input type="number" class="form-input" id="input-parking-ada" value="${parkingParams.adaCount}" min="0" max="6" style="width: 100%; margin-top: 0.25rem;">
              </label>
              <label style="font-size: 0.8rem; color: var(--text-secondary);">Van Accessible
                <input type="number" class="form-input" id="input-parking-van" value="${parkingParams.vanAdaCount}" min="0" max="4" style="width: 100%; margin-top: 0.25rem;">
              </label>
            </div>
            <label style="font-size: 0.8rem; color: var(--text-secondary);">Drive Aisle Width (mm)
              <input type="number" class="form-input" id="input-parking-aisle" value="${parkingParams.aisleWidthMm}" min="3500" max="9000" step="100" style="width: 100%; margin-top: 0.25rem;">
            </label>
            <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
              <input type="checkbox" id="chk-parking-double" ${parkingParams.doubleBay ? 'checked' : ''}> Double-Loaded Bay (Both Sides)
            </label>
            <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
              <input type="checkbox" id="chk-parking-stops" ${parkingParams.includeTireStops ? 'checked' : ''}> Include Concrete Wheel Stops
            </label>
          </div>

          <div style="margin-top: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <button type="button" class="action-tool-btn primary" id="btn-download-parking-dxf" style="width: 100%;">
              Download Parking Bay (.DXF)
            </button>
            <button type="button" class="action-tool-btn" id="btn-download-parking-zip" style="width: 100%;">
              Download CAD Pack (.ZIP)
            </button>
            <button type="button" class="action-tool-btn" id="btn-copy-parking-dxf" style="width: 100%;">
              Copy DXF Content
            </button>
          </div>
        </div>

        <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">1:1 Parking Bay Layout Preview</h3>
            <div style="display: flex; gap: 0.5rem; font-size: 0.75rem;">
              <span class="badge" style="background: rgba(234,179,8,0.15); color: #facc15; padding: 0.2rem 0.5rem; border-radius: 4px;">Length: ${(bay.specs.totalLengthMm / 1000).toFixed(1)} m</span>
              <span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 0.2rem 0.5rem; border-radius: 4px;">Width: ${(bay.specs.totalWidthMm / 1000).toFixed(1)} m</span>
            </div>
          </div>
          <div style="width: 100%; height: 320px; border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 6px; overflow: hidden;">
            ${bay.svg}
          </div>

          <!-- How to Use Guidance Box -->
          <div style="margin-top: 0.85rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
            <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
              <span>💡</span> How to Use Parking Bays in AutoCAD
            </h4>
            <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
              <li><strong>Configure Bay:</strong> Select 90&deg; perpendicular or 60&deg;/45&deg; angled stalls. Enable double-loaded bay for two rows sharing a drive aisle.</li>
              <li><strong>Download CAD Layout:</strong> Click <em>Download Parking Bay (.DXF)</em>.</li>
              <li><strong>Insert in Site Plan:</strong> In your AutoCAD civil/site drawing, type <code>INSERT</code>, select the DXF, and align to your site boundary or curb.</li>
              <li><strong>Pre-Configured Layers:</strong> <code>C-ROAD-STRP</code> (yellow striping), <code>C-ROAD-PARK</code> (curbs &amp; wheel stops), <code>C-ROAD-SYMB</code> (wheelchair symbols), <code>C-ROAD-ANNO</code> (drive aisle width).</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  // --- Subtab 4: Graphical Door & Window Elevation Schedule ---
  function renderDoorsWindowsTab() {
    const activeDoors = STANDARD_DOOR_TYPES.filter(d => selectedDoors.includes(d.id));
    const activeWindows = STANDARD_WINDOW_TYPES.filter(w => selectedWindows.includes(w.id));
    const schedule = generateDoorWindowElevationSchedule({ doors: activeDoors, windows: activeWindows });

    return `
      <div style="display: grid; grid-template-columns: 320px 1fr; gap: 1.5rem; align-items: start;">
        <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <h3 style="margin: 0 0 0.75rem; font-size: 1rem; font-weight: 600;">Schedule Components</h3>
          
          <div style="margin-bottom: 1rem;">
            <div style="font-size: 0.8rem; font-weight: 600; color: #38bdf8; margin-bottom: 0.4rem; text-transform: uppercase;">Doors (${activeDoors.length} selected)</div>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 150px; overflow-y: auto;">
              ${STANDARD_DOOR_TYPES.map(d => `
                <label style="font-size: 0.775rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
                  <input type="checkbox" class="chk-door-item" data-id="${d.id}" ${selectedDoors.includes(d.id) ? 'checked' : ''}>
                  <span><strong>${d.id}</strong>: ${d.name} (${d.widthMm}x${d.heightMm})</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <div style="font-size: 0.8rem; font-weight: 600; color: #38bdf8; margin-bottom: 0.4rem; text-transform: uppercase;">Windows (${activeWindows.length} selected)</div>
            <div style="display: flex; flex-direction: column; gap: 0.35rem; max-height: 150px; overflow-y: auto;">
              ${STANDARD_WINDOW_TYPES.map(w => `
                <label style="font-size: 0.775rem; display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
                  <input type="checkbox" class="chk-win-item" data-id="${w.id}" ${selectedWindows.includes(w.id) ? 'checked' : ''}>
                  <span><strong>${w.id}</strong>: ${w.name} (${w.widthMm}x${w.heightMm})</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <button type="button" class="action-tool-btn primary" id="btn-download-elev-dxf" style="width: 100%;">
              Download CAD Elevation Sheet (.DXF)
            </button>
            <button type="button" class="action-tool-btn" id="btn-download-elev-zip" style="width: 100%;">
              Download CAD Pack (.ZIP)
            </button>
            <button type="button" class="action-tool-btn" id="btn-copy-elev-dxf" style="width: 100%;">
              Copy DXF Content
            </button>
          </div>
        </div>

        <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">Graphical Elevation CAD Sheet</h3>
            <span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">
              ${schedule.entities.length} CAD Entities
            </span>
          </div>

          <div style="border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 6px; padding: 1rem; background: #0f172a; min-height: 300px;">
            <div style="display: flex; flex-direction: column; gap: 1rem;">
              <div style="border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 0.75rem;">
                <div style="font-size: 0.85rem; font-weight: 600; color: #38bdf8; margin-bottom: 0.5rem;">WINDOW ELEVATIONS (Row 1)</div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end;">
                  ${activeWindows.map(w => `
                    <div style="border: 1px solid #06b6d4; padding: 0.4rem; background: rgba(6,182,212,0.05); border-radius: 4px; text-align: center; width: ${Math.max(75, w.widthMm / 18)}px;">
                      <div style="font-size: 0.75rem; font-weight: 700; color: #fff;">${w.id}</div>
                      <div style="font-size: 0.65rem; color: #94a3b8;">${w.widthMm}x${w.heightMm}</div>
                      <div style="height: ${Math.max(35, w.heightMm / 22)}px; border: 1px solid #06b6d4; margin: 0.3rem 0; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #06b6d4;">Glass</div>
                      <div style="font-size: 0.65rem; color: #e2e8f0;">Sill: ${w.sillMm} mm</div>
                    </div>
                  `).join('')}
                </div>
              </div>

              <div>
                <div style="font-size: 0.85rem; font-weight: 600; color: #22c55e; margin-bottom: 0.5rem;">DOOR ELEVATIONS (Row 2 - Ground Floor FFL ±0.00)</div>
                <div style="display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end;">
                  ${activeDoors.map(d => `
                    <div style="border: 1px solid #22c55e; padding: 0.4rem; background: rgba(34,197,94,0.05); border-radius: 4px; text-align: center; width: ${Math.max(75, d.widthMm / 16)}px;">
                      <div style="font-size: 0.75rem; font-weight: 700; color: #fff;">${d.id}</div>
                      <div style="font-size: 0.65rem; color: #94a3b8;">${d.widthMm}x${d.heightMm}</div>
                      <div style="height: ${Math.max(50, d.heightMm / 22)}px; border: 1px solid #22c55e; margin: 0.3rem 0; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: #22c55e;">Leaf</div>
                      <div style="font-size: 0.65rem; color: #e2e8f0;">${d.fireRating}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- How to Use Guidance Box -->
          <div style="margin-top: 0.85rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
            <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
              <span>💡</span> How to Use Door &amp; Window Elevation Sheets in AutoCAD
            </h4>
            <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
              <li><strong>Select Openings:</strong> Toggle which door and window types you want on your drawing sheet.</li>
              <li><strong>Download Sheet:</strong> Click <em>Download CAD Elevation Sheet (.DXF)</em>.</li>
              <li><strong>Place in AutoCAD Drawing:</strong> Open in AutoCAD or type <code>INSERT</code> to drop into a Paper Space sheet layout or Model Space schedule area.</li>
              <li><strong>Everything Aligned:</strong> Doors align to Finished Floor Line (<code>A-FLOR-LEVL</code>), frames on <code>A-DOOR</code> / <code>A-GLAZ</code>, tags (D01, W01) on <code>A-ANNO-TEXT</code>.</li>
            </ol>
          </div>
        </div>
      </div>
    `;
  }

  // --- Subtab 5: AutoCAD Plot Style (CTB) & Pen Weights ---
  function renderPlotStylesTab() {
    return `
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start;">
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">AIA National CAD Standard (NCS) Pen Weight Table</h3>
              <span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                Color-Dependent (.ctb)
              </span>
            </div>

            <div style="overflow-x: auto; border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 6px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.825rem; text-align: left;">
                <thead style="background: var(--bg-surface-secondary, #1e293b);">
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <th style="padding: 0.5rem 0.75rem;">ACI Color</th>
                    <th style="padding: 0.5rem 0.75rem;">Name</th>
                    <th style="padding: 0.5rem 0.75rem;">Lineweight</th>
                    <th style="padding: 0.5rem 0.75rem;">Visual Stroke</th>
                    <th style="padding: 0.5rem 0.75rem;">Screening</th>
                    <th style="padding: 0.5rem 0.75rem;">Primary Use</th>
                  </tr>
                </thead>
                <tbody>
                  ${AIA_PLOT_STYLE_PENS.map(p => `
                    <tr style="border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.05));">
                      <td style="padding: 0.5rem 0.75rem;">
                        <span style="display: inline-block; width: 14px; height: 14px; border-radius: 3px; background: ${p.hex}; vertical-align: middle; border: 1px solid rgba(255,255,255,0.2);"></span>
                        <span style="margin-left: 0.35rem; font-weight: 600; color: #fff;">${p.colorIndex}</span>
                      </td>
                      <td style="padding: 0.5rem 0.75rem; color: var(--text-secondary);">${p.colorName}</td>
                      <td style="padding: 0.5rem 0.75rem; font-weight: 600; color: #38bdf8;">${p.mm.toFixed(2)} mm</td>
                      <td style="padding: 0.5rem 0.75rem;">
                        <div style="width: 60px; height: ${Math.max(1, p.mm * 6)}px; background: ${p.hex}; border-radius: 1px;"></div>
                      </td>
                      <td style="padding: 0.5rem 0.75rem; color: var(--text-secondary);">${p.screening}%</td>
                      <td style="padding: 0.5rem 0.75rem; color: var(--text-secondary); font-size: 0.775rem;">${p.use}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <!-- How to Use Guidance Box -->
            <div style="margin-top: 1rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
              <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
                <span>💡</span> How to Calibrate Pen Weights &amp; CTB in AutoCAD
              </h4>
              <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                <li><strong>Apply Lineweights to Layers:</strong> Click <em>Download Lineweight Script (.scr)</em>. In AutoCAD, type <code>SCRIPT</code>, select the file, and press Enter. It assigns pen weights to all layers and turns on on-screen lineweights (<code>LWDISPLAY 1</code>).</li>
                <li><strong>AutoLISP 1-Click:</strong> Click <em>AutoLISP Pen Setup (.lsp)</em>. Drag into AutoCAD and type <code>(c:AHH_SET_PEN_WEIGHTS)</code>.</li>
                <li><strong>Configure AutoCAD Plot Style:</strong> Type <code>PLOTSTYLEMANAGER</code> in AutoCAD. Open or create your <code>.ctb</code> file and assign the millimeter widths shown above so printed PDFs have crisp, sharp linework.</li>
              </ol>
            </div>
          </div>
        </div>

        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <h3 style="margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600;">CTB Automation &amp; Setup</h3>
            <p style="margin: 0 0 1rem; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.4;">
              Calibrate your layer lineweights directly in AutoCAD so PDFs and plotted drawings have crisp, professional linework.
            </p>

            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              <button type="button" class="action-tool-btn primary" id="btn-download-pen-scr" style="width: 100%; text-align: left; padding: 0.6rem 0.85rem;">
                <div style="font-weight: 600;">Download Lineweight Script (.scr)</div>
                <div style="font-size: 0.75rem; opacity: 0.85;">Sets layer lineweights &amp; turns LWDISPLAY ON</div>
              </button>
              <button type="button" class="action-tool-btn" id="btn-download-pen-lsp" style="width: 100%; text-align: left; padding: 0.6rem 0.85rem;">
                <div style="font-weight: 600;">AutoLISP Pen Setup (.lsp)</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">Command (c:AHH_SET_PEN_WEIGHTS)</div>
              </button>
              <button type="button" class="action-tool-btn" id="btn-download-ctb-guide" style="width: 100%; padding: 0.5rem 0.85rem;">
                Download CTB Configuration Guide (.txt)
              </button>
              <button type="button" class="action-tool-btn" id="btn-download-pen-csv" style="width: 100%; padding: 0.5rem 0.85rem;">
                Download Pen Weight CSV Table
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Subtab 6: Tool Palettes ---
  function renderToolPaletteTab() {
    return `
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start;">
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">Autodesk Tool Palette XML Definition (.atc)</h3>
              <span class="badge" style="background: rgba(34,197,94,0.15); color: #4ade80; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                Schema 2.0 / NCS Compliant
              </span>
            </div>
            <p style="margin: 0 0 1rem; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5;">
              Generates native Autodesk Tool Palette catalog files (<code>.atc</code>). When imported into AutoCAD via <code>TOOLPALETTES</code>, blocks appear on an interactive toolbar with pre-assigned layers and colors.
            </p>
            <div style="border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 6px; padding: 1rem; background: #0f172a; font-family: monospace; font-size: 0.75rem; color: #94a3b8; max-height: 250px; overflow-y: auto;">
              <pre style="margin: 0;">&lt;?xml version="1.0" encoding="UTF-8"?&gt;
&lt;ToolPalette schemaVersion="2.0"&gt;
  &lt;Name&gt;Architecture Helping Hand - CAD Blocks&lt;/Name&gt;
  &lt;Tools&gt;
    &lt;Tool&gt;
      &lt;Name&gt;Sofa 3-Person&lt;/Name&gt;
      &lt;BlockName&gt;AHH_SOFA_3P&lt;/BlockName&gt;
      &lt;Layer&gt;A-FURN&lt;/Layer&gt;
      &lt;Color&gt;5&lt;/Color&gt;
    &lt;/Tool&gt;
    ...
  &lt;/Tools&gt;
&lt;/ToolPalette&gt;</pre>
            </div>

            <!-- How to Use Guidance Box -->
            <div style="margin-top: 1rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
              <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
                <span>💡</span> How to Import Tool Palettes in AutoCAD
              </h4>
              <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                <li><strong>Download Palette File:</strong> Click <em>Download Tool Palette (.atc)</em>.</li>
                <li><strong>Open Tool Palettes in AutoCAD:</strong> Press <code>Ctrl + 3</code> (or type <code>TOOLPALETTES</code>).</li>
                <li><strong>Import Catalog:</strong> Right-click the palette bar title ➔ select <em>Customize Palettes...</em>. Right-click in the Palettes list on the left ➔ select <em>Import...</em> ➔ choose the <code>.atc</code> file.</li>
                <li><strong>Use:</strong> A new tab appears on your palette! Click any block icon to drop it into your drawing with automatic AIA layer placement.</li>
              </ol>
            </div>
          </div>
        </div>
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <h3 style="margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600;">Download Palette Catalog</h3>
            <p style="margin: 0 0 1rem; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.4;">
              Export the XML tool palette and import into AutoCAD by right-clicking any Tool Palette and choosing "Customize Palettes...".
            </p>
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              <button type="button" class="action-tool-btn primary" id="btn-download-atc-palette" style="width: 100%; text-align: left; padding: 0.6rem 0.85rem;">
                <div style="font-weight: 600;">Download Tool Palette (.atc)</div>
                <div style="font-size: 0.75rem; opacity: 0.85;">Native AutoCAD Tool Palette Catalog</div>
              </button>
              <button type="button" class="action-tool-btn" id="btn-copy-atc-xml" style="width: 100%; padding: 0.5rem 0.85rem;">
                Copy XML to Clipboard
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Subtab 7: DXF Hygiene ---
  function renderDxfHygieneTab() {
    return `
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start;">
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">CAD Layer Standardizer &amp; DXF Purger</h3>
              <button type="button" class="action-tool-btn" id="btn-load-sample-dxf" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                Load Messy Sample DXF
              </button>
            </div>
            <textarea id="dxf-hygiene-input" class="form-input" rows="12" style="width: 100%; font-family: monospace; font-size: 0.75rem; padding: 0.5rem; background: #0f172a; resize: vertical;" placeholder="Paste DXF content here to purge degenerate entities and remap non-standard layers..."></textarea>

            <!-- How to Use Guidance Box -->
            <div style="margin-top: 1rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
              <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
                <span>💡</span> How to Clean Consultant Drawings with DXF Purger
              </h4>
              <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
                <li><strong>Paste or Load DXF:</strong> Open any messy consultant <code>.dxf</code> in Notepad, copy the text, and paste it into the box above (or click <em>Load Messy Sample DXF</em> to test).</li>
                <li><strong>Select Cleaning Actions:</strong> Purges degenerate zero-length lines, removes duplicate overlapping lines, remaps consultant layer names to AIA NCS (e.g. "walls" ➔ <code>A-WALL-FULL</code>), and resets color to <code>BYLAYER</code>.</li>
                <li><strong>Sanitize &amp; Download:</strong> Click <em>Sanitize &amp; Purge DXF</em>, then click <em>Download DXF</em>.</li>
              </ol>
            </div>
          </div>
        </div>
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <h3 style="margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600;">Sanitizer Options</h3>
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1.25rem;">
              <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
                <input type="checkbox" id="chk-remap-layers" checked> Remap consultant layers to AIA NCS
              </label>
              <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
                <input type="checkbox" id="chk-purge-zero" checked> Purge zero-length lines &amp; points
              </label>
              <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
                <input type="checkbox" id="chk-purge-dups" checked> Purge duplicate overlapping lines
              </label>
              <label class="object-check" style="font-size: 0.8rem; cursor: pointer;">
                <input type="checkbox" id="chk-bylayer-color" checked> Force color 256 (BYLAYER)
              </label>
            </div>
            <button type="button" class="action-tool-btn primary" id="btn-run-dxf-sanitize" style="width: 100%; margin-bottom: 0.6rem;">
              Sanitize &amp; Purge DXF
            </button>
            ${sanitizeResults ? `
              <div style="margin-top: 1rem; padding: 0.75rem; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); border-radius: 6px; font-size: 0.8rem;">
                <div style="font-weight: 600; color: #4ade80; margin-bottom: 0.25rem;">Sanitization Complete</div>
                <div>Purged Zero-Length: <strong>${sanitizeResults.stats.purgedZeroLength}</strong></div>
                <div>Purged Duplicates: <strong>${sanitizeResults.stats.purgedDuplicates}</strong></div>
                <div>Remapped Layers: <strong>${sanitizeResults.stats.remappedLayers}</strong></div>
                <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem;">
                  <button type="button" class="action-tool-btn" id="btn-download-sanitized-dxf" style="flex: 1; font-size: 0.75rem;">Download DXF</button>
                  <button type="button" class="action-tool-btn" id="btn-copy-sanitized-dxf" style="flex: 1; font-size: 0.75rem;">Copy</button>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // --- Subtab 8: Revit & BIM ---
  function renderBimTab() {
    return `
      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 1.5rem; align-items: start;">
        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">Autodesk Revit Shared Parameters File</h3>
              <span class="badge" style="background: rgba(59,130,246,0.15); color: #60a5fa; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
                16 Parameters
              </span>
            </div>
            <p style="margin: 0 0 1rem; color: var(--text-secondary); font-size: 0.825rem; line-height: 1.4;">
              Standardized Revit Shared Parameters text file with unique GUIDs across 4 essential groups: <em>Clearances &amp; Accessibility</em>, <em>Building Codes &amp; Life Safety</em>, <em>COBie &amp; Facility Management</em>, and <em>OmniClass Classification</em>.
            </p>
            <div style="display: flex; gap: 0.5rem;">
              <button type="button" class="action-tool-btn primary" id="btn-download-revit-params" style="font-size: 0.8rem;">
                Download Revit_Shared_Parameters.txt
              </button>
              <button type="button" class="action-tool-btn" id="btn-copy-revit-params" style="font-size: 0.8rem;">
                Copy Shared Parameters
              </button>
            </div>
          </div>

          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <h3 style="margin: 0; font-size: 1rem; font-weight: 600;">Dynamo Python Batch Instance Placer</h3>
              <button type="button" class="action-tool-btn" id="btn-copy-dynamo-py" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                Copy Python Script
              </button>
            </div>
            <p style="margin: 0 0 0.75rem; color: var(--text-secondary); font-size: 0.8rem;">
              Automates bulk family placement inside Autodesk Revit using Revit API transactions (<code>Autodesk.Revit.DB.FamilySymbol</code>).
            </p>
            <div style="border: 1px solid var(--border-color, rgba(255,255,255,0.08)); border-radius: 6px; padding: 0.75rem; background: #0f172a; font-family: monospace; font-size: 0.75rem; color: #94a3b8; max-height: 140px; overflow-y: auto;">
              <pre style="margin: 0;">import clr
clr.AddReference('RevitAPI')
from Autodesk.Revit.DB import *
doc = DocumentManager.Instance.CurrentDBDocument
# Batch placement wrapped in transaction</pre>
            </div>
          </div>

          <!-- How to Use Guidance Box -->
          <div style="margin-top: 1rem; padding: 0.85rem 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 6px;">
            <h4 style="margin: 0 0 0.35rem; font-size: 0.85rem; font-weight: 600; color: #60a5fa; display: flex; align-items: center; gap: 0.35rem;">
              <span>💡</span> How to Use Revit &amp; BIM Automation Files
            </h4>
            <ol style="margin: 0; padding-left: 1.2rem; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">
              <li><strong>Revit Shared Parameters:</strong> In Autodesk Revit, navigate to <strong>Manage ➔ Shared Parameters</strong>. Click <em>Browse...</em>, select <code>Revit_Shared_Parameters.txt</code>, and bind parameters (ClearanceWidth, FireRating, COBie) to your families.</li>
              <li><strong>Dynamo Python Placer:</strong> Open Dynamo in Revit, create a <em>Python Script</em> node, paste the copied script, and run to batch-place instances automatically.</li>
              <li><strong>BIM Schedules to CAD Table:</strong> Click <em>Download 1:1 DXF Table Sheet</em> to drop a complete formatted schedule sheet into AutoCAD Paper Space.</li>
            </ol>
          </div>
        </div>

        <div>
          <div class="card" style="padding: 1.25rem; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: 8px;">
            <h3 style="margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600;">BIM Schedules (CSV &amp; CAD Table)</h3>
            <p style="margin: 0 0 1rem; color: var(--text-secondary); font-size: 0.8rem; line-height: 1.4;">
              Export certified schedules for Revit/Excel or 1:1 AutoCAD Paper Space table sheets with borders and text cells.
            </p>
            <label style="font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.75rem;">Schedule Category:
              <select class="form-select" id="bim-schedule-type-select" style="width: 100%; margin-top: 0.25rem;">
                <option value="doors" ${activeScheduleType === 'doors' ? 'selected' : ''}>Door &amp; Hardware Schedule</option>
                <option value="rooms" ${activeScheduleType === 'rooms' ? 'selected' : ''}>Room Finish &amp; Occupancy Schedule</option>
                <option value="ffe" ${activeScheduleType === 'ffe' ? 'selected' : ''}>FF&amp;E Furniture &amp; Equipment Schedule</option>
              </select>
            </label>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <button type="button" class="action-tool-btn primary" id="btn-download-schedule-csv" style="width: 100%;">
                Download Schedule (.CSV)
              </button>
              <button type="button" class="action-tool-btn" id="btn-download-schedule-dxf" style="width: 100%;">
                Download 1:1 DXF Table Sheet
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindEvents() {
    // Sub-tab switching
    document.querySelectorAll('.sub-tab-btn[data-subtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        activeSubTab = btn.dataset.subtab;
        render();
      });
    });

    // --- Tab 1: Layers ---
    document.getElementById('btn-download-aia-lisp')?.addEventListener('click', () => {
      const lsp = generateAiaLayersAutoLisp();
      downloadExport(lsp, 'setup_aia_layers.lsp', 'text/plain');
      showToast('AutoLISP Layer Setup downloaded! Drag & drop directly into your AutoCAD .dwg window.', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-aia-scr')?.addEventListener('click', () => {
      const scr = generateAiaLayersScript();
      downloadExport(scr, 'setup_aia_layers.scr', 'text/plain');
      showToast('AutoCAD Layer Setup Script downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-copy-aia-lisp')?.addEventListener('click', () => {
      const lsp = generateAiaLayersAutoLisp();
      copyToClipboard(lsp, 'AutoLISP Layer Setup');
    });

    // --- Tab 2: Stairs & Ramps CAD ---
    document.querySelectorAll('[data-stair-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        stairRampMode = btn.dataset.stairMode;
        render();
      });
    });

    document.getElementById('input-stair-rise')?.addEventListener('input', e => {
      stairParams.totalRiseMm = Number(e.target.value) || 2700;
      render();
    });
    document.getElementById('input-stair-count')?.addEventListener('input', e => {
      stairParams.riserCount = Number(e.target.value) || 15;
      render();
    });
    document.getElementById('input-stair-tread')?.addEventListener('input', e => {
      stairParams.treadDepthMm = Number(e.target.value) || 280;
      render();
    });
    document.getElementById('input-stair-nosing')?.addEventListener('input', e => {
      stairParams.nosingMm = Number(e.target.value) || 25;
      render();
    });
    document.getElementById('chk-stair-handrail')?.addEventListener('change', e => {
      stairParams.includeHandrail = !!e.target.checked;
      render();
    });

    document.getElementById('input-ramp-rise')?.addEventListener('input', e => {
      rampParams.totalRiseMm = Number(e.target.value) || 600;
      render();
    });
    document.getElementById('input-ramp-ratio')?.addEventListener('input', e => {
      rampParams.slopeRatio = Number(e.target.value) || 12;
      render();
    });
    document.getElementById('input-ramp-landing')?.addEventListener('input', e => {
      rampParams.landingLengthMm = Number(e.target.value) || 1500;
      render();
    });
    document.getElementById('chk-ramp-handrail')?.addEventListener('change', e => {
      rampParams.includeHandrail = !!e.target.checked;
      render();
    });

    document.getElementById('btn-download-stair-dxf')?.addEventListener('click', () => {
      const isStair = stairRampMode === 'stairs';
      const detail = isStair ? generateStairCadDetail(stairParams) : generateRampCadDetail(rampParams);
      const filename = isStair ? `stair-detail-${Math.round(stairParams.totalRiseMm)}mm.dxf` : `ramp-detail-${Math.round(rampParams.totalRiseMm)}mm.dxf`;
      downloadExport(detail.dxf, filename, 'application/dxf');
      showToast('1:1 Millimeter CAD detail downloaded! Opens natively in AutoCAD.', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-stair-zip')?.addEventListener('click', () => {
      const isStair = stairRampMode === 'stairs';
      const detail = isStair ? generateStairCadDetail(stairParams) : generateRampCadDetail(rampParams);
      const dxfName = isStair ? `stair-detail-${Math.round(stairParams.totalRiseMm)}mm.dxf` : `ramp-detail-${Math.round(rampParams.totalRiseMm)}mm.dxf`;
      const lspName = isStair ? `stair-injector.lsp` : `ramp-injector.lsp`;
      const scrData = generateAutoCadBatchDwgScript([dxfName]);

      const zip = createZipArchive([
        { name: dxfName, content: detail.dxf },
        { name: lspName, content: detail.lisp || '; Detail script' },
        { name: 'convert_to_dwg.scr', content: scrData },
        { name: 'AUTOCAD_DWG_GUIDE.txt', content: 'Double click .dxf to open in AutoCAD or use Save As to convert to .dwg.' }
      ]);
      downloadExport(zip, isStair ? 'stair-cad-package.zip' : 'ramp-cad-package.zip', 'zip');
      showToast('Complete CAD detail package (.zip) downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-copy-stair-lsp')?.addEventListener('click', () => {
      const isStair = stairRampMode === 'stairs';
      const detail = isStair ? generateStairCadDetail(stairParams) : generateRampCadDetail(rampParams);
      copyToClipboard(detail.lisp || detail.dxf, isStair ? 'Stair AutoLISP Command' : 'Ramp CAD DXF');
    });

    // --- Tab 3: Parking Bays ---
    document.getElementById('input-parking-stalls')?.addEventListener('input', e => {
      parkingParams.stallCount = Number(e.target.value) || 16;
      render();
    });
    document.getElementById('select-parking-angle')?.addEventListener('change', e => {
      parkingParams.angle = Number(e.target.value) || 90;
      render();
    });
    document.getElementById('input-parking-ada')?.addEventListener('input', e => {
      parkingParams.adaCount = Number(e.target.value) || 0;
      render();
    });
    document.getElementById('input-parking-van')?.addEventListener('input', e => {
      parkingParams.vanAdaCount = Number(e.target.value) || 0;
      render();
    });
    document.getElementById('input-parking-aisle')?.addEventListener('input', e => {
      parkingParams.aisleWidthMm = Number(e.target.value) || 7300;
      render();
    });
    document.getElementById('chk-parking-double')?.addEventListener('change', e => {
      parkingParams.doubleBay = !!e.target.checked;
      render();
    });
    document.getElementById('chk-parking-stops')?.addEventListener('change', e => {
      parkingParams.includeTireStops = !!e.target.checked;
      render();
    });

    document.getElementById('btn-download-parking-dxf')?.addEventListener('click', () => {
      const bay = generateParkingBayCadDetail(parkingParams);
      downloadExport(bay.dxf, `parking-bay-${parkingParams.stallCount}-stalls-${parkingParams.angle}deg.dxf`, 'application/dxf');
      showToast('1:1 Millimeter Parking Bay Layout downloaded for AutoCAD!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-parking-zip')?.addEventListener('click', () => {
      const bay = generateParkingBayCadDetail(parkingParams);
      const dxfName = `parking-bay-${parkingParams.stallCount}-stalls.dxf`;
      const scr = generateAutoCadBatchDwgScript([dxfName]);
      const zip = createZipArchive([
        { name: dxfName, content: bay.dxf },
        { name: 'convert_to_dwg.scr', content: scr },
        { name: 'AUTOCAD_DWG_GUIDE.txt', content: 'Double click .dxf to open in AutoCAD or use Save As to convert to .dwg.' }
      ]);
      downloadExport(zip, `parking-bay-cad-package.zip`, 'zip');
      showToast('Parking bay CAD package (.zip) downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-copy-parking-dxf')?.addEventListener('click', () => {
      const bay = generateParkingBayCadDetail(parkingParams);
      copyToClipboard(bay.dxf, 'Parking Bay DXF');
    });

    // --- Tab 4: Door & Window Elevations ---
    document.querySelectorAll('.chk-door-item').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = chk.dataset.id;
        if (chk.checked && !selectedDoors.includes(id)) selectedDoors.push(id);
        else if (!chk.checked) selectedDoors = selectedDoors.filter(x => x !== id);
        render();
      });
    });

    document.querySelectorAll('.chk-win-item').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = chk.dataset.id;
        if (chk.checked && !selectedWindows.includes(id)) selectedWindows.push(id);
        else if (!chk.checked) selectedWindows = selectedWindows.filter(x => x !== id);
        render();
      });
    });

    document.getElementById('btn-download-elev-dxf')?.addEventListener('click', () => {
      const activeDoors = STANDARD_DOOR_TYPES.filter(d => selectedDoors.includes(d.id));
      const activeWindows = STANDARD_WINDOW_TYPES.filter(w => selectedWindows.includes(w.id));
      const sched = generateDoorWindowElevationSchedule({ doors: activeDoors, windows: activeWindows });
      downloadExport(sched.dxf, 'door-window-elevation-sheet.dxf', 'application/dxf');
      showToast('Door & Window Elevation CAD Sheet downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-elev-zip')?.addEventListener('click', () => {
      const activeDoors = STANDARD_DOOR_TYPES.filter(d => selectedDoors.includes(d.id));
      const activeWindows = STANDARD_WINDOW_TYPES.filter(w => selectedWindows.includes(w.id));
      const sched = generateDoorWindowElevationSchedule({ doors: activeDoors, windows: activeWindows });
      const dxfName = 'door-window-elevation-sheet.dxf';
      const scr = generateAutoCadBatchDwgScript([dxfName]);
      const zip = createZipArchive([
        { name: dxfName, content: sched.dxf },
        { name: 'convert_to_dwg.scr', content: scr },
        { name: 'AUTOCAD_DWG_GUIDE.txt', content: 'Double click .dxf to open in AutoCAD or use Save As to convert to .dwg.' }
      ]);
      downloadExport(zip, 'door-window-elevations-package.zip', 'zip');
      showToast('Elevation CAD package (.zip) downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-copy-elev-dxf')?.addEventListener('click', () => {
      const activeDoors = STANDARD_DOOR_TYPES.filter(d => selectedDoors.includes(d.id));
      const activeWindows = STANDARD_WINDOW_TYPES.filter(w => selectedWindows.includes(w.id));
      const sched = generateDoorWindowElevationSchedule({ doors: activeDoors, windows: activeWindows });
      copyToClipboard(sched.dxf, 'Door & Window Elevation DXF');
    });

    // --- Tab 5: Plot Styles & Pen Weights ---
    document.getElementById('btn-download-pen-scr')?.addEventListener('click', () => {
      const scr = generateLayerLineweightScript();
      downloadExport(scr, 'setup_aia_pen_weights.scr', 'text/plain');
      showToast('Layer Lineweight Setup Script (.scr) downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-pen-lsp')?.addEventListener('click', () => {
      const lsp = generatePlotStyleAutoLisp();
      downloadExport(lsp, 'setup_aia_pen_weights.lsp', 'text/plain');
      showToast('AutoLISP Pen Setup downloaded! Drag & drop into AutoCAD.', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-ctb-guide')?.addEventListener('click', () => {
      const txt = generatePlotStyleReportText();
      downloadExport(txt, 'AIA_NCS_Plot_Style_CTB_Guide.txt', 'text/plain');
      showToast('CTB Configuration Guide downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-pen-csv')?.addEventListener('click', () => {
      const header = 'Color_Index,Color_Name,Lineweight_mm,Screening_Percent,Description\n';
      const rows = AIA_PLOT_STYLE_PENS.map(p => `${p.colorIndex},"${p.colorName}",${p.mm},${p.screening},"${p.use}"`).join('\n');
      downloadExport(header + rows, 'AIA_Plot_Style_Pen_Table.csv', 'text/csv');
      showToast('Pen Table CSV downloaded!', 'success');
      AudioService.playSuccess();
    });

    // --- Tab 6: Tool Palettes ---
    document.getElementById('btn-download-atc-palette')?.addEventListener('click', () => {
      const sampleAssets = FURNITURE_DATABASE.slice(0, 20).map(item => createFurnitureAsset(item));
      const atc = generateAutoCadToolPaletteAtc('Architecture Helping Hand - Master Catalog', sampleAssets);
      downloadExport(atc, 'Architecture_Helping_Hand_Catalog.atc', 'text/xml');
      showToast('Autodesk Tool Palette (.atc) downloaded!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-copy-atc-xml')?.addEventListener('click', () => {
      const sampleAssets = FURNITURE_DATABASE.slice(0, 10).map(item => createFurnitureAsset(item));
      const atc = generateAutoCadToolPaletteAtc('Architecture Helping Hand - Blocks', sampleAssets);
      copyToClipboard(atc, 'Tool Palette XML');
    });

    // --- Tab 7: DXF Hygiene ---
    document.getElementById('btn-load-sample-dxf')?.addEventListener('click', () => {
      const ta = document.getElementById('dxf-hygiene-input');
      if (ta) ta.value = sampleMessyDxf;
    });

    document.getElementById('btn-run-dxf-sanitize')?.addEventListener('click', () => {
      const ta = document.getElementById('dxf-hygiene-input');
      const val = ta?.value?.trim();
      if (!val) {
        showToast('Please paste DXF content or click "Load Messy Sample DXF".', 'warning');
        return;
      }

      const remap = document.getElementById('chk-remap-layers')?.checked;
      const purgeZero = document.getElementById('chk-purge-zero')?.checked;
      const purgeDups = document.getElementById('chk-purge-dups')?.checked;
      const byLayerColor = document.getElementById('chk-bylayer-color')?.checked;

      sanitizeResults = sanitizeAndStandardizeDxf(val, {
        remapLayers: remap,
        purgeZeroLength: purgeZero,
        purgeDuplicates: purgeDups,
        normalizeColorByLayer: byLayerColor
      });

      AudioService.playSuccess();
      showToast(`Sanitized! Purged ${sanitizeResults.stats.purgedZeroLength + sanitizeResults.stats.purgedDuplicates} invalid entities.`, 'success');
      render();
    });

    document.getElementById('btn-download-sanitized-dxf')?.addEventListener('click', () => {
      if (!sanitizeResults?.sanitizedDxf) return;
      downloadExport(sanitizeResults.sanitizedDxf, 'sanitized_standard_drawing.dxf', 'application/dxf');
      showToast('Sanitized AIA-standard DXF downloaded!', 'success');
    });

    document.getElementById('btn-copy-sanitized-dxf')?.addEventListener('click', () => {
      if (!sanitizeResults?.sanitizedDxf) return;
      copyToClipboard(sanitizeResults.sanitizedDxf, 'Sanitized DXF');
    });

    // --- Tab 8: BIM ---
    document.getElementById('btn-download-revit-params')?.addEventListener('click', () => {
      const txt = generateRevitSharedParametersFile();
      downloadExport(txt, 'Revit_Shared_Parameters.txt', 'text/plain');
      showToast('Revit Shared Parameters file downloaded! Import via Manage > Shared Parameters in Revit.', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-copy-revit-params')?.addEventListener('click', () => {
      const txt = generateRevitSharedParametersFile();
      copyToClipboard(txt, 'Revit Shared Parameters');
    });

    document.getElementById('btn-copy-dynamo-py')?.addEventListener('click', () => {
      const py = generateDynamoPythonBatchPlacer();
      copyToClipboard(py, 'Dynamo Python Script');
    });

    document.getElementById('bim-schedule-type-select')?.addEventListener('change', (e) => {
      activeScheduleType = e.target.value;
      render();
    });

    document.getElementById('btn-download-schedule-csv')?.addEventListener('click', () => {
      const sched = generateBimSchedule(activeScheduleType);
      downloadExport(sched.csv, `BIM_${activeScheduleType.toUpperCase()}_SCHEDULE.csv`, 'text/csv');
      showToast('BIM Schedule CSV downloaded for Revit/Excel!', 'success');
      AudioService.playSuccess();
    });

    document.getElementById('btn-download-schedule-dxf')?.addEventListener('click', () => {
      const sched = generateBimSchedule(activeScheduleType);
      downloadExport(sched.dxfTable, `BIM_${activeScheduleType.toUpperCase()}_TABLE.dxf`, 'application/dxf');
      showToast('1:1 BIM Schedule DXF Table Sheet downloaded for AutoCAD!', 'success');
      AudioService.playSuccess();
    });
  }

  return {
    id: 'cad_automation',
    mount() { render(); },
    onModeEnter() { render(); },
    getController() { return { render }; }
  };
}
