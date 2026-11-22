/* Native desktop PDF viewer: a fast alternative to the annotated PDF.js reader.
   PDF bytes remain in the browser and are never published to GitHub. */
(()=>{'use strict';
const core=window.PsychDeskCore, cloud=window.PsychDeskCloud;
if(!core)return;
const h=core.esc;
let objectUrl='',title='',materialId='',page=1,busy=false,error='',epoch=0;
const materials=()=>core.getData().materials||[];
function bookmark(id){
 const saved=(core.getData().pdfReading||[]).find(row=>row.materialId===id);
 return Number.isInteger(saved?.page)&&saved.page>0?saved.page:1;
}
function savePage(){
 if(!materialId)return;
 core.commitChange(data=>{
  data.pdfReading ||= [];
  const i=data.pdfReading.findIndex(row=>row.materialId===materialId);
  const value={materialId,page};
  if(i<0)data.pdfReading.push(value);else data.pdfReading[i]={...data.pdfReading[i],page};
 });
}
function reset(){
 epoch++;
 if(objectUrl)URL.revokeObjectURL(objectUrl);
 objectUrl='';title='';materialId='';page=1;busy=false;error='';
}
async function show(blob,name,id=''){
 if(!(blob instanceof Blob))throw Error('Could not read this PDF file.');
 if(!blob.size)throw Error('This PDF file is empty.');
 if(!/\.pdf$/i.test(name||'')&&blob.type&&blob.type!=='application/pdf')throw Error('Choose a PDF document.');
 if(objectUrl)URL.revokeObjectURL(objectUrl);
 objectUrl=URL.createObjectURL(blob);
 title=String(name||'PDF document');
 materialId=id;
 page=id?bookmark(id):1;
 busy=false;error='';
 core.render();
}
async function open(id){
 const item=materials().find(x=>x.id===id&&x.kind==='pdf');
 if(!item){core.toast('PDF not found in your library.');return;}
 const version=++epoch;
 busy=true;error='';title=item.title||item.fileName||'PDF';materialId=item.id;
 core.setTab('reader-fast');
 try{
  if(!item.driveId)throw Error('This file is not linked to your Google Drive.');
  if(!cloud?.fetchStudyMaterial)throw Error('Google Drive reader is unavailable.');
  const blob=await cloud.fetchStudyMaterial(item.driveId);
  if(version!==epoch)return;
  await show(blob,title,item.id);
 }catch(e){if(version===epoch){busy=false;error=String(e?.message||e);core.render();}}
}
function sourceList(){
 const files=materials().filter(x=>x.kind==='pdf'&&x.driveId);
 return '<section class="fast-pdf-library"><h2>Choose a Drive PDF</h2>'+
  (files.length?'<div class="fast-pdf-files">'+files.map(f=>'<button type="button" data-fast-pdf="open" data-id="'+h(f.id)+'">'+h(f.title||f.fileName||'Untitled PDF')+'</button>').join('')+'</div>':'<p>Upload a PDF through Drive files, or open a document stored on this computer.</p>')+'</section>';
}
function render(){
 const available=Boolean(objectUrl);
 const src=available?objectUrl+'#page='+page+'&view=FitH':'';
 return '<section class="fast-pdf-workspace"><header class="fast-pdf-header">'+
  '<div><p class="desk-kicker">DESKTOP READING</p><h1>PDF reader</h1><p>Read your PDF documents with smooth scrolling, zoom and search.</p></div>'+
  '<label class="desk-add-book">Open PDF from computer<input id="fastPdfFileInput" type="file" accept=".pdf,application/pdf" hidden></label></header>'+
  (busy?'<p class="fast-pdf-status" role="status">Loading '+h(title)+' from Google Drive…</p>':'')+
  (error?'<p class="fast-pdf-error" role="alert">'+h(error)+'</p>':'')+
  (available?'<div class="fast-pdf-toolbar"><strong>'+h(title)+'</strong>'+
   '<label>Page <input id="fastPdfPage" type="number" min="1" value="'+page+'"></label><button type="button" data-fast-pdf="jump">Go</button>'+
   '<a href="'+h(objectUrl)+'" target="_blank" rel="noopener">Open in new tab</a>'+
   '<button type="button" data-fast-pdf="close">Close</button></div>'+
   '<iframe id="fastPdfFrame" title="'+h(title)+' PDF viewer" src="'+h(src)+'" loading="eager"></iframe>'+
   '<p class="fast-pdf-help">Use the viewer toolbar or Ctrl+F to search inside the PDF. Page jump saves your selected position'+(materialId?' with your study data':' for this session')+'. For detailed text highlights, use the annotated PDF reader.</p>':sourceList())+
  '</section>';
}
function afterRender(){}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-fast-pdf]');if(!btn)return;
 e.preventDefault();
 const action=btn.dataset.fastPdf;
 if(action==='open')void open(btn.dataset.id);
 else if(action==='close'){reset();core.render();}
 else if(action==='jump'){
  const value=Number(document.querySelector('#fastPdfPage')?.value);
  if(!Number.isSafeInteger(value)||value<1||value>99999){core.toast('Enter a valid PDF page number.');return;}
  page=value;savePage();core.render();
 }
});
document.addEventListener('change',e=>{
 if(e.target?.id!=='fastPdfFileInput')return;
 const file=e.target.files?.[0];if(!file)return;
 const version=++epoch;
 materialId='';busy=true;error='';title=file.name;core.render();
 Promise.resolve().then(()=>{if(version===epoch)return show(file,file.name);}).catch(err=>{if(version===epoch){busy=false;error=String(err?.message||err);core.render();}});
});
window.addEventListener('psychdesk:session-reset',reset);
window.PsychDeskFastPDF={render,afterRender,open,reset};
})();