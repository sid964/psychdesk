/* Free, local document-to-note preparation. Never uploads an imported file or starts OCR. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc, $=s=>document.querySelector(s);
let active=0,draft=null;
const VALID=/\.(?:txt|md|markdown|pdf)$/i;
function open(){
 active++;draft=null;const ticket=active;
 core.openModal('Prepare a document','<div class="studio-outline-editor"><p>Choose a text, Markdown, or text-based PDF. Extract a short chapter locally and preview a study outline and draft flashcards before saving anything.</p><label for="studioImportFile" class="studio-file-label">Choose a file</label><input id="studioImportFile" type="file" accept=".txt,.md,.markdown,.pdf,application/pdf,text/plain,text/markdown"><div class="phase2-page-range"><label>PDF from page <input id="studioImportFrom" type="number" min="1" max="9999" value="1"></label><label>Through page <input id="studioImportTo" type="number" min="1" max="9999" value="8"></label></div><p id="studioImportStatus" role="status">Up to 12 pages per selection; text/Markdown files use the beginning of the document.</p><div id="studioImportPreview" hidden><label for="studioImportText">Extracted text (editable)</label><textarea id="studioImportText" rows="14" maxlength="100000" spellcheck="false"></textarea><div class="studio-actions"><button type="button" class="primary" id="studioPrepareImport">Prepare chapter</button><button type="button" class="secondary" id="studioSaveImport">Save text as note</button><button type="button" class="secondary" id="studioCopyImport">Copy text</button></div><p class="note">The original file remains where you selected it. For storing the original PDF, use the existing Subject Library and Drive tools.</p></div></div>');
 const file=$('#studioImportFile');
 if(file)file.addEventListener('change',()=>loadFile(file.files?.[0],ticket));
 $('#studioPrepareImport')?.addEventListener('click',()=>prepareNow(ticket));
 $('#studioSaveImport')?.addEventListener('click',()=>save(ticket));
 $('#studioCopyImport')?.addEventListener('click',()=>{const text=$('#studioImportText')?.value||'';if(text&&navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>core.toast('Extracted text copied')).catch(()=>core.toast('Copy unavailable'));});
}
async function extractPDF(file){
 const url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
 const pdfjs=await import(url);
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
 const bytes=new Uint8Array(await file.arrayBuffer());
 const task=pdfjs.getDocument({data:bytes,useSystemFonts:true}),pdf=await task.promise;
 try{
  const rawStart=Number($('#studioImportFrom')?.value||1),rawEnd=Number($('#studioImportTo')?.value||8);
  if(!Number.isInteger(rawStart)||rawStart<1||rawStart>pdf.numPages||!Number.isInteger(rawEnd)||rawEnd<rawStart){
   throw Error('Choose a valid start/end page within this '+pdf.numPages+'-page PDF.');
  }
  const from=rawStart,to=Math.min(pdf.numPages,rawEnd,from+11),parts=[];
  let length=0,truncated=to<rawEnd;
  for(let n=from;n<=to;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();
   const joined=content.items.map(item=>String(item.str||'')+(item.hasEOL?'\n':' ')).join('').trim();
   if(!joined)continue;
   const chunk='[Page '+n+']\n'+joined+'\n';
   if(length+chunk.length>42000){parts.push(chunk.slice(0,Math.max(0,42000-length)));truncated=true;break;}
   parts.push(chunk);length+=chunk.length;
  }
  const body=parts.join('\n').slice(0,42000);
  if(!body.trim())throw Error('No selectable text in these pages. Scanned PDFs require external OCR.');
  return {body,pagesRead:to-from+1,totalPages:pdf.numPages,pageStart:from,pageEnd:to,truncated};
 }finally{await pdf.destroy().catch(()=>{});}
}
async function loadFile(file,ticket){
 const status=$('#studioImportStatus'),owner=core.getStorageKey();
 const preview=$('#studioImportPreview');
 if(!status||!file)return;
 preview.hidden=true;draft=null;
 if(!VALID.test(file.name)||file.size>30*1024*1024){status.textContent='Choose a supported file up to 30 MB. No file was stored.';return;}
 status.textContent='Reading locally…';
 try{
  let result;
  if(/\.pdf$/i.test(file.name))result=await extractPDF(file);
  else {const full=await file.text();result={body:full.slice(0,42000),pagesRead:null,totalPages:null,pageStart:0,pageEnd:0,truncated:full.length>42000};}
  if(ticket!==active||core.getStorageKey()!==owner||!$('#studioImportText'))return;
  if(!result.body.trim())throw Error('The document contains no readable text.');
  draft={owner,fileName:file.name,kind:/\.pdf$/i.test(file.name)?'pdf':'text',pages:result.pagesRead,pageStart:result.pageStart,pageEnd:result.pageEnd,sourceBytes:file.size,truncated:result.truncated};
  $('#studioImportText').value=result.body;
  preview.hidden=false;
  status.textContent='Extracted '+result.body.length.toLocaleString()+' characters'+(result.pagesRead?' from pages '+result.pageStart+'–'+result.pageEnd+' of '+result.totalPages:'')+(result.truncated?' · limited to 12 pages or 42,000 characters':'')+'. Review before preparing or saving.';
 }catch(error){
  if(ticket!==active||!$('#studioImportStatus'))return;
  status.textContent='Could not extract text: '+String(error?.message||error).slice(0,250)+'. Your file was not modified or uploaded.';
 }
}
function prepareNow(ticket){
 if(ticket!==active||!draft||draft.owner!==core.getStorageKey()){core.toast('Choose the file again under your current account.');return;}
 const text=$('#studioImportText')?.value||'';
 if(!text.trim()){core.toast('Nothing to prepare.');return;}
 void window.PsychDeskPreparation?.prepare({
  title:draft.fileName,text,origin:'local-import',pageStart:draft.pageStart||0,pageEnd:draft.pageEnd||0
 });
}
function save(ticket){
 if(ticket!==active||!draft||draft.owner!==core.getStorageKey()){core.toast('Account changed. Select the file again.');return;}
 const body=$('#studioImportText')?.value?.trim();
 if(!body){core.toast('No text to save.');return;}
 const date=new Date().toISOString(),name=String(draft.fileName||'Document').slice(0,100);
 const record={id:core.id(),title:'Study material · '+name,body:body.slice(0,100000),tags:'extracted-document',subjectId:'',createdAt:date,updatedAt:date,sourceInfo:{kind:draft.kind,originalName:name,pagesRead:draft.pages,sourceBytes:draft.sourceBytes,pageStart:draft.pageStart||0,pageEnd:draft.pageEnd||0,originalFileStored:false}};
 const ok=core.commitChange(d=>{d.notes.unshift(record);if(new TextEncoder().encode(JSON.stringify(d)).byteLength>710000)throw Error('Study snapshot nearing its sync limit. Prepare a small outline or copy the text instead.');});
 if(!ok){core.toast('Save failed. Extracted text remains available in the preview.');return;}
 draft=null;active++;core.closeModal();core.render();core.toast('Extracted text saved in a separate note. Original file unchanged.');window.PsychDeskAutopilot?.emit?.('material.imported',{noteId:record.id});window.PsychDeskAutopilot?.scan?.();
}
window.PsychDeskImport={open};
})();