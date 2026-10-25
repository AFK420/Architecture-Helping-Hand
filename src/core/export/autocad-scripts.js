/**
 * Architecture Helping Hand — AutoCAD Script & AutoLISP Generator
 *
 * Provides native AutoCAD automation files:
 *   - AutoLISP (.lsp): Drag-and-drop directly into any open .dwg drawing
 *     to instantly define and insert 1:1 CAD blocks without opening separate files.
 *   - AutoCAD Script (.scr): 1-click batch conversion script to convert
 *     exported DXF sheets into native AutoCAD binary DWG drawings.
 *   - Windows Batch (.bat): Shell script automating AutoCAD Core Console (accoreconsole.exe)
 *     for headless DXF -> DWG compilation.
 */

/**
 * Generates an AutoLISP (.lsp) routine to insert a furniture asset directly into an active DWG.
 *
 * @param {object} asset
 * @param {object} [options]
 * @param {string} [options.view='plan'] 'plan', 'front', or 'side'
 * @returns {string} AutoLISP code
 */
export function generateAutoLispBlock(asset, options = {}) {
  const view = options.view || 'plan';
  const suffix = view === 'front' ? '_FRONT' : view === 'side' ? '_SIDE' : '';
  const blockName = 'AHH_' + String(asset.id || 'OBJECT').toUpperCase().replace(/[^A-Za-z0-9_]/g, '_') + suffix;
  const rawBase = view === 'front' ? (asset.frontGeometry || asset.planGeometry)
                : view === 'side'  ? (asset.sideGeometry  || asset.planGeometry)
                : asset.planGeometry;
  const baseEntities = Array.isArray(rawBase) ? rawBase
                     : Array.isArray(asset?.geometry?.primitives) ? asset.geometry.primitives
                     : [];
  const clr = (options.includeClearance && view === 'plan') ? (asset.clearanceGeometry || []) : [];
  const entities = [...baseEntities, ...(Array.isArray(clr) ? clr : [])];

  const lispLines = [
    `;; =========================================================================`,
    `;; Architecture Helping Hand — AutoLISP Block Inserter`,
    `;; Block: ${blockName} (${view.toUpperCase()} VIEW)`,
    `;; Real Size: ${asset.dimensions?.widthMm || 1000} x ${asset.dimensions?.depthMm || 1000} mm`,
    `;; Instructions: Drag & drop this file into any AutoCAD .dwg drawing window.`,
    `;; =========================================================================`,
    `(vl-load-com)`,
    `(defun c:${blockName} ()`,
    `  (setvar "CMDECHO" 0)`,
    `  (setvar "EXPERT" 1)`,
    `  ;; 1. Ensure Standard AIA Layers exist`,
    `  (command "_.-LAYER" "_M" "A-FURN" "_C" "5" "A-FURN" "")`,
    `  (command "_.-LAYER" "_M" "A-DOOR" "_C" "2" "A-DOOR" "")`,
    `  (command "_.-LAYER" "_M" "A-CLEARANCE" "_C" "8" "A-CLEARANCE" "_LT" "DASHED" "A-CLEARANCE" "")`,
    `  (command "_.-LAYER" "_M" "A-SITE" "_C" "3" "A-SITE" "")`,
    `  (command "_.-LAYER" "_M" "A-ANNO-TEXT" "_C" "7" "A-ANNO-TEXT" "")`,
    `  ;; 2. Begin Block Definition`,
    `  (if (tblsearch "BLOCK" "${blockName}")`,
    `    (princ (strcat "\\nBlock " "${blockName}" " already exists in this DWG. Inserting..."))`,
    `    (progn`,
    `      (entmake '((0 . "BLOCK") (2 . "${blockName}") (70 . 0) (10 0.0 0.0 0.0)))`
  ];

  // Convert entities to entmake calls
  for (const e of entities) {
    if (!e) continue;
    const lyr = e.layer || 'A-FURN';
    if (e.type === 'line') {
      const x1 = (e.x1 * 1000).toFixed(4);
      const y1 = (e.y1 * 1000).toFixed(4);
      const x2 = (e.x2 * 1000).toFixed(4);
      const y2 = (e.y2 * 1000).toFixed(4);
      lispLines.push(`      (entmake (list '(0 . "LINE") '(8 . "${lyr}") (list 10 ${x1} ${y1} 0.0) (list 11 ${x2} ${y2} 0.0)))`);
    } else if (e.type === 'circle') {
      const cx = (e.x * 1000).toFixed(4);
      const cy = (e.y * 1000).toFixed(4);
      const r = (e.r * 1000).toFixed(4);
      lispLines.push(`      (entmake (list '(0 . "CIRCLE") '(8 . "${lyr}") (list 10 ${cx} ${cy} 0.0) '(40 . ${r})))`);
    } else if (e.type === 'polyline' && Array.isArray(e.points) && e.points.length >= 2) {
      lispLines.push(`      (entmake (list '(0 . "POLYLINE") '(8 . "${lyr}") '(66 . 1) '(70 . ${e.closed ? 1 : 0})))`);
      for (const pt of e.points) {
        const px = (pt[0] * 1000).toFixed(4);
        const py = (pt[1] * 1000).toFixed(4);
        lispLines.push(`      (entmake (list '(0 . "VERTEX") '(8 . "${lyr}") (list 10 ${px} ${py} 0.0)))`);
      }
      lispLines.push(`      (entmake '((0 . "SEQEND")))`);
    } else if (e.type === 'rect') {
      const x = ((e.x || 0) * 1000).toFixed(4);
      const y = ((e.y || 0) * 1000).toFixed(4);
      const x2 = (((e.x || 0) + (e.w || 0)) * 1000).toFixed(4);
      const y2 = (((e.y || 0) + (e.d || 0)) * 1000).toFixed(4);
      lispLines.push(`      (entmake (list '(0 . "POLYLINE") '(8 . "${lyr}") '(66 . 1) '(70 . 1)))`);
      lispLines.push(`      (entmake (list '(0 . "VERTEX") '(8 . "${lyr}") (list 10 ${x} ${y} 0.0)))`);
      lispLines.push(`      (entmake (list '(0 . "VERTEX") '(8 . "${lyr}") (list 10 ${x2} ${y} 0.0)))`);
      lispLines.push(`      (entmake (list '(0 . "VERTEX") '(8 . "${lyr}") (list 10 ${x2} ${y2} 0.0)))`);
      lispLines.push(`      (entmake (list '(0 . "VERTEX") '(8 . "${lyr}") (list 10 ${x} ${y2} 0.0)))`);
      lispLines.push(`      (entmake '((0 . "SEQEND")))`);
    }
  }

  lispLines.push(
    `      (entmake '((0 . "ENDBLK")))`,
    `      (princ (strcat "\\nBlock " "${blockName}" " created successfully."))`,
    `    )`,
    `  )`,
    `  ;; 3. Insert Block at user-selected point (or 0,0)`,
    `  (setq insPt (getpoint "\\nSpecify insertion point <0,0,0>: "))`,
    `  (if (null insPt) (setq insPt '(0.0 0.0 0.0)))`,
    `  (command "_.-INSERT" "${blockName}" insPt 1.0 1.0 0.0)`,
    `  (setvar "CMDECHO" 1)`,
    `  (setvar "EXPERT" 0)`,
    `  (princ (strcat "\\nInserted " "${blockName}" " in active DWG at 1:1 scale (mm).\\n"))`,
    `  (princ)`,
    `)`,
    `;; Automatically run insertion command on load`,
    `(c:${blockName})`
  );

  return lispLines.join('\n') + '\n';
}

