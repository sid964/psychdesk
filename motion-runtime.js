/* PsychDesk Motion Runtime — the single owner of interface animation playback.
   UI modules request effects here; the browser handles frames through WAAPI. */
(()=>{
 'use strict';
 const KEY='psychdesk-motion-mode-v1';
 const allowed=new Set(['gentle','quiet','off']);
 const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const animations=new Map();
 let mode='gentle',tab='today';
 try{const stored=localStorage.getItem(KEY);if(allowed.has(stored))mode=stored;}catch{}
 const canAnimate=()=>mode!=='off'&&!media?.matches&&!document.hidden;
 const durationFactor=()=>mode==='quiet'?.72:1;
 function stop(element){
  if(!element)return;
  const current=animations.get(element);
  if(!current)return;
  animations.delete(element);
  try{current.cancel();}catch{}
 }
 function cancel(scope){
  for(const element of [...animations.keys()]){
   if(!scope||element===scope||!element.isConnected||scope.contains?.(element))stop(element);
  }
 }
 function play(element,frames,options={}){
  if(!element?.animate||!element.isConnected||!canAnimate())return null;
  stop(element);
  let animation;
  try{
   animation=element.animate(frames,{
    duration:Math.max(0,Math.round((options.duration??240)*durationFactor())),
    easing:options.easing||'cubic-bezier(.22,.68,.2,1)',
    fill:'none',
    iterations:1
   });
  }catch(error){
   console.warn('Motion effect skipped:',error);
   return null;
  }
  animations.set(element,animation);
  const cleanup=()=>{if(animations.get(element)===animation)animations.delete(element);};
  animation.addEventListener('finish',cleanup,{once:true});
  animation.addEventListener('cancel',cleanup,{once:true});
  return animation;
 }
 function refresh(){
  document.documentElement.dataset.motion=mode;
  const idleOff=!canAnimate()||mode==='quiet'||tab==='focus'||document.body.classList.contains('psychdesk-quiet')||document.body.classList.contains('psychworld-open');
  document.documentElement.classList.toggle('psychdesk-ambient-off',idleOff);
  if(!canAnimate())cancel();
  document.dispatchEvent(new CustomEvent('psychdesk:motion-changed',{detail:{mode,enabled:canAnimate()}}));
 }
 function setMode(next){
  if(!allowed.has(next))return;
  mode=next;
  try{localStorage.setItem(KEY,next);}catch{}
  refresh();
  document.querySelectorAll('[data-motion-choice]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.motionChoice===mode));
  });
 }
 function addSettings(){
  const modal=document.querySelector('#modalRoot .modal');
  if(!modal||modal.querySelector('#motionPreferences'))return;
  const section=document.createElement('section');
  section.id='motionPreferences';
  section.className='settings-section motion-preferences';
  section.innerHTML='<h3>Motion</h3><p class="note">Choose what feels comfortable. Study content stays still while you read or write.</p>'+
   '<div class="motion-choice-group" role="group" aria-label="Motion preference">'+
   [['gentle','Gentle'],['quiet','Only interactions'],['off','Off']].map(([value,label])=>
    '<button type="button" class="secondary" data-motion-choice="'+value+'" aria-pressed="'+(mode===value)+'">'+label+'</button>').join('')+
   '</div><p class="note">Your device’s reduced-motion setting is always respected.</p>';
  const anchor=modal.querySelector('.settings-section:last-of-type');
  if(anchor)anchor.before(section);else modal.append(section);
 }
 document.addEventListener('click',e=>{
  const button=e.target.closest?.('[data-motion-choice]');
  if(button){e.preventDefault();setMode(button.dataset.motionChoice);}
  if(e.target.closest?.('#settingsBtn'))queueMicrotask(addSettings);
 });
 window.addEventListener('psychdesk:tab-changed',e=>{tab=e.tab||'today';refresh();});
 document.addEventListener('visibilitychange',refresh);
 media?.addEventListener?.('change',refresh);
 window.addEventListener('pagehide',()=>cancel());
 // Quiet Room is an existing UI mode. Watch class changes, not animation frames.
 const watch=()=>{if(document.body)new MutationObserver(refresh).observe(document.body,{attributes:true,attributeFilter:['class']});};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
 window.PsychDeskMotionEngine={animations,play,stop,cancel,isEnabled:canAnimate,getMode:()=>mode,setMode,refresh};
 refresh();
})();
