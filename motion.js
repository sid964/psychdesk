/* PsychDesk interaction motion adapter. Playback is owned by motion-runtime.js. */
(()=>{
 'use strict';
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const engine=window.PsychDeskMotionEngine;
 const timing={navigation:365,dialog:340,exit:185,reveal:310,feedback:170};
 const active=engine?.animations||new Map(),positions=new Map(),seen=new Map(),completed=new Map(),exits=new Set();
 const order=['today','planner','notes','ink','stickies','recall','focus','materials','research','dictionary','timeline','tools','insights','search','reader','voice','board','mindmap'];
 const direct='input,textarea,select,[contenteditable],.ink-paper,.ink-editor,.ink-toolbar,.board-card,.mind-node,.reader-pages,canvas';
 let lastTab=null,pending=null,observer=null,dialog=null,drag=null,homeActive=false;
 // Sample a critically damped spring once. Browser animation scheduling follows the display.
 const spring=Array.from({length:33},(_,i)=>{
  const t=i/32,x=8*t,end=1-9*Math.exp(-8);
  return {offset:t,progress:(1-(1+x)*Math.exp(-x))/end};
 });
 function stop(el){engine?.stop(el);}
 function cancel(scope){engine?.cancel(scope);}
 function play(el,frames,ms){return engine?.play(el,frames,{duration:ms})||null;}
 function settle(el,axis,start,ms){
  const a=play(el,spring.map(({offset,progress})=>({offset,transform:`translate${axis}(${start*(1-progress)}px)`})),ms);
  if(a)try{a.effect?.updateTiming({easing:'linear'});}catch{}return a;
 }
 function offset(el,axis){try{return new DOMMatrixReadOnly(getComputedStyle(el).transform)[axis==='X'?'m41':'m42'];}catch{return 0;}}
 function disconnect(){observer?.disconnect();observer=null;}
 function beforeRender(root){disconnect();for(const el of [...active.keys()])if(el!==root&&root.contains(el))stop(el);}
 function navigate(from,to){if(from===to)return;positions.set(from,scrollY);pending={direction:order.indexOf(to)<order.indexOf(from)?-1:1};}
 function observeSections(root,tab){
  disconnect();if(!engine?.isEnabled()||['ink','board','mindmap','reader'].includes(tab)||!window.IntersectionObserver)return;
  if(!seen.has(tab))seen.set(tab,new Set());const visited=seen.get(tab);
  // Observe top-level sections only: never stack child entrances or hide unread content.
  observer=new IntersectionObserver(entries=>{
   for(const entry of entries){if(!entry.isIntersecting)continue;observer?.unobserve(entry.target);
    const key=entry.target.dataset.motionKey;if(visited.has(key))continue;visited.add(key);
    if(!active.has(root))settle(entry.target,'Y',20,timing.reveal);
   }
  },{threshold:.06});
  // The home page is wrapped in a single container: observe its actual study
  // cards instead of silently skipping them as the old top-level selector did.
  const surfaces=tab==='today'&&root.querySelector('.garden-home')
   ?[...root.querySelectorAll('.garden-notebook,.studio-discovery,.garden-bloom-line,.garden-tool-drawer')]
   :[...root.children];
  surfaces.forEach((el,i)=>{
   if(!el.matches('section,.card,.subject-grid,.summary-grid,.study-panel,.psy-layout,.ref-library,.study-tools-grid,.garden-bloom-line,.garden-tool-drawer'))return;
   const key=tab+':'+i+':'+el.className;el.dataset.motionKey=key;
   if(el.getBoundingClientRect().top<innerHeight)visited.add(key);
   else if(!visited.has(key))observer.observe(el);
  });
 }
 function greetHome(root){
  if(engine?.getMode()!=='gentle'||document.body.classList.contains('psychdesk-quiet'))return;
  // One-time choreography when Home actually enters, never on every save.
  // These are decorative surfaces, not editors or buttons taking input.
  const heading=root.querySelector('.garden-heading');
  const artwork=root.querySelector('.garden-art-wrap');
  const caption=root.querySelector('.garden-scene-footer');
  if(heading)play(heading,[
   {opacity:.62,transform:'translateY(13px)'},
   {opacity:1,transform:'translateY(0)'}
  ],470);
  if(artwork)play(artwork,[
   {opacity:.68,transform:'translateY(16px) scale(.965)'},
   {opacity:1,transform:'translateY(0) scale(1)'}
  ],640);
  if(caption)play(caption,[{opacity:.5},{opacity:1}],620);
 }
 function render(root,tab){
  for(const el of [...active.keys()])if(!el.isConnected)stop(el);
  if(pending)window.scrollTo({top:positions.get(tab)||0,behavior:'instant'});
  const initial=lastTab===null;
  const changed=lastTab!==tab;
  if(changed){
   const start=active.has(root)?offset(root,'X'):(pending?.direction||1)*(innerWidth<650?44:60);
   stop(root);
   // Drawing and canvas workspaces are immediately stable on entry.
   if(!['ink','board','mindmap','reader'].includes(tab))settle(root,initial?'Y':'X',initial?24:start,timing.navigation);
  }
  root.dataset.motionDirection=pending?.direction===-1?'backward':'forward';pending=null;
  const homeNow=tab==='today'&&Boolean(root.querySelector('.garden-home'));
  if(homeNow&&(changed||!homeActive))greetHome(root);
  homeActive=homeNow;
  for(const el of root.querySelectorAll('.check-btn[data-id]')){
   const key=el.dataset.id,done=el.classList.contains('done');
   if(lastTab===tab&&completed.has(key)&&completed.get(key)!==done)play(el,[{opacity:.6},{opacity:1}],timing.feedback);
   completed.set(key,done);
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
  settle(el,'Y',innerWidth<650?64:44,timing.dialog);
 }
 function dismiss(overlay){
  if(!overlay||!engine?.isEnabled())return;
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
  if(e.pointerType==='pen'||!e.isPrimary||e.button!==0||!engine?.isEnabled()||innerWidth>649)return;
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
  else{settle(d.el,'Y',d.dy,timing.dialog);d.el.style.removeProperty('transform');}
 }
 document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
 document.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)endDrag({pointerId:e.pointerId,type:'pointercancel'});});
 function quiet(){
  disconnect();resetDrag();for(const overlay of [...exits]){cancel(overlay);overlay.remove();exits.delete(overlay);}cancel();
 }
 document.addEventListener('psychdesk:motion-changed',()=>{if(!engine?.isEnabled())quiet();else{const root=document.querySelector('#main');if(root)observeSections(root,lastTab);}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();});
 window.addEventListener('pagehide',quiet);
 window.addEventListener('pageshow',()=>{const root=document.querySelector('#main');if(root)observeSections(root,lastTab);});
 // Keyboard editing settles movement as soon as input begins.
 document.addEventListener('keydown',e=>{if(e.target.closest?.(direct)){stop(document.querySelector('#main'));if(dialog)stop(dialog);}});
 // Every navigation action receives restrained touch/click feedback.
 // Never animate writing canvases, the Settings icon, or text fields.
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('.rail-link,.nav-item,.garden-main-btn,.garden-soft-btn,.garden-text-btn,.studio-explore,.studio-save,.garden-bloom-line button');
  if(button&&button.id!=='settingsBtn')play(button,[
   {opacity:.79,scale:'.965'},{opacity:1,scale:'1'}
  ],220);
 });
 window.PsychDeskMotion={beforeRender,navigate,render,opened,closed,dismiss,cancel};
})();
