/** Runs identically in the preview and Chromium PDF document. No project data or UI state. */
export async function paginateArchitecturePages() {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map(img=>img.decode?.().catch(()=>{})||Promise.resolve()));
  const pageHost=document.getElementById('report-pages'),flow=document.getElementById('report-flow');
  if(!pageHost||!flow)return;
  const title=document.body.dataset.projectTitle||'Architecture Research';
  const board=document.body.classList.contains('template-board');
  let body=null,pageNumber=0;
  const makePage=sectionTitle=>{
    pageNumber++;
    const page=document.createElement('article');page.className='report-sheet';
    const header=document.createElement('header');header.className='report-page-header';header.textContent=title+' / '+sectionTitle;
    body=document.createElement('div');body.className='report-page-body';
    const footer=document.createElement('footer');footer.className='report-page-footer';footer.textContent='Architecture Helping Hand · '+pageNumber;
    page.append(header,body,footer);pageHost.append(page);
  };
  const fits=()=>body.scrollHeight<=body.clientHeight+1;
  const put=(node,sectionTitle)=>{
    if(!body)makePage(sectionTitle);
    if(node.dataset.pageBreak==='true'){makePage(sectionTitle);return;}
    body.append(node);
    if(fits())return;
    node.remove();
    if(body.children.length){makePage(sectionTitle);body.append(node);if(fits())return;node.remove();}
    if(node.classList.contains('report-text') || node.classList.contains('report-copy-block') || /^H[1-3]$/.test(node.tagName) || node.tagName==='BLOCKQUOTE') {
      let text=node.textContent||'';
      while(text.length) {
        const part=node.cloneNode(false);body.append(part);
        let low=1,high=text.length,best=0;
        while(low<=high){const middle=Math.floor((low+high)/2);part.textContent=text.slice(0,middle);if(fits()){best=middle;low=middle+1;}else high=middle-1;}
        if(!best){part.remove();throw new Error('A text block cannot fit this page size. Shorten the text or choose a larger page.');}
        let end=best;
        if(end<text.length){const space=text.lastIndexOf(' ',best);if(space>best*.65)end=space;}
        part.textContent=text.slice(0,end);text=text.slice(end).trimStart();
        if(text.length)makePage(sectionTitle);
      }
    } else if(node.tagName==='TABLE') {
      const rows=Array.from(node.querySelectorAll('tbody tr'));
      let table=node.cloneNode(true);table.querySelector('tbody').replaceChildren();body.append(table);
      for(const row of rows){table.querySelector('tbody').append(row);if(!fits()){row.remove();makePage(sectionTitle);table=node.cloneNode(true);table.querySelector('tbody').replaceChildren(row);body.append(table);if(!fits())throw new Error('A table row cannot fit this page size. Shorten the row or choose a larger page.');}}
    } else if(node.tagName==='FIGURE') {
      const caption=node.querySelector('figcaption');
      if(caption){caption.remove();body.append(node);if(!fits())throw new Error('A figure cannot fit this page size. Choose a larger page.');caption.classList.add('report-text');put(caption,sectionTitle);}
      else throw new Error('A visual cannot fit this page size. Choose a larger page.');
    } else {throw new Error('A document block cannot fit this page size. Choose a larger page.');}
  };
  for(const section of Array.from(flow.children)) {
    const name=section.dataset.sectionTitle||'';
    if(!board&&body&&body.children.length)makePage(name);
    for(const child of Array.from(section.children))put(child,name);
  }
  flow.remove();
  document.querySelectorAll('.report-page-footer').forEach((footer,index)=>footer.textContent=title+' · '+(index+1)+' / '+pageNumber);
  document.body.dataset.pageCount=String(pageNumber);
  window.__reportReady=true;
  window.parent?.postMessage({type:'ahh-report-pagination',pages:pageNumber,height:document.documentElement.scrollHeight},'*');
}
