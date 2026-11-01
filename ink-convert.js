/* Ink → Neat handwriting → editable notebook note.
   Recognition is explicitly initiated by the student; no ink goes to a remote API.
   Native handwriting recognition is preferred; TrOCR runs locally in the browser,
   downloading model assets on first use. No recognition text is saved until approved. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const esc=core.esc;
const MODEL_URL='https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
const MODEL_ID='Xenova/trocr-small-handwritten';
const PAGE_W=1200,PAGE_H=1600,MAX_LINES=22,MAX_TEXT=12000,SYNC_BUDGET=685000;
let modelPromise=null,busy=false,requestVersion=0,conversionNoteId='';
const active=()=>window.PsychDeskInk?.getActive?.()||null;
const byId=id=>document.getElementById(id);
const size=data=>new TextEncoder().encode(JSON.stringify(data)).length;
function inkStrokes(note){
 return (Array.isArray(note?.strokes)?note.strokes:[]).filter(s=>
  s?.kind==='pen'&&Array.isArray(s.p)&&s.p.some(p=>Array.isArray(p)&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])))
 );
}
function safePoints(s){
 return (Array.isArray(s?.p)?s.p:[]).filter(p=>Array.isArray(p)&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1])))
 .map(p=>[Math.max(0,Math.min(PAGE_W,Number(p[0]))),Math.max(0,Math.min(PAGE_H,Number(p[1]))),Number(p[2])||50]);
}
function groupLines(strokes,maxLines=MAX_LINES){
 const ink=strokes.map(s=>{
  const p=safePoints(s);if(!p.length)return null;
  const ys=p.map(t=>t[1]);return {stroke:s,center:(Math.min(...ys)+Math.max(...ys))/2,minY:Math.min(...ys),maxY:Math.max(...ys)};
 }).filter(Boolean).sort((a,b)=>a.center-b.center);
 const groups=[];
 for(const entry of ink){
  let best=null,dist=Infinity;
  for(const group of groups){
   const d=Math.abs(group.center-entry.center);
   if(d<dist){dist=d;best=group;}
  }
  if(best&&dist<=52){
   best.items.push(entry);best.center=best.items.reduce((acc,x)=>acc+x.center,0)/best.items.length;
  }else groups.push({center:entry.center,items:[entry]});
 }
 return groups.sort((a,b)=>a.center-b.center).slice(0,maxLines).map(g=>g.items.map(x=>x.stroke));
}
function renderLineImage(strokes,doc=document){
 const entries=strokes.flatMap(s=>safePoints(s)),canvas=doc.createElement('canvas');
 if(!entries.length)throw Error('No visible handwriting was found.');
 const xs=entries.map(p=>p[0]),ys=entries.map(p=>p[1]);
 const left=Math.max(0,Math.min(...xs)-25),top=Math.max(0,Math.min(...ys)-24);
 const right=Math.min(PAGE_W,Math.max(...xs)+25),bottom=Math.min(PAGE_H,Math.max(...ys)+24);
 const w=Math.max(70,right-left),h=Math.max(36,bottom-top);
 const scale=Math.min(2,1100/w,260/h);
 canvas.width=Math.max(84,Math.round(w*scale));
 canvas.height=Math.max(42,Math.round(h*scale));
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Handwriting canvas is unavailable.');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.save();ctx.scale(scale,scale);ctx.translate(-left,-top);
 for(const stroke of strokes){
  const s={...stroke,c:'#111111',kind:'pen',w:Math.max(3.2,Number(stroke.w)||3.2)};
  window.PsychDeskInk.drawStroke(ctx,s);
 }
 ctx.restore();
 return canvas.toDataURL('image/png');
}
async function recognizeNative(strokes,navigatorRef=navigator,strokeCtor=window.HandwritingStroke){
 if(typeof navigatorRef?.createHandwritingRecognizer!=='function'||typeof strokeCtor!=='function')return null;
 const recognizer=await navigatorRef.createHandwritingRecognizer({languages:['en']});
 let drawing;
 try{
  drawing=recognizer.startDrawing({recognitionType:'text'});
  let count=0;
  for(const s of strokes){
   const points=safePoints(s);
   if(!points.length)continue;
   const line=new strokeCtor();
   for(let i=0;i<points.length;i++)line.addPoint({x:points[i][0],y:points[i][1],t:i*12});
   drawing.addStroke(line);count++;
  }
  if(!count)return null;
  const responses=await drawing.getPrediction();
  const prediction=String(responses?.[0]?.text||'').trim();
  return prediction||null;
 }finally{
  try{drawing?.clear?.()}catch{}
  try{recognizer.finish?.()}catch{}
 }
}
async function localTrOCR(strokes,status,dependencies={}){
 if(!modelPromise){
  modelPromise=(async()=>{
   status('Downloading the handwriting model for local recognition. The first download can be large.');
   const module=dependencies.load?await dependencies.load():await import(MODEL_URL);
   if(typeof module.pipeline!=='function')throw Error('Handwriting model failed to load.');
   return module.pipeline('image-to-text',MODEL_ID,{device:'wasm',dtype:'q8'});
  })().catch(err=>{modelPromise=null;throw err;});
 }
 const model=await modelPromise;
 const lines=groupLines(strokes);
 if(!lines.length)throw Error('Write a few words on the page first.');
 if(lines.length>=MAX_LINES)status('Recognizing the first '+MAX_LINES+' writing lines. Export additional pages separately.');
 const transcript=[];
 for(let i=0;i<lines.length;i++){
  status('Recognizing handwritten line '+(i+1)+' of '+lines.length+' on this device…');
  const image=renderLineImage(lines[i],dependencies.document||document);
  const result=await model(image,{max_new_tokens:160});
  const value=String(Array.isArray(result)?result[0]?.generated_text||'':result?.generated_text||'').trim();
  if(value)transcript.push(value);
 }
 return transcript.join('\n').trim();
}
function panel(note){
 const text=typeof note?.neatText==='string'?note.neatText.slice(0,MAX_TEXT):'';
 const hasText=Boolean(text.trim());
 return '<section id="inkConvertPanel" class="ink-convert-panel" aria-label="Handwriting to study notes">'+
 '<div class="ink-convert-heading"><div><span class="ink-eyebrow">INK → NEAT HANDWRITING → NOTES</span>'+
 '<h2>Turn writing into notes.</h2><p>Recognize your pen strokes, fix any words, then save a polished handwritten version or editable study note.</p></div>'+
 '<button type="button" class="ink-convert-start" data-ink-convert="recognize">✦ Make it neat</button></div>'+
 '<p class="ink-convert-privacy">Recognition runs on your device. If your browser has no built-in handwriting recognizer, a free model is downloaded on demand (potentially over 100 MB). Your handwriting is not uploaded to an OCR service.</p>'+
 '<p id="inkConvertMessage" class="ink-convert-message" role="status" aria-live="polite">'+
 (hasText?'Your last approved neat version is ready. You can edit it before creating a note.':'Your original ink stays untouched. Recognition is optional and may misread psychology terms.')+'</p>'+
 '<div class="ink-convert-review" id="inkConvertReview"'+(hasText?'':' hidden')+'>'+
 '<label for="inkRecognizedText">Review the text <small>Fix any words or technical terms before saving</small></label>'+
 '<textarea id="inkRecognizedText" rows="5" maxlength="'+MAX_TEXT+'" spellcheck="true" placeholder="Your handwriting will appear here. You can also type or correct the text yourself.">'+esc(text)+'</textarea>'+
 '<div class="ink-neat-heading">Neat handwritten preview <small>Re-typeset in handwriting style; your original strokes stay editable</small></div>'+
 '<div class="ink-neat-preview" id="inkNeatPreview" aria-label="Neater handwriting preview">'+esc(text)+'</div>'+
 '<div class="ink-convert-actions"><button type="button" data-ink-convert="saveNeat" class="secondary">Save neat version</button>'+
 '<button type="button" data-ink-convert="saveNote" class="primary">Save as study note →</button></div>'+
 '<p class="ink-convert-disclaimer">Please verify recognition: psychologists, dates, abbreviations and formulas can be misread. Save as a study note only after checking.</p>'+
 '</div></section>';
}
function message(text){const node=byId('inkConvertMessage');if(node)node.textContent=text;}
function review(value){
 const area=byId('inkConvertReview'),input=byId('inkRecognizedText'),preview=byId('inkNeatPreview');
 if(!area||!input||!preview)return;
 area.hidden=false;input.value=String(value||'').slice(0,MAX_TEXT);
 preview.textContent=input.value||'Your polished handwriting will appear here.';
}
function currentText(){
 return String(byId('inkRecognizedText')?.value||'').replace(/\r\n?/g,'\n').trim().slice(0,MAX_TEXT);
}
function clearBusy(){
 busy=false;const button=document.querySelector('[data-ink-convert="recognize"]');if(button)button.disabled=false;
}
async function runRecognition(){
 if(busy)return false;
 const page=active();
 if(!page||!inkStrokes(page).length){message('Write a few pen strokes first, then choose Make it neat.');return false;}
 const id=page.id,uid=window.PsychDeskFirebase?.getUserId?.()||'guest',stamp=++requestVersion;
 busy=true;
 const button=document.querySelector('[data-ink-convert="recognize"]');if(button)button.disabled=true;
 const report=value=>{if(active()?.id===id&&requestVersion===stamp)message(value);};
 try{
  const strokes=inkStrokes(page);
  let text;
  report('Checking your browser for handwriting recognition…');
  try{text=await recognizeNative(strokes);}catch{ /* Fall back to on-device TrOCR. */ }
  if(!text)text=await localTrOCR(strokes,report);
  if(stamp!==requestVersion||active()?.id!==id||(window.PsychDeskFirebase?.getUserId?.()||'guest')!==uid)return false;
  if(!text)throw Error('No words were recognized.');
  review(text);
  report('Recognized text is ready. Edit errors below, preview the neat handwriting, then choose how to save.');
  return true;
 }catch(error){
  if(stamp!==requestVersion||active()?.id!==id)return false;
  review(byId('inkRecognizedText')?.value||page.neatText||'');
  report('Automatic recognition is unavailable or unclear ('+String(error?.message||error).slice(0,160)+'). You can type a correction in the review box and still create your note. No ink was lost.');
  return false;
 }finally{clearBusy();}
}
function saveNeatText(note,text){
 if(!note||!text.trim())return {ok:false,reason:'Review or enter some text before saving.'};
 const old=note.neatText;
 note.neatText=text.slice(0,MAX_TEXT);
 const ok=window.PsychDeskInk?.saveChange?.(note,()=>{if(old===undefined)delete note.neatText;else note.neatText=old;},'Neat handwriting saved');
 return {ok:ok===true,reason:ok?'':'Your storage is full. Export a copy before saving.'};
}
function toStudyNote(note,text){
 const cleaned=String(text||'').trim().slice(0,MAX_TEXT);
 if(!note||!cleaned)return {ok:false,reason:'Review or enter the recognized handwriting before saving.'};
 const d=core.getData();d.notes=Array.isArray(d.notes)?d.notes:[];
 const original=d.notes.find(n=>n.inkSourceId===note.id);
 if(original&&!confirm('This page already has a linked typed note. Replace the text in that note with your reviewed version?'))return {ok:false,reason:'Existing typed note was left unchanged.'};
 const previous=original?{...original}:null,now=new Date().toISOString();
 const entry=original||{id:core.id(),createdAt:now};
 Object.assign(entry,{
  title:(note.title||'Handwritten study note').slice(0,140),
  body:cleaned,subjectId:note.subjectId||'',tags:original?.tags||'handwriting, ink notes',
  inkSourceId:note.id,updatedAt:now
 });
 if(!original)d.notes.unshift(entry);
 if(size(d)>SYNC_BUDGET){
  if(original)Object.assign(original,previous);else d.notes.shift();
  return {ok:false,reason:'Study storage is nearly full. Export an ink page or JSON backup first.'};
 }
 if(core.save()===false){
  if(original)Object.assign(original,previous);else d.notes.shift();
  return {ok:false,reason:'Browser storage is unavailable. Your existing notes were not changed.'};
 }
 return {ok:true,note:entry,updated:Boolean(original)};
}
function onClick(event){
 const control=event.target.closest('[data-ink-convert]');
 if(!control)return;
 event.preventDefault();
 const action=control.dataset.inkConvert;
 if(action==='recognize'){void runRecognition();return;}
 const page=active(),text=currentText();
 if(!page)return;
 if(action==='saveNeat'){
  const result=saveNeatText(page,text);
  message(result.ok?'Neat handwriting saved to this ink page. Your original pen strokes are preserved.':result.reason);
 }
 if(action==='saveNote'){
  const result=toStudyNote(page,text);
  if(!result.ok){message(result.reason);return;}
  message('Study note saved with a link back to this ink page.');
  core.setTab('notes');
  if(window.PsychDeskCloud?.noteEditor)window.PsychDeskCloud.noteEditor(result.note);
  core.toast(result.updated?'Linked study note updated.':'Converted to an editable study note.');
 }
}
document.addEventListener('click',onClick);
document.addEventListener('input',event=>{
 if(event.target?.id==='inkRecognizedText'){
  const preview=byId('inkNeatPreview');
  if(preview)preview.textContent=event.target.value||'Your polished handwriting will appear here.';
 }
});
window.addEventListener('psychdesk:tab-changed',event=>{
 if(event.tab!=='ink'){requestVersion++;clearBusy();}
});
window.addEventListener('psychdesk:session-reset',()=>{requestVersion++;clearBusy();});
window.PsychDeskInkConvert={panel,runRecognition,recognizeNative,groupLines,safePoints,renderLineImage,saveNeatText,toStudyNote,MODEL_ID};
})();