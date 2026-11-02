/* Finite, interruptible motion. No timers in editing, drawing or scrolling paths. */
(()=>{'use strict';
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const css=getComputedStyle(document.documentElement);
 const token=(name,fallback)=>parseFloat(css.getPropertyValue('--motion-'+name))||fallback;
 const timing={enter:token('enter',380),small:token('small',200),dialog:token('dialog',300)};
 const ease=css.getPropertyValue('--motion-ease').trim()||'cubic-bezier(.22,1,.36,1)';
 const active=new Set(),byElement=new WeakMap(),visited=new Set(),positions=new Map(),seen=new Map();
 let lastTab=null,previous=new Map(),oldRects=new Map(),pendingTab=null,observer=null,scrollFrame=0,origin=null,drag=null,basic=false;
 const surfaces='.hero,.stat,.card,.banner,.subject-card,.note-card,.task-row,.empty,.ink-library-top,.ink-note-card,.tool-card,.psy-event-card,.ref-card';
 function play(el,frames,options={}){
  if(!el?.animate||preference.matches||document.hidden)return null;
  byElement.get(el)?.cancel();
  const animation=el.animate(frames,{duration:timing.enter,easing:ease,...options});
  active.add(animation);byElement.set(el,animation);
  const clean=()=>{active.delete(animation);if(byElement.get(el)===animation)byElement.delete(el);};
  animation.addEventListener('finish',clean,{once:true});animation.addEventListener('cancel',clean,{once:true});return animation;
 }
 function cancel(){for(const a of active)a.cancel();active.clear();}
 function stopScroll(){if(scrollFrame)cancelAnimationFrame(scrollFrame);scrollFrame=0;}
 function rect(el){return el.getBoundingClientRect();}
 function visible(r){return r.bottom>0&&r.top<innerHeight&&r.width>0;}
 function key(el){const owner=el.matches('[data-id]')?el:el.querySelector('[data-id]');return el.classList[0]+':'+(owner?.dataset.id||el.textContent.trim().slice(0,100));}
 function arrive(el,index=0,scroll=false){play(el,[{opacity:scroll ? .55 : 0,transform:'translateY('+ (scroll?8:12)+'px)'},{opacity:1,transform:'translateY(0)'}],{duration:scroll?280:timing.enter,delay:Math.min(index*24,96)});}
 function beforeRender(root,tab){
  oldRects.clear();if(tab!==lastTab||preference.matches)return;
  for(const el of [...root.querySelectorAll('.task-row,.note-card')].slice(0,100)){const r=rect(el);if(visible(r))oldRects.set(key(el),r);}
 }
 function navigate(from,to){if(from!==to){positions.set(from,scrollY);pendingTab=to;}}
 function depth(){
  scrollFrame=0;
  if(preference.matches||basic||document.hidden)return;
  // Only existing decorative motifs move. The page background remains #000000.
  document.documentElement.style.setProperty('--motion-depth',Math.min(18,Math.max(0,scrollY)*.035).toFixed(1)+'px');
  document.documentElement.classList.toggle('motion-scrolled',scrollY>24);
 }
 function onScroll(){if(!scrollFrame&&!basic&&!preference.matches&&!document.hidden)scrollFrame=requestAnimationFrame(depth);}
 function render(root,tab){
  cancel();observer?.disconnect();observer=null;
  if(pendingTab!==null){window.scrollTo({top:positions.get(pendingTab)||0,behavior:'instant'});pendingTab=null;}
  const changed=tab!==lastTab,first=!visited.has(tab),next=new Map();
  if(!seen.has(tab))seen.set(tab,new Set());const revealed=seen.get(tab);
  const candidates=[...root.querySelectorAll(surfaces)].slice(0,160),selection=new Set(candidates);
  const outer=candidates.filter(el=>{for(let p=el.parentElement;p&&p!==root;p=p.parentElement)if(selection.has(p))return false;return true;});
  // All reads precede entrance writes; below-fold content remains readable without JS.
  const bounds=outer.map(el=>({el,r:rect(el),id:key(el)}));
  let order=0;
  if(!preference.matches&&!basic&&'IntersectionObserver' in window){
   observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer?.unobserve(entry.target);const id=key(entry.target);if(!revealed.has(id)){revealed.add(id);arrive(entry.target,0,true);}}},{threshold:.08});
  }
  for(const {el,r,id} of bounds){
   if(visible(r)){if(first&&order<16)arrive(el,order++);revealed.add(id);}
   else if(r.top>=innerHeight&&!revealed.has(id))observer?.observe(el);
  }
  if(changed)play(document.querySelector('.bottom-nav .active .nav-ico'),spring('scale',.88,1),{duration:300,easing:'linear'});
  let progressIndex=0;
  for(const el of root.querySelectorAll('.task-row,.note-card,.answer,.check-btn,.progress>div')){
   const progress=el.matches('.progress>div'),id=progress?'progress:'+progressIndex++:key(el);
   const state=el.matches('.check-btn')?el.classList.contains('done'):progress?el.style.width:el.textContent.slice(0,160);
   next.set(id,state);const r=rect(el);if(!visible(r))continue;
   if(progress){const value=parseFloat(state),old=first?0:changed?NaN:parseFloat(previous.get(id));if(value>0&&Number.isFinite(old)&&old!==value)play(el,[{transform:'scaleX('+Math.min(1,old/value)+')'},{transform:'scaleX(1)'}]);}
   if(!changed){
    const old=oldRects.get(id);
    if(el.matches('.check-btn')&&previous.has(id)&&previous.get(id)!==state)play(el,spring('scale',.8,1),{duration:300,easing:'linear'});
    else if(old&&Math.abs(old.top-r.top)>1&&Math.abs(old.top-r.top)<400)play(el,[{transform:'translateY('+(old.top-r.top)+'px)'},{transform:'translateY(0)'}],{duration:260});
    else if(!previous.has(id)&&el.matches('.task-row,.note-card,.answer'))arrive(el);
   }
  }
  previous=next;lastTab=tab;visited.add(tab);oldRects.clear();depth();
 }
 // Damped spring sampled once per interaction; WAAPI handles native display cadence.
 function spring(kind,start,end){return Array.from({length:25},(_,i)=>{const t=i/24,p=i===24?1:1-Math.exp(-7*t)*(Math.cos(10*t)+.7*Math.sin(10*t));return {offset:t,transform:kind==='scale'?'scale('+(start+(end-start)*p)+')':'translateY('+(start+(end-start)*p)+'px)'};});}
 function opened(dialog){
  if(!dialog)return;
  const header=dialog.querySelector('.modal-header');
  if(header&&!header.querySelector('.motion-sheet-handle')){const handle=document.createElement('span');handle.className='motion-sheet-handle';handle.setAttribute('aria-hidden','true');header.prepend(handle);}
  if(origin&&performance.now()-origin.time<700&&!preference.matches){
   const target=rect(dialog),dx=Math.max(-80,Math.min(80,origin.rect.left+origin.rect.width/2-target.left-target.width/2));
   dialog.style.setProperty('animation','none','important');
   // Carry the selected note's direction into its editor without duplicating its content.
   play(dialog,[{opacity:.4,transform:'translate('+dx+'px,18px) scale(.97)'},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:timing.dialog});
  }
  origin=null;
 }
 function resetDrag(){if(!drag)return;const d=drag;drag=null;d.el.style.removeProperty('transform');try{d.handle.releasePointerCapture(d.id);}catch{}}
 function closed(){resetDrag();origin=null;}
 document.addEventListener('click',e=>{const note=e.target.closest?.('.note-card');origin=note?{rect:rect(note),time:performance.now()}:null;},true);
 document.addEventListener('pointerdown',e=>{
  const handle=e.target.closest?.('.motion-sheet-handle');
  if(!handle||e.pointerType==='pen'||!e.isPrimary||e.button!==0||preference.matches||innerWidth>649)return;
  const el=handle.closest('.modal');if(!el)return;e.preventDefault();const offset=Math.max(0,new DOMMatrixReadOnly(getComputedStyle(el).transform).m42);byElement.get(el)?.cancel();el.style.setProperty('animation','none','important');el.style.transform='translateY('+offset+'px)';
  drag={el,handle,id:e.pointerId,y:e.clientY,offset,time:performance.now(),dy:offset};handle.setPointerCapture(e.pointerId);
 });
 document.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;drag.dy=Math.max(0,drag.offset+e.clientY-drag.y);drag.el.style.transform='translateY('+drag.dy+'px)';});
 function endDrag(e){
  if(!drag||drag.id!==e.pointerId)return;const d=drag,travel=d.dy-d.offset,velocity=travel/Math.max(1,performance.now()-d.time);drag=null;
  try{d.handle.releasePointerCapture(d.id);}catch{}
  const dismiss=e.type==='pointerup'&&travel>20&&(d.dy>90||(d.dy>30&&velocity>.65));
  const animation=play(d.el,dismiss?[{transform:'translateY('+d.dy+'px)',opacity:1},{transform:'translateY('+Math.min(innerHeight,600)+'px)',opacity:0}]:spring('translateY',d.dy,0),{duration:dismiss?180:300,easing:dismiss?ease:'linear'});
  d.el.style.removeProperty('transform');
  const finish=()=>{if(dismiss&&d.el===document.querySelector('#modalRoot .modal'))window.PsychDeskCore.closeModal();};
  if(animation)animation.addEventListener('finish',finish,{once:true});else finish();
 }
 document.addEventListener('pointerup',endDrag);document.addEventListener('pointercancel',endDrag);
 document.addEventListener('lostpointercapture',e=>{if(drag?.id===e.pointerId)endDrag({...e,pointerId:e.pointerId,type:'pointercancel'});});
 function quiet(){cancel();observer?.disconnect();stopScroll();resetDrag();document.documentElement.style.setProperty('--motion-depth','0px');}
 preference.addEventListener('change',()=>{if(preference.matches)quiet();else depth();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)quiet();else depth();});
 window.addEventListener('pagehide',quiet);window.addEventListener('pageshow',depth);window.addEventListener('scroll',onScroll,{passive:true});
 // Downgrade decorative effects during severe main-thread stalls; essential controls stay instant.
 try{if(PerformanceObserver.supportedEntryTypes.includes('longtask')){new PerformanceObserver(list=>{if(list.getEntries().some(e=>e.duration>120)){basic=true;document.documentElement.dataset.motionQuality='basic';observer?.disconnect();stopScroll();document.documentElement.style.setProperty('--motion-depth','0px');}}).observe({type:'longtask',buffered:false});}}catch{}
 window.PsychDeskMotion={render,beforeRender,navigate,opened,closed,cancel};
})();
