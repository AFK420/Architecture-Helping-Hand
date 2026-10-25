import { createFurnitureAsset, furnitureAssetSVG, furnitureAssetDXF, categoryToToolPaletteDXF } from '../../core/furniture-assets.js';
import { generateAutoLispBlock, generateAutoCadBatchDwgScript } from '../../core/export/autocad-scripts.js';
import { generateCadPackageZip, generateCategoryPackZip } from '../../core/export/zip-packager.js';
import { objectPaperDimensions } from '../../core/furniture/scaling.js';
import { formatNumber } from '../../core/formatter.js';

/** Temporary sizes belong to the open library session, never to catalog records. Tailored for AutoCAD blocks and 1:1 DXF use. */
export function renderObjectLibraryCards({host,items,scale,instances,download,copy,send}) {
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sizeText=a=>`${formatNumber(a.dimensions.widthMm,1)} × ${formatNumber(a.dimensions.depthMm,1)} mm`;

  const packBar = items.length > 1 ? `
    <div class="category-pack-export-bar" style="grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.75rem 1rem; margin-bottom: 0.75rem; background: var(--bg-surface-secondary, rgba(255,255,255,0.04)); border: 1px solid var(--border-color, rgba(255,255,255,0.12)); border-radius: 8px;">
      <div style="display: flex; flex-direction: column; gap: 0.2rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span style="font-weight: 600; font-size: 0.85rem; color: var(--color-primary, #60a5fa); text-transform: uppercase; letter-spacing: 0.04em;">AutoCAD DXF &amp; DWG Palette Pack</span>
          <span style="font-size: 0.85rem; color: var(--text-secondary, #94a3b8);">${items.length} CAD Blocks</span>
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted, #94a3b8);">Standard 1:1 millimeter AutoCAD blocks on AIA CAD layers. Extracts both .DXF palette and DWG converter script.</span>
      </div>
      <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <label class="object-check" style="margin: 0; font-size: 0.8rem; cursor: pointer;"><input type="checkbox" data-pack-clearance> Include A-CLEARANCE</label>
        <button type="button" class="action-tool-btn primary" data-download-category-pack="zip" style="display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; padding: 0.35rem 0.75rem;" title="Extract complete palette package (.zip) containing 1:1 DXF palette sheet, DWG batch script, and AutoLISP layer builder in one file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          CAD Pack (.ZIP)
        </button>
        <button type="button" class="action-tool-btn" data-download-category-pack="dxf" title="Download 1:1 DXF Multi-Block Sheet — opens directly in AutoCAD">
          Palette (.DXF)
        </button>
        <button type="button" class="action-tool-btn" data-download-dwg-script title="Download AutoCAD .scr script for 1-click batch conversion to native .dwg">
          DWG Script (.scr)
        </button>
      </div>
    </div>
  ` : '';

  host.innerHTML = packBar + items.map(item=>{
    const asset=createFurnitureAsset(item,instances.get(item.id)||{}),d=asset.dimensions;
    const cadLayer=asset.planGeometry[0]?.layer||'A-FURN';
    return `<article class="furniture-card object-card" data-id="${safe(item.id)}">
      <h3 class="furn-name">${safe(item.name)}</h3><p class="object-category">${safe(item.category.replaceAll('-',' '))} › ${safe(item.subcategory.replaceAll('-',' '))}</p>
      <div class="view-projection-selector" style="display: flex; gap: 0.25rem; margin-bottom: 0.5rem;">
        <button type="button" class="view-proj-btn active" data-view="plan" style="flex: 1; padding: 0.2rem 0.4rem; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color, #444); background: var(--bg-accent, #2563eb); color: #fff; cursor: pointer;">Top Plan</button>
        <button type="button" class="view-proj-btn" data-view="front" style="flex: 1; padding: 0.2rem 0.4rem; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color, #444); background: transparent; color: inherit; cursor: pointer;">Front</button>
        <button type="button" class="view-proj-btn" data-view="side" style="flex: 1; padding: 0.2rem 0.4rem; font-size: 0.75rem; border-radius: 4px; border: 1px solid var(--border-color, #444); background: transparent; color: inherit; cursor: pointer;">Side</button>
      </div>
      <div class="furn-plan-preview-box" data-object-preview>${furnitureAssetSVG(asset)}</div>
      <p class="object-size" data-object-size>${sizeText(asset)}</p><p class="object-provenance" data-object-provenance>${d.modified?'Edited size':item.dimensionSourceType==='accessibility-guideline'?'Accessibility reference — verify local code':item.dimensionSourceType==='illustrative-reference'?'Editable design reference':'Typical planning dimension'}</p>
      <details class="object-size-editor"><summary>Edit Size</summary><div class="object-size-fields">
        <label>Width (mm)<input class="form-input" type="number" min="1" max="1000000" step="any" data-size="widthMm" value="${d.widthMm}"></label>
        <label>Depth (mm)<input class="form-input" type="number" min="1" max="1000000" step="any" data-size="depthMm" value="${d.depthMm}"></label>
        ${d.heightMm!=null?`<label>Height (mm)<input class="form-input" type="number" min="0" max="1000000" step="any" data-size="heightMm" value="${d.heightMm}"></label>`:''}
      </div><label class="object-check"><input type="checkbox" data-lock-proportions> Preserve proportions</label><button type="button" class="action-tool-btn" data-reset-size>Reset Original</button><p class="object-error" role="alert" data-size-error></p><p class="object-note">Stretches the 2D CAD plan symbol. Scaled 1:1 in millimeters for AutoCAD.</p></details>
      <div class="object-actions">
        <button type="button" class="action-tool-btn primary" data-furniture-download="dxf" title="Download 1:1 AutoCAD DXF drawing — double-click to open directly in AutoCAD at real-world millimeter scale">AutoCAD (.DXF)</button>
        <button type="button" class="action-tool-btn" data-furniture-download="zip" title="Download complete CAD Pack (.zip) containing DXF drawing + AutoLISP DWG injector + conversion script + instructions">CAD Pack (.ZIP)</button>
        <button type="button" class="action-tool-btn" data-furniture-download="dwg" title="Download AutoLISP DWG block injector (.lsp) — drag into any open AutoCAD .dwg window to insert block">DWG (.lsp)</button>
        <button type="button" class="action-tool-btn" data-copy-object>Copy Size</button>
      </div>
      <details class="object-information"><summary>More information</summary><p>Original: ${item.wCm*10} × ${item.dCm*10}${item.hCm?` × ${item.hCm*10}`:''} mm</p><p data-object-imperial>Imperial: ${formatNumber(d.widthMm/25.4,2)} × ${formatNumber(d.depthMm/25.4,2)} in</p><p data-paper-preview></p><p>${safe(item.desc)}</p><p>${safe(item.dimensionSource.note)}</p><p>${safe(item.tags.join(' · '))}</p>
      ${item.aliases?.length?`<p>Same plan symbol is also listed as: ${item.aliases.map(a=>safe(a.name)+(a.heightMm?' (height '+a.heightMm+' mm)':'')).join('; ')}. Edit height when using a size variant.</p>`:''}
      ${item.clearance?'<label class="object-check"><input type="checkbox" data-include-clearance> Include reference clearance</label>':''}
      <p class="object-note">Standard 1:1 scale in millimeters on AIA CAD layers. Double-click the .DXF to open directly in AutoCAD (or Save As .DWG), or download the CAD Pack (.ZIP) for the complete package.</p><button type="button" class="action-tool-btn btn-furn-send" data-send-object>To Converter</button></details>
    </article>`;
  }).join('');

  host.querySelectorAll('[data-download-category-pack]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.downloadCategoryPack || 'zip';
      const incClr = !!host.querySelector('[data-pack-clearance]')?.checked;
      if (mode === 'dxf') {
        const defaultDxf = `autocad-palette-${items.length}-blocks.dxf`;
        const dxf = categoryToToolPaletteDXF(items, { includeClearance: incClr });
        download(dxf, defaultDxf, 'dxf');
      } else {
        const zipData = generateCategoryPackZip(items, { includeClearance: incClr });
        download(zipData, `autocad-palette-${items.length}-blocks-pack.zip`, 'zip');
      }
    });
  });

  host.querySelector('[data-download-dwg-script]')?.addEventListener('click', () => {
    const defaultDxf = `autocad-palette-${items.length}-blocks.dxf`;
    const scr = generateAutoCadBatchDwgScript([defaultDxf]);
    download(scr, `convert_palette_to_dwg.scr`, 'txt');
  });

  host.querySelectorAll('.object-card').forEach(card=>{
    const item=items.find(i=>i.id===card.dataset.id);
    let valid=true;
    let currentView='plan';
    const options=()=>instances.get(item.id)||{};
    const asset=()=>createFurnitureAsset(item,{...options(),includeClearance:!!card.querySelector('[data-include-clearance]')?.checked});
    const paper=()=>{const p=objectPaperDimensions(asset().dimensions,scale);card.querySelector('[data-paper-preview]').textContent=`Drawing preview at 1:${scale}: ${formatNumber(p.widthMm,2)} × ${formatNumber(p.depthMm,2)} mm on paper.`;};
    const paint=()=>{
      const a=asset();
      card.querySelector('[data-object-preview]').innerHTML=furnitureAssetSVG(a,{view:currentView});
      const dimText=currentView==='front'?`${formatNumber(a.dimensions.widthMm,1)} × ${formatNumber((a.height||0.85)*1000,1)} mm (Front Elevation)`:currentView==='side'?`${formatNumber(a.dimensions.depthMm,1)} × ${formatNumber((a.height||0.85)*1000,1)} mm (Side Elevation)`:sizeText(a);
      card.querySelector('[data-object-size]').textContent=dimText;
      card.querySelector('[data-object-imperial]').textContent='Imperial: '+formatNumber(a.dimensions.widthMm/25.4,2)+' × '+formatNumber(a.dimensions.depthMm/25.4,2)+' in';
      card.querySelector('[data-object-provenance]').textContent=a.dimensions.modified?'Edited size — verify before use':item.dimensionSourceType==='illustrative-reference'?'Editable design reference':item.dimensionSourceType==='accessibility-guideline'?'Accessibility reference — verify local code':'Typical planning dimension';
      paper();
    };

    const viewBtns = card.querySelectorAll('[data-view]');
    viewBtns.forEach(btn => btn.addEventListener('click', () => {
      currentView = btn.dataset.view;
      viewBtns.forEach(b => {
        const isActive = b.dataset.view === currentView;
        b.classList.toggle('active', isActive);
        b.style.background = isActive ? 'var(--bg-accent, #2563eb)' : 'transparent';
        b.style.color = isActive ? '#fff' : 'inherit';
      });
      paint();
    }));

    card.querySelectorAll('[data-size]').forEach(input=>input.addEventListener('input',()=>{
      try {
        const next={};card.querySelectorAll('[data-size]').forEach(field=>next[field.dataset.size]=field.value===''?NaN:Number(field.value));
        if(card.querySelector('[data-lock-proportions]').checked&&input.dataset.size!=='heightMm'){
          if(input.dataset.size==='widthMm'){next.depthMm=next.widthMm*item.dCm/item.wCm;card.querySelector('[data-size=depthMm]').value=String(next.depthMm);}
          else{next.widthMm=next.depthMm*item.wCm/item.dCm;card.querySelector('[data-size=widthMm]').value=String(next.widthMm);}
        }
        createFurnitureAsset(item,next);instances.set(item.id,next);valid=true;card.querySelector('[data-size-error]').textContent='';paint();
      } catch(error){valid=false;card.querySelector('[data-size-error]').textContent=error.message;}
      card.querySelectorAll('[data-furniture-download],[data-copy-object],[data-send-object]').forEach(button=>button.disabled=!valid);
    }));
    card.querySelector('[data-reset-size]').addEventListener('click',()=>{instances.delete(item.id);const d=asset().dimensions;card.querySelectorAll('[data-size]').forEach(field=>field.value=d[field.dataset.size]);valid=true;card.querySelector('[data-size-error]').textContent='';card.querySelectorAll('button').forEach(b=>b.disabled=false);paint();});
    card.querySelector('[data-include-clearance]')?.addEventListener('change',paint);
    card.querySelectorAll('[data-furniture-download]').forEach(button=>button.addEventListener('click',()=>{
      if(!valid)return;
      const a=asset();
      const format=button.dataset.furnitureDownload;
      const suffix=currentView!=='plan'?`-${currentView}`:'';
      const baseName=`${item.id}${suffix}-${a.dimensions.widthMm}x${a.dimensions.depthMm}mm`;
      const dxfName=`${baseName}.dxf`;
      const lspName=`${item.id}${suffix}-injector.lsp`;
      const zipName=`${baseName}-cad-pack.zip`;
      const incClr=!!card.querySelector('[data-include-clearance]')?.checked;

      if (format === 'zip' || format === 'both') {
        const zipData = generateCadPackageZip(a, { view: currentView, includeClearance: incClr });
        download(zipData, zipName, 'zip');
      } else if (format === 'dxf') {
        const dxfData = furnitureAssetDXF(a, { view: currentView, includeClearance: incClr });
        download(dxfData, dxfName, 'dxf');
      } else if (format === 'dwg' || format === 'lsp') {
        const lspData = generateAutoLispBlock(a, {
          view: currentView,
          includeClearance: incClr
        });
        download(lspData, lspName, 'txt');
      }
    }));
    card.querySelector('[data-copy-object]').addEventListener('click',()=>{if(valid){const a=asset();copy(sizeText(a)+(a.dimensions.heightMm!=null?' × height '+formatNumber(a.dimensions.heightMm,1)+' mm':''),'Object dimensions');}});
    card.querySelector('[data-send-object]').addEventListener('click',()=>{if(valid)send(asset().dimensions.widthMm);});
    card.querySelector('[data-lock-proportions]').addEventListener('change',()=>{if(!valid||!card.querySelector('[data-lock-proportions]').checked)return;card.querySelector('[data-size=widthMm]').dispatchEvent(new Event('input'));});
    paper();
  });
}
