/* Smart Ink: private, on-device handwriting recognition + editable neat handwriting.
   Source strokes always remain untouched. Native recognition when available; otherwise
   a user-triggered local TrOCR model (first-run download, no server-side API/key). */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core)return;
const MODEL='Xenova/trocr-small-handwritten';
const LIBRARY='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const MAX_LINES=30, MAX_TEXT=24000, ACCOUNT_SAFE_BYTES=690000;
const el=id=>document.getElementById(id);
const ink=()=>window.PsychDeskInk;
const page=()=>ink()?.getActive?.();
const esc=value=>core.esc(String(value??''));
const size=value=>new TextEncoder().encode(JSON.stringify(value)).length;
let pipelinePromise=null, inProgress=false, reviewId='', recognisedText='', reviewHash='';
const allowChars=s=>String(s||'').replace(/\r\n?/g,'\n').slice(0,MAX_TEXT);
function fingerprint(note){
 const raw=JSON.stringify(note?.strokes||[]);
 let hash=2166136261;
 for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619)>>>0;
 return String(hash>>>0);
}
function lineGroups(note){
 const pieces=(note?.strokes||[]).filter(s=>s?.kind!=='highlighter').map(stroke=>{
  const pts=(Array.isArray(stroke?.p)?stroke.p:[]).filter(p=>Array.isArray(p)&&
   Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))).map(p=>[Number(p[0]),Number(p[1]),Number(p[2])||50]);
  if(!pts.length)return null;
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const box={minX:Math.min(...xs),minY:Math.min(...ys),maxX:Math.max(...xs),maxY:Math.max(...ys)};
  if(box.maxY-box.minY>130||box.maxX-box.minX>1130)return null; // long dividers/diagrams
  return {stroke:{...stroke,p:pts},box,cy:(box.minY+box.maxY)/2};
 }).filter(Boolean).sort((a,b)=>a.cy-b.cy);
 const groups=[];
 for(const part of pieces){
  let match=null,dist=Infinity;
  for(const g of groups){
   const d=Math.abs(g.y-part.cy);
   if(d<dist&&d<=31){match=g;dist=d;}
  }
  if(!match){match={y:part.cy,items:[]};groups.push(match);}
  match.items.push(part);
  match.y=match.items.reduce((t,item)=>t+item.cy,0)/match.items.length;
 }
 return groups.sort((a,b)=>a.y-b.y).map(g=>{
  const items=g.items.sort((a,b)=>a.box.minX-b.box.minX);
  const strokes=items.map(p=>p.stroke);
  return {strokes,
   box:{minX:Math.min(...items.map(p=>p.box.minX)),minY:Math.min(...items.map(p=>p.box.minY)),
    maxX:Math.max(...items.map(p=>p.box.maxX)),maxY:Math.max(...items.map(p=>p.box.maxY))}};
 });
}
function cleanText(text){return allowChars(text).split('\n').map(line=>line.replace(/\s+/g,' ').trim()).join('\n').trim();}
function boxImage(group){
 const canvas=document.createElement('canvas'),box=group.box,pad=25;
 const w=Math.max(40,Math.ceil(box.maxX-box.minX+pad*2)),height=Math.max(38,Math.ceil(box.maxY-box.minY+pad*2));
 canvas.width=Math.min(1250,w);canvas.height=Math.min(320,height);
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas recognition is not available.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 // Preserve aspect ratio and pressure while cropping each handwritten text line.
 const scale=Math.min(canvas.width/w,canvas.height/height);
 ctx.translate(Math.max(0,(canvas.width-w*scale)/2),Math.max(0,(canvas.height-height*scale)/2));
 ctx.scale(scale,scale);
 ctx.translate(-box.minX+pad,-box.minY+pad);
 for(const stroke of group.strokes)ink().drawStroke(ctx,stroke);
 return canvas.toDataURL('image/png');
}
async function nativeRecognize(groups,notify){
 if(typeof navigator.createHandwritingRecognizer!=='function'||typeof HandwritingStroke!=='function')return null;
 let recognizer;
 try{
  recognizer=await navigator.createHandwritingRecognizer({languages:['en']});
  const results=[];
  for(let i=0;i<groups.length;i++){
   notify('Reading line '+(i+1)+' of '+groups.length+' on this device…');
   const drawing=recognizer.startDrawing({recognitionType:'text',inputType:'stylus'});
   for(const stroke of groups[i].strokes){
    const input=new HandwritingStroke();
    stroke.p.forEach((p,index)=>input.addPoint({x:p[0],y:p[1],t:index*12}));
    drawing.addStroke(input);
   }
   const predictions=await drawing.getPrediction();
   results.push(cleanText(predictions?.[0]?.text||'')||'[Line '+(i+1)+' unclear — check your handwriting]');
   drawing.clear?.();
  }
  return results.join('\n');
 }catch{return null;} // Platform may expose the API but not support this language.
 finally{recognizer?.finish?.();}
}
async function loadModel(notify){
 if(!pipelinePromise){
  pipelinePromise=(async()=>{
   notify('Loading the handwriting reader on this device (first use downloads about 120 MB)…');
   const {pipeline,env}=await import(LIBRARY);
   env.allowLocalModels=false;
   return pipeline('image-to-text',MODEL,{progress_callback:progress=>{
    if(progress?.status==='progress'&&Number.isFinite(progress.progress))notify('Downloading handwriting model · '+Math.round(progress.progress)+'%');
   }});
  })().catch(error=>{pipelinePromise=null;throw error;});
 }
 return pipelinePromise;
}
async function modelRecognize(groups,notify,pipeOverride){
 const pipe=pipeOverride||await loadModel(notify),out=[];
 for(let i=0;i<groups.length;i++){
  notify('Reading handwritten line '+(i+1)+' of '+groups.length+'…');
  const data=await pipe(boxImage(groups[i]));
  const candidate=Array.isArray(data)?data[0]?.generated_text:data?.generated_text;
  out.push(cleanText(candidate||'')||'[Line '+(i+1)+' unclear — correct here]');
 }
 return out.join('\n');
}
async function transcribe(note,{notify=()=>{},pipeOverride=null,nativeOverride=null}={}){
 const groups=lineGroups(note);
 if(!groups.length)throw Error('This page has no clear pen writing yet. Write a few words first.');
 if(groups.length>MAX_LINES)throw Error('This page has many handwritten lines. Split it into smaller ink pages for accurate recognition.');
 if(nativeOverride){return cleanText(await nativeOverride(groups,notify));}
 if(!pipeOverride){
  const native=await nativeRecognize(groups,notify);
  if(native?.trim())return cleanText(native);
 }
 return cleanText(await modelRecognize(groups,notify,pipeOverride));
}
function panelMarkup(note){
 return '<section class="ink-smart-panel" id="inkSmartPanel" aria-label="Neaten handwriting and convert to a study note">'+
 '<div class="ink-smart-head"><div><strong>Neaten handwriting</strong><p>Your ink stays safe. Check the recognized words before saving.</p></div>'+
 '<button type="button" class="ink-smart-close" data-inksmart="close" aria-label="Close handwriting preview">✕</button></div>'+
 '<p role="status" aria-live="polite" class="ink-smart-status" id="inkSmartStatus">Preparing your handwriting…</p>'+
 '<div class="ink-smart-columns"><div class="ink-smart-edit"><label for="inkSmartText">Recognized text — edit any mistakes</label>'+
 '<textarea id="inkSmartText" rows="8" maxlength="'+MAX_TEXT+'" spellcheck="true" placeholder="Your handwritten words will appear here. You can correct them before saving."></textarea>'+
 '<small>English handwriting only. Diagrams, equations and very cursive writing may need corrections.</small></div>'+
 '<div class="ink-smart-paper-wrap"><span class="ink-smart-preview-label">Your neat handwriting</span><div class="ink-smart-paper" id="inkSmartPretty" aria-label="Neat handwritten preview"></div></div></div>'+
 '<div class="ink-smart-actions"><button type="button" class="secondary" data-inksmart="retry">↻ Read handwriting again</button>'+
 '<button type="button" class="secondary" data-inksmart="save-neat">Save neat version</button>'+
 '<button type="button" class="primary" data-inksmart="save-note">✓ Save as Study Note</button></div>'+
 '<p class="ink-smart-privacy">Recognition happens on your device. If your browser lacks a built-in handwriting reader, the first use downloads a large free model. No handwriting is sent to an OCR server. Recognition can make mistakes; review before saving.</p>'+
 '</section>';
}
function status(message,kind){
 const node=el('inkSmartStatus');
 if(node){node.textContent=message;node.dataset.state=kind||'neutral';}
}
function updatePreview(){
 const text=el('inkSmartText')?.value||'';
 const view=el('inkSmartPretty');
 if(view)view.textContent=text||'Your polished handwriting will appear here.';
 recognisedText=text;
}
function close(){
 const node=el('inkSmartPanel');if(node)node.remove();
 reviewId='';inProgress=false;
}
async function recognizeCurrent(){
 const note=page(),id=note?.id;
 if(!note||!el('inkSmartPanel')||inProgress)return;
 inProgress=true;
 const revision=fingerprint(note);
 const retry=el('inkSmartPanel')?.querySelector('[data-inksmart="retry"]');
 if(retry)retry.disabled=true;
 status('Reading handwriting locally…');
 try{
  const text=await transcribe(note,{notify:message=>status(message)});
  if(page()?.id!==id||!el('inkSmartPanel'))return;
  if(revision!==fingerprint(page())){status('The page changed while reading. Review your newest strokes and recognize again.','warn');return;}
  const area=el('inkSmartText');
  if(area){area.value=text;updatePreview();}
  reviewHash=revision;
  status('Handwriting recognized. Correct any words, then save the neat page or turn it into a Study Note.','success');
 }catch(error){
  if(page()?.id===id&&el('inkSmartPanel')){
   status('Could not recognize automatically: '+String(error?.message||error).slice(0,170)+'. You can type a correction below or retry.','warn');
  }
 }finally{inProgress=false;if(retry?.isConnected)retry.disabled=false;}
}
function open(){
 const note=page();
 if(!note)return;
 close();
 reviewId=note.id;
 const container=el('inkSmartMount');if(!container)return;
 container.innerHTML=panelMarkup(note);
 const panel=el('inkSmartPanel');
 panel?.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 const prior=typeof note.neatText==='string'&&note.neatText.trim();
 if(prior){
  el('inkSmartText').value=note.neatText;
  reviewHash=note.neatInkHash||'';
  updatePreview();
  if(reviewHash===fingerprint(note))status('Your saved neat handwriting is ready. Edit it or save as a Study Note.','success');
  else status('You added or changed ink after the neat version. Tap “Read handwriting again” to include the latest writing.','warn');
  return;
 }
 void recognizeCurrent();
}
function safelyStoreNeat(note,text){
 const previous={text:note.neatText,hash:note.neatInkHash,updatedAt:note.updatedAt};
 note.neatText=text;note.neatInkHash=fingerprint(note);
 if(ink().saveChange(note,()=>{if(previous.text===undefined)delete note.neatText;else note.neatText=previous.text;if(previous.hash===undefined)delete note.neatInkHash;else note.neatInkHash=previous.hash;},'Neat handwriting saved'))return true;
 note.updatedAt=previous.updatedAt;
 return false;
}
function saveNeat(){
 const note=page(),area=el('inkSmartText');
 if(!note||!area)return;
 const text=allowChars(area.value).trim();
 if(!text){status('No words to save. Recognize or type your note first.','warn');return;}
 if(!safelyStoreNeat(note,text)){status('Not enough storage for the neat copy. Export or shorten this page.','warn');return;}
 reviewHash=fingerprint(note);
 status('Neat handwriting saved with the original ink page.','success');
 core.toast('Neat handwriting saved. Original strokes preserved.');
}
function saveToNotes(){
 const note=page(),area=el('inkSmartText');
 if(!note||!area)return;
 const text=allowChars(area.value).trim();
 if(!text){status('Recognize the handwriting or enter corrected text before saving.','warn');return;}
 const d=core.getData(),now=new Date().toISOString(),title=(note.title||'Ink note').slice(0,120);
 d.notes=Array.isArray(d.notes)?d.notes:[];
 if(d.notes.some(n=>n.inkSourceId===note.id&&n.body===text)){
  status('This transcription is already saved in Study Notes.','success');core.toast('Already in Study Notes.');return;
 }
 const draft={id:core.id(),title,title: title==='Untitled ink note'?'Handwritten study note':title,
  body:text,tags:'ink, handwriting',subjectId:note.subjectId||'',inkSourceId:note.id,createdAt:now,updatedAt:now};
 const previous={text:note.neatText,hash:note.neatInkHash,updatedAt:note.updatedAt};
 d.notes.unshift(draft);note.neatText=text;note.neatInkHash=fingerprint(note);note.updatedAt=now;
 if(size(d)>ACCOUNT_SAFE_BYTES||core.save()===false){
  d.notes.shift();if(previous.text===undefined)delete note.neatText;else note.neatText=previous.text;
  if(previous.hash===undefined)delete note.neatInkHash;else note.neatInkHash=previous.hash;
  note.updatedAt=previous.updatedAt;
  status('Could not save: study storage is nearly full. Export a backup or shorten the note.','warn');
  return;
 }
 close();core.setTab('notes');
 core.toast('Converted to Study Notes. Original handwriting is safe in Ink Notes.');
}
function openSource(sourceId){
 const source=(core.getData().inkNotes||[]).find(n=>n.id===sourceId);
 if(!source){core.toast('Original ink page was not found.');return;}
 ink().openPage(sourceId);
}
document.addEventListener('click',e=>{
 const btn=e.target.closest('[data-inksmart]');if(!btn)return;
 e.preventDefault();
 const action=btn.dataset.inksmart;
 if(action==='close')close();
 if(action==='retry')void recognizeCurrent();
 if(action==='save-neat')saveNeat();
 if(action==='save-note')saveToNotes();
 if(action==='source')openSource(btn.dataset.id);
});
document.addEventListener('input',e=>{if(e.target?.id==='inkSmartText')updatePreview();});
window.addEventListener('psychdesk:tab-changed',e=>{if(e.tab!=='ink')close();});
window.addEventListener('psychdesk:session-reset',()=>{close();recognisedText='';reviewHash='';});
window.PsychDeskSmartInk={open,close,transcribe,lineGroups,fingerprint,cleanText,modelRecognize,saveToNotes,saveNeat,openSource};
})();