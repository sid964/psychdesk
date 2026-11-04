/* Free, local document-to-note preparation. Never uploads an imported file or starts OCR. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const h=core.esc, $=s=>document.querySelector(s);
let active=0,draft=null;
const VALID=/\.(?:txt|md|markdown|pdf)$/i;
function open(){
 active++;draft=null;const ticket=active;
 core.openModal('Prepare a document','<div class="studio-outline-editor"><p>Choose a local text, Markdown, or text-based PDF file. PsychDesk reads it in your browser; it does not upload the original file. You decide whether to save the extracted text as a separate notebook note.</p><label for="studioImportFile" class="studio-file-label">Choose a file</label><input id="studioImportFile" type="file" accept=".txt,.md,.markdown,.pdf,application/pdf,text/plain,text/markdown"><p id="studioImportStatus" role="status">Nothing selected yet.</p><div id="studioImportPreview" hidden><label for="studioImportText">Extracted text (editable)</label><textarea id="studioImportText" rows="14" maxlength="100000" spellcheck="false"></textarea><div class="studio-actions"><button type="button" class="primary" id="studioSaveImport">Save extracted text as note</button><button type="button" class="secondary" id="studioCopyImport">Copy text</button></div><p class="note">The original file remains where you selected it. For storing the original PDF, use the existing Subject Library and Drive tools.</p></div></div>');
 const file=$('#studioImportFile');
 if(file)file.addEventListener('change',()=>loadFile(file.files?.[0],ticket));
 $('#studioSaveImport')?.addEventListener('click',()=>save(ticket));
 $('#studioCopyImport')?.addEventListener('click',()=>{const text=$('#studioImportText')?.value||'';if(text&&navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>core.toast('Extracted text copied')).catch(()=>core.toast('Copy unavailable'));});
}
async function extractPDF(file){
 const url='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';
 const pdfjs=await import(url);
 pdfjs.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
 const bytes=new Uint8Array(await file.arrayBuffer());
 const task=pdfjs.getDocument({data:bytes,useSystemFonts:true});
 const pdf=await task.promise;
 try{
  const pages=Math.min(60,pdf.numPages),parts=[];
  for(let n=1;n<=pages;n++){
   const page=await pdf.getPage(n);
   const text=await page.getTextContent();
   const joined=text.items.map(item=>String(item.str||'')+(item.hasEOL?'\n':' ')).join('').trim();
   if(joined)parts.push('[Page '+n+']\n'+joined);
   if(parts.join('\n').length>90000)break;
  }
  if(!parts.length)throw Error('No selectable text found. This may be a scanned document; local OCR is not available.');
  return {body:parts.join('\n\n').slice(0,100000),pagesRead:pages,totalPages:pdf.numPages};
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
  else result={body:(await file.text()).slice(0,100000),pagesRead:null,totalPages:null};
  if(ticket!==active||core.getStorageKey()!==owner||!$('#studioImportText'))return;
  if(!result.body.trim())throw Error('The document contains no readable text.');
  draft={owner,fileName:file.name,kind:/\.pdf$/i.test(file.name)?'pdf':'text',pages:result.pagesRead,sourceBytes:file.size};
  $('#studioImportText').value=result.body;
  preview.hidden=false;
  status.textContent='Extracted '+result.body.length.toLocaleString()+' text characters'+(result.pagesRead?' from up to '+result.pagesRead+' of '+result.totalPages+' PDF pages':'')+'. Review before saving.';
 }catch(error){
  if(ticket!==active||!$('#studioImportStatus'))return;
  status.textContent='Could not extract text: '+String(error?.message||error).slice(0,250)+'. Your file was not modified or uploaded.';
 }
}
function save(ticket){
 if(ticket!==active||!draft||draft.owner!==core.getStorageKey()){core.toast('Account changed. Select the file again.');return;}
 const body=$('#studioImportText')?.value?.trim();
 if(!body){core.toast('No text to save.');return;}
 const date=new Date().toISOString(),name=String(draft.fileName||'Document').slice(0,100);
 const record={id:core.id(),title:'Study material · '+name,body:body.slice(0,100000),tags:'extracted-document',subjectId:'',createdAt:date,updatedAt:date,sourceInfo:{kind:draft.kind,originalName:name,pagesRead:draft.pages,sourceBytes:draft.sourceBytes,originalFileStored:false}};
 const ok=core.commitChange(d=>d.notes.unshift(record));
 if(!ok){core.toast('Save failed. Extracted text remains available in the preview.');return;}
 draft=null;active++;core.closeModal();core.render();core.toast('Extracted text saved in a separate note. Original file unchanged.');window.PsychDeskAutopilot?.emit?.('material.imported',{noteId:record.id});window.PsychDeskAutopilot?.scan?.();
}
window.PsychDeskImport={open};
})();