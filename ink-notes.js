/* PsychDesk Ink Notes — vector handwriting using standard Pointer Events.
   Pressure-aware drawing for Windows pens, Android tablets, and touch/mouse fallback.
   Compact user-owned strokes remain in existing local + Firebase account snapshots;
   no external service receives handwriting, and oversized notes never overwrite data. */
(()=>{'use strict';
const core=window.PsychDeskCore;
if(!core)return;
const PAGE_WIDTH=1200,PAGE_HEIGHT=1600,NOTE_LIMIT=170000,WORKSPACE_LIMIT=685000;
const COLORS=['#20252b','#326a99','#b65252','#52735e'];
const h=core.esc;
const data=()=>core.getData();
const notes=()=>Array.isArray(data().inkNotes)?data().inkNotes:(data().inkNotes=[]);
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const titleOf=n=>String(n?.title||'Untitled page').slice(0,90);
let activeId='',tool='pen',color=COLORS[0],penOnly=true,smoothInk=true,current=null,history=[],redo=[],lastPointer=null;
let saving=false,mountedCanvas=null;
function active(){return notes().find(n=>n.id===activeId)||null;}
function announce(message){const node=document.querySelector('#inkStatus');if(node)node.textContent=message;}
function newPage(){
 const d=data(),now=new Date().toISOString();
 const note={id:core.id(),title:'Untitled ink note',subjectId:'',createdAt:now,updatedAt:now,strokes:[]};
 d.inkNotes=notes().concat(note);
 if(bytes(d)>WORKSPACE_LIMIT){d.inkNotes.pop();core.toast('Study storage is almost full. Export notes first.');return;}
 if(core.save()===false){d.inkNotes.pop();core.toast('Device storage is unavailable. Please export other notes first.');return;}
 activeId=note.id;history=[];redo=[];core.render();announce('New page ready. Handwriting saves after every stroke.');
}
function saveChange(note,rollback,description){
 if(!note)return false;
 const size=bytes(note),total=bytes(data());
 if(size>NOTE_LIMIT||total>WORKSPACE_LIMIT){
  rollback();
  core.toast('This ink page has reached its sync-safe limit. Export it, then start another page.');
  announce('Page storage limit reached — last change was not saved.');
  return false;
 }
 const previousTime=note.updatedAt;
 note.updatedAt=new Date().toISOString();
 if(core.save()===false){rollback();note.updatedAt=previousTime;announce('Could not save — device storage is unavailable.');return false;}
 announce((description||'Saved')+' · stored on this device'+(window.PsychDeskFirebase?.getUserId?.()?' · account sync when online':''));
 return true;
}
function renderLibrary(){
 const all=notes().slice().sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));
 return '<div class="ink-library-top"><div><span class="ink-eyebrow">HANDWRITTEN NOTEBOOK</span><h2>Your pages</h2><p>Open a page to continue writing with a stylus, mouse or touch.</p></div>'+
 '<button class="primary ink-create" type="button" data-ink="new">+ New ink page</button></div>'+
 (all.length?'<div class="ink-gallery">'+all.map(n=>
  '<button type="button" class="ink-note-card" data-ink="open" data-id="'+h(n.id)+'"><span class="ink-paper-thumb" aria-hidden="true">✎</span>'+
  '<span class="ink-note-details"><strong>'+h(titleOf(n))+'</strong><small>'+h((n.strokes||[]).length)+' strokes · '+h((n.updatedAt||'').slice(0,10))+'</small></span><span aria-hidden="true" class="ink-note-arrow">↗</span></button>'
 ).join('')+'</div>':
 '<div class="ink-empty"><span aria-hidden="true">✎</span><strong>A clear page for your next idea.</strong><p>Flip your Zenbook into tablet mode, pick up the pen and start writing.</p><button type="button" class="primary" data-ink="new">Start your first page</button></div>');
}
function selectedSubjects(id){
 const all=Array.isArray(data().subjects)?data().subjects:[];
 return '<option value="">No subject</option>'+all.map(s=>'<option value="'+h(s.id)+'"'+(id===s.id?' selected':'')+'>'+h(s.name)+'</option>').join('');
}
function renderEditor(note){
 return '<div class="ink-editor">'+
 '<div class="ink-editor-top"><button class="ink-back" type="button" data-ink="back" aria-label="All handwritten notes">← All pages</button>'+
 '<span class="ink-save-status" role="status" id="inkStatus">Saved locally · synced with account when available</span></div>'+
 '<div class="ink-note-meta"><label class="ink-title-label">Page title<input id="inkTitle" aria-label="Ink note title" maxlength="90" value="'+h(note.title||'')+'" placeholder="Give this page a name"></label>'+
 '<label class="ink-subject-label">Subject<select id="inkSubject" aria-label="Subject for ink note">'+selectedSubjects(note.subjectId)+'</select></label></div>'+
 '<div class="ink-controls" role="toolbar" aria-label="Handwriting tools">'+
 '<div class="ink-toolset"><button class="ink-tool'+(tool==='pen'?' selected':'')+'" aria-pressed="'+(tool==='pen')+'" data-ink="pen" type="button">✎ Pen</button>'+
 '<button class="ink-tool'+(tool==='highlighter'?' selected':'')+'" aria-pressed="'+(tool==='highlighter')+'" data-ink="highlighter" type="button">▰ Highlighter</button>'+
 '<button class="ink-tool'+(tool==='eraser'?' selected':'')+'" aria-pressed="'+(tool==='eraser')+'" data-ink="eraser" type="button">⌫ Eraser</button></div>'+
 '<div class="ink-palette" aria-label="Pen colors">'+COLORS.map(c=>'<button type="button" data-ink="color" data-color="'+c+'" class="ink-color'+(color===c?' selected':'')+'" aria-label="Choose '+({'#20252b':'black','#326a99':'blue','#b65252':'red','#52735e':'green'}[c])+' ink" aria-pressed="'+(color===c)+'" style="--ink-choice:'+c+'"><span></span></button>').join('')+'</div>'+
 '<div class="ink-toolset"><button type="button" data-ink="undo" aria-label="Undo last stroke"'+(note.strokes.length||history.length?'':' disabled')+'>↶ Undo</button>'+
 '<button type="button" data-ink="redo" aria-label="Redo stroke"'+(redo.length?'':' disabled')+'>↷ Redo</button></div>'+
 '</div>'+
 '<div class="ink-writing-options"><label class="ink-toggle"><input type="checkbox" id="inkPenOnly"'+(penOnly?' checked':'')+'> Pen-first mode <span>Ignore finger touches and palms</span></label>'+
 '<label class="ink-smooth-toggle"><input id="inkSmooth" type="checkbox"'+(smoothInk?' checked':'')+'> Smooth pen strokes</label>'+ 
 '<div class="ink-export-actions"><button type="button" data-ink="exportSvg">↓ SVG</button><button type="button" data-ink="exportPng">↓ PNG</button>'+
 '<button type="button" data-ink="delete" class="ink-danger">Delete page</button></div></div>'+
 '<div class="ink-page-scroll" aria-label="Scrollable handwriting page"><div class="ink-paper" id="inkPaper">'+
 '<canvas id="inkCanvas" width="'+PAGE_WIDTH+'" height="'+PAGE_HEIGHT+'" aria-label="Draw handwritten notes here with a stylus or mouse"></canvas>'+
 '</div></div>'+
 '<p class="ink-help">Works with ASUS Pen and other Windows pens. Pressure varies by device and browser. Write on the page; use the area around it to scroll. Your strokes are editable and exportable, not an image screenshot.</p>'+
 '<p class="ink-help ink-storage-warning">Compact ink pages sync through your existing PsychDesk account within its storage limits. Export large handwritten notes as SVG or PNG for safekeeping.</p>'+ 
 (window.PsychDeskInkConvert?.panel(note)||'')+
 '</div>';
}
function render(){
 const note=active();
 if(activeId&&!note){activeId='';redo=[];}
 return '<section class="hero ink-hero"><div class="eyebrow">INK NOTES · HANDWRITING</div><h1>Write it your way.</h1>'+
 '<p>A calm writing space built for your stylus, tablet, or 2-in-1 laptop.</p></section>'+
 (active()?renderEditor(active()):renderLibrary());
}
function canvasPoint(e,canvas){
 const r=canvas.getBoundingClientRect();
 const x=Math.max(0,Math.min(PAGE_WIDTH,Math.round((e.clientX-r.left)*PAGE_WIDTH/r.width)));
 const y=Math.max(0,Math.min(PAGE_HEIGHT,Math.round((e.clientY-r.top)*PAGE_HEIGHT/r.height)));
 const pressure=e.pointerType==='pen'?Math.max(0.10,Math.min(1,Number(e.pressure)||0.5)):0.55;
 return [x,y,Math.round(pressure*100)];
}
function safePoint(input){
 if(!Array.isArray(input)||input.length<2)return null;
 const x=Number(input[0]),y=Number(input[1]),p=Number(input[2]);
 if(!Number.isFinite(x)||!Number.isFinite(y))return null;
 return [Math.max(0,Math.min(PAGE_WIDTH,Math.round(x))),Math.max(0,Math.min(PAGE_HEIGHT,Math.round(y))),Number.isFinite(p)?Math.max(0,Math.min(100,Math.round(p))):50];
}
function drawStroke(ctx,stroke){
 const points=Array.isArray(stroke?.p)?stroke.p.map(safePoint).filter(Boolean):[];
 if(!points.length)return;
 const width=Math.max(1,Math.min(30,Number(stroke.w)||2.5));
 ctx.save();ctx.globalAlpha=stroke.kind==='highlighter'?0.28:1;
 ctx.strokeStyle=stroke.c||COLORS[0];ctx.fillStyle=stroke.c||COLORS[0];ctx.lineCap='round';ctx.lineJoin='round';
 if(points.length===1){
  ctx.beginPath();ctx.arc(points[0][0],points[0][1],Math.max(1,width/2),0,Math.PI*2);ctx.fill();
 }else{
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i];
   ctx.lineWidth=width*(stroke.kind==='highlighter'?1:0.55+((a[2]+b[2])/200)*0.85);
   ctx.beginPath();
   if(smoothInk&&points.length>2&&stroke.kind!=='highlighter'){
    const before=points[i-2],next=points[i+1];
    const start=before?[(before[0]+a[0])/2,(before[1]+a[1])/2]:[a[0],a[1]];
    const end=next?[(a[0]+b[0])/2,(a[1]+b[1])/2]:[b[0],b[1]];
    ctx.moveTo(start[0],start[1]);ctx.quadraticCurveTo(a[0],a[1],end[0],end[1]);
   }else{ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);}
   ctx.stroke();
  }
 }
 ctx.restore();
}
function repaint(){
 const canvas=document.querySelector('#inkCanvas'),n=active();
 if(!canvas||!n)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.clearRect(0,0,PAGE_WIDTH,PAGE_HEIGHT);
 for(const stroke of n.strokes||[])drawStroke(ctx,stroke);
 if(current?.stroke)drawStroke(ctx,current.stroke);
}
function nearSegment(p,a,b,distance){
 const dx=b[0]-a[0],dy=b[1]-a[1],square=dx*dx+dy*dy;
 const t=square?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/square)):0;
 return ((p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2)<distance*distance;
}
function eraserHit(note,point){
 for(let i=note.strokes.length-1;i>=0;i--){
  const s=note.strokes[i],p=Array.isArray(s?.p)?s.p.map(safePoint).filter(Boolean):[];
  if(p.some((v,j)=>nearSegment(point,v,p[Math.min(j+1,p.length-1)],Math.max(13,(Number(s.w)||3)/2+9))))return i;
 }
 return -1;
}
function addPoint(e,canvas){
 if(!current?.stroke)return;
 const point=canvasPoint(e,canvas),points=current.stroke.p,prev=points.at(-1);
 if(prev&&(prev[0]-point[0])**2+(prev[1]-point[1])**2<1)return;
 if(points.length>=2800)return; // bounded per stroke
 points.push(point);
}
function inkStart(e){
 const canvas=e.currentTarget,n=active();
 if(!n||current||!e.isPrimary)return;
 const effectiveTool=e.pointerType==='pen'&&(e.button===5||(e.buttons&32))?'eraser':tool;
 if(e.button>0&&effectiveTool!=='eraser')return;
 if(penOnly&&e.pointerType==='touch')return; // palm rejection when enabled
 if(e.pointerType==='touch'&&lastPointer?.type==='pen'&&Date.now()-lastPointer.time<800)return;
 e.preventDefault();
 lastPointer={type:e.pointerType,time:Date.now()};
 canvas.setPointerCapture?.(e.pointerId);
 if(effectiveTool==='eraser'){
  const at=eraserHit(n,canvasPoint(e,canvas));
  if(at!==-1){
   const removed=n.strokes.splice(at,1)[0];
   if(saveChange(n,()=>n.strokes.splice(at,0,removed),'Erased a stroke')){history.push({type:'erase',stroke:removed,index:at});redo=[];core.render();}
   else repaint();
  }
  return;
 }
 current={pointerId:e.pointerId,ownerId:n.id,stroke:{kind:effectiveTool,c:color,w:effectiveTool==='highlighter'?24:3.2,p:[]}};
 addPoint(e,canvas);repaint();
}
function inkMove(e){
 if(!current||current.pointerId!==e.pointerId||current.ownerId!==activeId)return;
 e.preventDefault();
 const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[];
 for(const point of events)addPoint(point,e.currentTarget);
 addPoint(e,e.currentTarget);
 repaint();
}
function inkEnd(e){
 if(!current||current.pointerId!==e.pointerId)return;
 const n=active(),stroke=current.stroke;current=null;
 if(!n||n.id!==activeId)return;
 const point=canvasPoint(e,e.currentTarget),prior=stroke.p.at(-1);
 if(!prior||prior[0]!==point[0]||prior[1]!==point[1])stroke.p.push(point);
 if(stroke.p.length){
  n.strokes.push(stroke);
  if(saveChange(n,()=>n.strokes.pop(),'Stroke saved')){history.push({type:'add',stroke,index:n.strokes.length-1});redo=[];}
 }
 repaint();updateUndoButtons();
}
function updateUndoButtons(){
 const note=active();
 for(const [kind,disabled] of [['undo',!note?.strokes?.length&&!history.length],['redo',!redo.length]]){
  const b=document.querySelector('[data-ink="'+kind+'"]');if(b)b.disabled=disabled;
 }
}
function mount(){
 const canvas=document.querySelector('#inkCanvas');
 if(!canvas||mountedCanvas===canvas)return;
 mountedCanvas=canvas;
 canvas.addEventListener('pointerdown',inkStart);
 canvas.addEventListener('pointermove',inkMove);
 canvas.addEventListener('pointerup',inkEnd);
 canvas.addEventListener('pointercancel',e=>{if(current?.pointerId===e.pointerId)inkEnd(e);});
 repaint();updateUndoButtons();
}
function commitMeta(field,value){
 const n=active();if(!n)return;
 const before=n[field],val=field==='title'?String(value).trim().slice(0,90)||'Untitled ink note':String(value);
 n[field]=val;
 if(!saveChange(n,()=>{n[field]=before;},'Page updated'))core.render();
}
function undo(){
 const n=active();if(!n)return;
 const action=history.pop()||(n.strokes.length?{type:'add',stroke:n.strokes.at(-1),index:n.strokes.length-1}:null);
 if(!action)return;
 let rollback;
 if(action.type==='add'){
  const i=n.strokes.lastIndexOf(action.stroke);
  if(i<0)return;
  n.strokes.splice(i,1);
  rollback=()=>n.strokes.splice(i,0,action.stroke);
 }else{
  const i=Math.min(action.index,n.strokes.length);
  n.strokes.splice(i,0,action.stroke);
  rollback=()=>n.strokes.splice(i,1);
 }
 if(saveChange(n,rollback,'Undone')){redo.push(action);repaint();updateUndoButtons();}
 else history.push(action);
}
function redoStroke(){
 const n=active();if(!n||!redo.length)return;
 const action=redo.pop();
 let rollback;
 if(action.type==='add'){
  const i=Math.min(action.index,n.strokes.length);
  n.strokes.splice(i,0,action.stroke);
  rollback=()=>n.strokes.splice(i,1);
 }else{
  const i=n.strokes.indexOf(action.stroke);
  if(i<0){redo.push(action);return;}
  n.strokes.splice(i,1);
  rollback=()=>n.strokes.splice(i,0,action.stroke);
 }
 if(saveChange(n,rollback,'Redone')){history.push(action);repaint();updateUndoButtons();}
 else redo.push(action);
}
function svgSource(n){
 const escXml=value=>String(value??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const header='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+PAGE_WIDTH+' '+PAGE_HEIGHT+'" width="'+PAGE_WIDTH+'" height="'+PAGE_HEIGHT+'">';
 const lines='<rect width="100%" height="100%" fill="#fff"/>'+
 Array.from({length:Math.floor(PAGE_HEIGHT/42)},(_,i)=>'<line x1="0" y1="'+(i+1)*42+'" x2="'+PAGE_WIDTH+'" y2="'+(i+1)*42+'" stroke="#e9eef1" stroke-width="1"/>').join('');
 const paths=(n.strokes||[]).map(s=>{
  const valid=COLORS.includes(s?.c)?s.c:COLORS[0],pts=Array.isArray(s?.p)?s.p.map(safePoint).filter(Boolean):[];
  const width=Math.max(1,Math.min(30,Number(s.w)||3));
  if(!pts.length)return '';
  if(pts.length===1)return '<circle cx="'+pts[0][0]+'" cy="'+pts[0][1]+'" r="'+width/2+'" fill="'+valid+'" opacity="'+(s.kind==='highlighter'?'0.28':'1')+'"/>';
  // Pressure-preserving vector segments (each segment receives its sampled width).
  return pts.slice(1).map((p,i)=>{
   const prev=pts[i],pr=(prev[2]+p[2])/200;
   return '<path d="M '+prev[0]+' '+prev[1]+' L '+p[0]+' '+p[1]+'" fill="none" stroke="'+valid+'" stroke-width="'+
    (width*(s.kind==='highlighter'?1:0.55+pr*0.85)).toFixed(2)+'" stroke-linecap="round" stroke-linejoin="round" opacity="'+(s.kind==='highlighter'?'0.28':'1')+'"/>';
  }).join('');
 }).join('');
 return header+'<title>'+escXml(titleOf(n))+'</title>'+lines+paths+'</svg>';
}
function downloadBlob(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function exportPage(type){
 const note=active();if(!note)return;
 const name=(titleOf(note).replace(/[^a-z0-9_-]+/gi,'-').slice(0,55)||'psychdesk-ink');
 if(type==='svg'){
  downloadBlob(new Blob([svgSource(note)],{type:'image/svg+xml;charset=utf-8'}),name+'.svg');return;
 }
 const canvas=document.createElement('canvas');canvas.width=PAGE_WIDTH;canvas.height=PAGE_HEIGHT;
 const ctx=canvas.getContext('2d');if(!ctx){core.toast('PNG export is unavailable.');return;}
 ctx.fillStyle='#fff';ctx.fillRect(0,0,PAGE_WIDTH,PAGE_HEIGHT);
 ctx.strokeStyle='#e9eef1';ctx.lineWidth=1;
 for(let y=42;y<PAGE_HEIGHT;y+=42){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(PAGE_WIDTH,y);ctx.stroke();}
 for(const stroke of note.strokes)drawStroke(ctx,stroke);
 canvas.toBlob(blob=>{if(blob)downloadBlob(blob,name+'.png');else core.toast('PNG export failed. Try SVG.');},'image/png');
}
function onClick(event){
 const el=event.target.closest('[data-ink]');if(!el)return;
 event.preventDefault();
 const action=el.dataset.ink;
 if(action==='new')return newPage();
 if(action==='open'){activeId=el.dataset.id;history=[];redo=[];core.render();return;}
 if(action==='back'){current=null;activeId='';history=[];redo=[];core.render();return;}
 if(['pen','highlighter','eraser'].includes(action)){tool=action;core.render();return;}
 if(action==='color'){if(COLORS.includes(el.dataset.color)){color=el.dataset.color;if(tool==='eraser')tool='pen';core.render();}return;}
 if(action==='undo')return undo();
 if(action==='redo')return redoStroke();
 if(action==='exportSvg')return exportPage('svg');
 if(action==='exportPng')return exportPage('png');
 if(action==='delete'){
  const n=active();if(!n||!confirm('Delete this ink page permanently? Export a copy first if needed.'))return;
  const previous=notes();data().inkNotes=previous.filter(x=>x.id!==n.id);
  if(core.save()===false){data().inkNotes=previous;core.toast('Could not delete ink note: storage is unavailable.');return;}
  activeId='';history=[];redo=[];core.render();core.toast('Ink page deleted.');
 }
}
document.addEventListener('click',onClick);
document.addEventListener('change',event=>{
 if(event.target?.id==='inkPenOnly'){penOnly=event.target.checked;announce(penOnly?'Pen-first mode: finger touches ignored.':'Finger drawing enabled.');}
 if(event.target?.id==='inkSmooth'){smoothInk=event.target.checked;repaint();announce(smoothInk?'Smoother pen lines enabled. Original pen points are preserved.':'Original pen line rendering restored.');}
 if(event.target?.id==='inkSubject')commitMeta('subjectId',event.target.value);
 if(event.target?.id==='inkTitle')commitMeta('title',event.target.value);
});
document.addEventListener('keydown',event=>{
 if(event.target?.id==='inkTitle'&&event.key==='Enter'){event.preventDefault();event.target.blur();}
});
window.addEventListener('psychdesk:tab-changed',e=>{if(e.tab==='ink')requestAnimationFrame(mount);else current=null;});
window.addEventListener('psychdesk:session-reset',()=>{activeId='';current=null;history=[];redo=[];mountedCanvas=null;});
window.PsychDeskInk={render,mount,drawStroke,canvasPoint,svgSource,nearSegment,eraserHit,saveChange,getActive:active};
})();