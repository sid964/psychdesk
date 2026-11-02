/* Calm motion: one surface per navigation, no bounce, no background displacement. */
(()=>{
 'use strict';
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const rootStyle=getComputedStyle(document.documentElement);
 const duration=(name,fallback)=>parseFloat(rootStyle.getPropertyValue('--motion-'+name))||fallback;
 const timing={navigation:duration('navigation',420),dialog:duration('dialog',380),exit:duration('exit',220),reveal:duration('reveal',360),feedback:duration('feedback',200)};
 const ease=rootStyle.getPropertyValue('--motion-ease').trim()||'cubic-bezier(.22,.68,.2,1)';
 const active=new Map(),seen=new Map(),positions=new Map(),completed=new Map();
 const order=['today','planner','notes','ink','stickies','recall','focus','materials','research','dictionary','timeline','tools','insights','search','reader','voice','board','mindmap'];
 const direct='.ink-paper,.ink-editor,.ink-toolbar,.board-card,.mind-node,.reader-pages,canvas';
 const surfaces='.hero,.stat,.card,.banner,.subject-card,.note-card,.task-row,.empty,.tool-card,.psy-event-card,.psy-timeline-card,.ref-card,.reference-card';
 let lastTab=null,pending=null,observer=null,dialog=null,drag=null,basic=false;
 const exits=new Set();
 function stop(el){const a=active.get(el);if(a){active.delete(el);a.cancel();}}
 function cancel(scope){for(const el of [...active.keys()])if(!scope||!el.isConnected||el===scope||scope.contains(el))stop(el);}
 function play(el,frames,ms){
  if(!el?.animate||preference.matches||document.hidden)return null;
  stop(el);
  const animation=el.animate(frames,{duration:ms,easing:ease});active.set(el,animation);
  const clean=()=>{if(active.get(el)===animation)active.delete(el);};
  animation.addEventListener('finish',clean,{once:true});animation.addEventListener('cancel',clean,{once:true});
  return animation;
 }
 function key(el){const owner=el.matches('[data-id]')?el:el.querySelector('[data-id]');return el.classList[0]+':'+(owner?.dataset.id||el.textContent.trim().slice(0,100));}
 function disconnect(){observer?.disconnect();observer=null;}
 function beforeRender(root){
  // Data updates should not restart motion. Only release effects on nodes about to be removed.
  for(const el of [...active.keys()])if(el!==root&&root.contains(el))stop(el);
 }
 function navigate(from,to){
  if(from===to)return;
  positions.set(from,scrollY);
  const fromIndex=order.indexOf(from),toIndex=order.indexOf(to);
  pending={tab:to,direction:fromIndex>=0&&toIndex>=0&&toIndex<fromIndex?-1:1};
 }
 function observeSections(root,tab){
  disconnect();if(preference.matches||basic||['ink','board','mindmap','reader'].includes(tab))return;
  if(!seen.has(tab))seen.set(tab,new Set());const revealed=seen.get(tab);
  const candidates=[...root.querySelectorAll(surfaces)].slice(0,120),selection=new Set(candidates);
  const outer=candidates.filter(el=>{for(let p=el.parentElement;p&&p!==root;p=p.parentElement)if(selection.has(p))return false;return true;});
  const below=[];
  for(const el of outer){const bounds=el.getBoundingClientRect(),id=key(el);if(bounds.top<innerHeight)revealed.add(id);else if(!revealed.has(id))below.push(el);}
  if(!below.length||!('IntersectionObserver' in window))return;
  observer=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){
    observer?.unobserve(entry.target);const id=key(entry.target);
    if(revealed.has(id))continue;revealed.add(id);
    // Never stack an individual reveal on top of a moving section.
    if(!active.has(root))play(entry.target,[{opacity:.86,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],timing.reveal);
   }
  },{threshold:.04});
  below.forEach(el=>observer.observe(el));
 }
 function render(root,tab){
  for(const el of [...active.keys()])if(!el.isConnected)stop(el);
  const changed=lastTab!==null&&lastTab!==tab;
  if(pending){window.scrollTo({top:positions.get(tab)||0,behavior:'instant'});}
  if(changed){
   // A persistent root means rapid navigation can continue from its current offset.
   let offset=0;
   if(active.has(root))offset=new DOMMatrixReadOnly(getComputedStyle(root).transform).m41;
   const direction=pending?.direction||1,distance=innerWidth<650?22:30;
   const start=active.has(root)?offset:direction*distance;
   stop(root);
   play(root,[{transform:'translateX('+start+'px)'},{transform:'translateX(0)'}],basic?260:timing.navigation);
  }
  root.dataset.motionDirection=pending?.direction===-1?'backward':'forward';
  pending=null;
  // Completion confirmation is tied to the committed task state, not to a click.
  for(const el of root.querySelectorAll('.check-btn[data-id]')){
   const id=el.dataset.id,done=el.classList.contains('done');
   if(tab===lastTab&&completed.has(id)&&completed.get(id)!==done)play(el,[{opacity:.55},{opacity:1}],timing.feedback);
   completed.set(id,done);
  }
  lastTab=tab;observeSections(root,tab);
 }
 function resetDrag(){
  if(!drag)return;const d=drag;drag=null;d.el.style.removeProperty('transform');
  try{d.handle.releasePointerCapture(d.id);}catch{}
 }
 function closed(){
  resetDrag();
  if(dialog){const current=getComputedStyle(dialog).transform;cancel(dialog);if(current!=='none')dialog.style.transform=current;}
  dialog=null;
 }
 function opened(el){
  closed();for(const overlay of [...exits]){cancel(overlay);overlay.remove();exits.delete(overlay);}dialog=el;if(!el)return;
  const header=el.querySelector('.modal-header');
  if(header&&!header.querySelector('.motion-sheet-handle')){
   const handle=document.createElement('span');handle.className='motion-sheet-handle';handle.setAttribute('aria-hidden','true');header.prepend(handle);
  }
  play(el,[{transform:'translateY(30px)'},{transform:'translateY(0)'}],timing.dialog);
 }
 function dismiss(overlay){
  if(!overlay||preference.matches||document.hidden)return;
  const surface=overlay.querySelector('.modal');if(!surface)return;
  const y=Math.max(0,new DOMMatrixReadOnly(getComputedStyle(surface).transform).m42);
  // Move the actual outgoing DOM only after the existing editor has flushed its draft.
  // It is inert, has no IDs, and cannot trap focus or intercept input during its short exit.
  overlay.classList.add('motion-dismiss-layer');overlay.setAttribute('inert','');overlay.setAttribute('aria-hidden','true');
  overlay.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  document.body.append(overlay);exits.add(overlay);
  const remove=()=>{cancel(overlay);overlay.remove();exits.delete(overlay);};
  const slide=play(surface,[{transform:'translateY('+y+'px)'},{transform:'translateY('+(y+24)+'px)'}],timing.exit);
  play(overlay,[{opacity:1},{opacity:0}],timing.exit);
  if(slide){slide.addEventListener('finish',remove,{once:true});slide.addEventListener('cancel',remove,{once:true});}else remove();
 }
 document.addEventListener('pointerdown',e=>{
  const handle=e.target.closest?.('.motion-sheet-handle');
  if(!handle){
   // Direct manipulation begins on a settled surface, including a stylus used during navigation.
   if(e.pointerType==='pen'||e.target.closest?.('input,textarea,select,[contenteditable=true],'+direct)){
    stop(document.querySelector('#main'));if(dialog)stop(dialog);
   }
   return;
  }
  if(e.pointerType==='pen'||!e.isPrimary||e.button!==0||preference.matches||innerWidth>649)return;
  const el=handle.closest('.modal');if(!el)return;
  const offset=Math.max(0,new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);stop(el);e.preventDefault();
  drag={el,handle,id:e.pointerId,startY:e.clientY,offset,dy:offset,lastY:e.clientY,time:performance.now(),velocity:0};
  el.style.transform='translateY('+offset+'px)';handle.setPointerCapture(e.pointerId);
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;const now=performance.now();
  drag.velocity=(e.clientY-drag.lastY)/Math.max(1,now-drag.time);drag.time=now;drag.lastY=e.clientY;
  drag.dy=Math.max(0,drag.offset+e.clientY-drag.startY);drag.el.style.transform='translateY('+drag.dy+'px)';
 });
 function endDrag(e){
  if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;
  try{d.handle.releasePointerCapture(d.id);}catch{}
  const travel=d.dy-d.offset,velocity=performance.now()-d.time<100?d.velocity:0;
  const shouldDismiss=e.type==='pointerup'&&travel>20&&(d.dy>100||(d.dy>40&&velocity>.7));
  if(shouldDismiss){window.PsychDeskCore.closeModal();d.el.style.removeProperty('transform');}
  else{play(d.el,[{transform:'translateY('+d.dy+'px)'},{transform:'translateY(0)'}],timing.dialog);d.el.style.removeProperty('transform');}
 }
 document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
 document.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)endDrag({pointerId:e.pointerId,type:'pointercancel'});});
 function quiet(){
  disconnect();resetDrag();for(const overlay of [...exits]){cancel(overlay);overlay.remove();exits.delete(overlay);}cancel();
 }
 preference.addEventListener('change',()=>{if(preference.matches)quiet();else{const root=document.querySelector('#main');if(root)observeSections(root,lastTab);}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();});
 window.addEventListener('pagehide',quiet);
 window.addEventListener('pageshow',()=>{const root=document.querySelector('#main');if(root)observeSections(root,lastTab);});
 // Require repeated stalls before simplifying decoration; preserve essential navigation feedback.
 let stalls=0;
 try{if(PerformanceObserver.supportedEntryTypes.includes('longtask'))new PerformanceObserver(list=>{
  stalls+=list.getEntries().filter(entry=>entry.duration>120).length;
  if(stalls>=3&&!basic){basic=true;document.documentElement.dataset.motionQuality='basic';disconnect();}
 }).observe({type:'longtask',buffered:false});}catch{}
 window.PsychDeskMotion={beforeRender,navigate,render,opened,closed,dismiss,cancel};
})();