/**
 * Generates an AutoCAD command script (.scr) to batch-convert DXF files to native DWG drawings.
 *
 * @param {string[]} dxfFileNames List of DXF file names to convert
 * @returns {string} AutoCAD script text
 */
export function generateAutoCadBatchDwgScript(dxfFileNames = []) {
  const files = dxfFileNames.length > 0 ? dxfFileNames : ['catalog-palette.dxf'];
  const lines = [
    `;; =========================================================================`,
    `;; Architecture Helping Hand — AutoCAD Batch DXF to DWG Converter Script`,
    `;; Run in AutoCAD by typing: SCRIPT -> select this file`,
    `;; =========================================================================`,
    `FILEDIA 0`,
    `CMDECHO 0`
  ];

  for (const f of files) {
    const baseName = f.replace(/\.dxf$/i, '');
    lines.push(
      `DXFIN "${f}"`,
      `ZOOM EXTENTS`,
      `SAVEAS 2018 "${baseName}.dwg"`,
      `CLOSE`
    );
  }

  lines.push(
    `FILEDIA 1`,
    `CMDECHO 1`,
    `;; Conversion complete!`
  );

  return lines.join('\n') + '\n';
}

/**
 * Generates a Windows Batch (.bat) file to run AutoCAD Core Console for automated DXF->DWG conversion.
 */
export function generateWindowsDwgBatchBat() {
  return [
    `@echo off`,
    `echo =====================================================================`,
    `echo Architecture Helping Hand - Automated DXF to DWG Batch Converter`,
    `echo =====================================================================`,
    `echo Checking for AutoCAD Core Console (accoreconsole.exe)...`,
    ``,
    `set ACAD_PATH=`,
    `for /d %%p in ("C:\\Program Files\\Autodesk\\AutoCAD*") do (`,
    `  if exist "%%p\\accoreconsole.exe" set ACAD_PATH=%%p\\accoreconsole.exe`,
    `)`,
    ``,
    `if "%ACAD_PATH%"=="" (`,
    `  echo AutoCAD was not found in Program Files.`,
    `  echo To convert to DWG: Open AutoCAD, type SCRIPT, and run 'convert_to_dwg.scr'.`,
    `  pause`,
    `  exit /b`,
    `)`,
    ``,
    `echo Found AutoCAD at: %ACAD_PATH%`,
    `for %%f in (*.dxf) do (`,
    `  echo Converting %%f to native DWG...`,
    `  "%ACAD_PATH%" /i "%%f" /s "convert_to_dwg.scr"`,
    `)`,
    `echo =====================================================================`,
    `echo All DXF files converted to native DWG drawings successfully!`,
    `echo =====================================================================`,
    `pause`
  ].join('\r\n') + '\r\n';
}
