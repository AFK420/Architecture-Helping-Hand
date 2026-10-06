import { createFurnitureAsset, furnitureAssetSVG, furnitureAssetDXF } from '../../core/furniture-assets.js';
import { objectPaperDimensions } from '../../core/furniture/scaling.js';
import { formatNumber } from '../../core/formatter.js';

/** Temporary sizes belong to the open library session, never to catalog records. */
export function renderObjectLibraryCards({host,items,scale,instances,download,copy,send}) {
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sizeText=a=>`${formatNumber(a.dimensions.widthMm,1)} × ${formatNumber(a.dimensions.depthMm,1)} mm`;
  host.innerHTML=items.map(item=>{
    const asset=createFurnitureAsset(item,instances.get(item.id)||{}),d=asset.dimensions;
    return `<article class="furniture-card object-card" data-id="${safe(item.id)}">
      <h3 class="furn-name">${safe(item.name)}</h3><p class="object-category">${safe(item.category.replaceAll('-',' '))} › ${safe(item.subcategory.replaceAll('-',' '))}</p>
      <div class="furn-plan-preview-box" data-object-preview>${furnitureAssetSVG(asset)}</div>
      <p class="object-size" data-object-size>${sizeText(asset)}</p><p class="object-provenance" data-object-provenance>${d.modified?'Edited size':item.dimensionSourceType==='accessibility-guideline'?'Accessibility reference — verify local code':item.dimensionSourceType==='illustrative-reference'?'Editable design reference':'Typical planning dimension'}</p>
      <details class="object-size-editor"><summary>Edit Size</summary><div class="object-size-fields">
        <label>Width (mm)<input class="form-input" type="number" min="1" max="1000000" step="any" data-size="widthMm" value="${d.widthMm}"></label>
        <label>Depth (mm)<input class="form-input" type="number" min="1" max="1000000" step="any" data-size="depthMm" value="${d.depthMm}"></label>
        ${d.heightMm!=null?`<label>Height (mm)<input class="form-input" type="number" min="0" max="1000000" step="any" data-size="heightMm" value="${d.heightMm}"></label>`:''}
      </div><label class="object-check"><input type="checkbox" data-lock-proportions> Preserve proportions</label><button type="button" class="action-tool-btn" data-reset-size>Reset Original</button><p class="object-error" role="alert" data-size-error></p><p class="object-note">This stretches the schematic top view. Verify functional details and working clearances.</p></details>
      <div class="object-actions"><button type="button" class="action-tool-btn primary" data-furniture-download="dxf">Download DXF</button><button type="button" class="action-tool-btn" data-furniture-download="svg">SVG</button><button type="button" class="action-tool-btn" data-copy-object>Copy Dimensions</button></div>
      <details class="object-information"><summary>More information</summary><p>Original: ${item.wCm*10} × ${item.dCm*10}${item.hCm?` × ${item.hCm*10}`:''} mm</p><p data-object-imperial>Imperial: ${formatNumber(d.widthMm/25.4,2)} × ${formatNumber(d.depthMm/25.4,2)} in</p><p data-paper-preview></p><p>${safe(item.desc)}</p><p>${safe(item.dimensionSource.note)}</p><p>${safe(item.tags.join(' · '))}</p>
      ${item.aliases?.length?`<p>Same plan symbol is also listed as: ${item.aliases.map(a=>safe(a.name)+(a.heightMm?' (height '+a.heightMm+' mm)':'')).join('; ')}. Edit height when using a size variant.</p>`:''}
      ${item.clearance?'<label class="object-check"><input type="checkbox" data-include-clearance> Include reference clearance</label>':''}<p class="object-note">DXF and SVG always use real-size millimeters. Drawing scale affects only the paper readout.</p><button type="button" class="action-tool-btn btn-furn-send" data-send-object>To Converter</button></details>
    </article>`;
  }).join('');
  host.querySelectorAll('.object-card').forEach(card=>{
    const item=items.find(i=>i.id===card.dataset.id);
    let valid=true;
    const options=()=>instances.get(item.id)||{};
    const asset=()=>createFurnitureAsset(item,{...options(),includeClearance:!!card.querySelector('[data-include-clearance]')?.checked});
    const paper=()=>{const p=objectPaperDimensions(asset().dimensions,scale);card.querySelector('[data-paper-preview]').textContent=`Drawing preview at 1:${scale}: ${formatNumber(p.widthMm,2)} × ${formatNumber(p.depthMm,2)} mm on paper.`;};
    const paint=()=>{const a=asset();card.querySelector('[data-object-preview]').innerHTML=furnitureAssetSVG(a);card.querySelector('[data-object-size]').textContent=sizeText(a);card.querySelector('[data-object-imperial]').textContent='Imperial: '+formatNumber(a.dimensions.widthMm/25.4,2)+' × '+formatNumber(a.dimensions.depthMm/25.4,2)+' in';card.querySelector('[data-object-provenance]').textContent=a.dimensions.modified?'Edited size — verify before use':item.dimensionSourceType==='illustrative-reference'?'Editable design reference':item.dimensionSourceType==='accessibility-guideline'?'Accessibility reference — verify local code':'Typical planning dimension';paper();};
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
    card.querySelectorAll('[data-furniture-download]').forEach(button=>button.addEventListener('click',()=>{if(!valid)return;const a=asset(),format=button.dataset.furnitureDownload;download(format==='dxf'?furnitureAssetDXF(a):furnitureAssetSVG(a),`${item.id}-${a.dimensions.widthMm}x${a.dimensions.depthMm}mm.${format}`,format);}));
    card.querySelector('[data-copy-object]').addEventListener('click',()=>{if(valid){const a=asset();copy(sizeText(a)+(a.dimensions.heightMm!=null?' × height '+formatNumber(a.dimensions.heightMm,1)+' mm':''),'Object dimensions');}});
    card.querySelector('[data-send-object]').addEventListener('click',()=>{if(valid)send(asset().dimensions.widthMm);});
    card.querySelector('[data-lock-proportions]').addEventListener('change',()=>{if(!valid||!card.querySelector('[data-lock-proportions]').checked)return;card.querySelector('[data-size=widthMm]').dispatchEvent(new Event('input'));});
    paper();
  });
}
