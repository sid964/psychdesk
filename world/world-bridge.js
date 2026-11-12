/* Opt-in Psychology World entry. Does not mutate study records or replace the homepage. */
(()=>{'use strict';
const main=document.getElementById('main');
if(!main)return;
let active=null,previousFocus=null;
const allowed=new Set(['notes','materials','flashcards','dictionary','focus','planner','tools','ink']);
function attachLaunch(){
 const host=main.querySelector('.garden-entry');
 if(!host||host.querySelector('#psychWorldLaunch'))return;
 const btn=document.createElement('button');
 btn.id='psychWorldLaunch';btn.type='button';
 btn.className='garden-soft-btn psychworld-launch';
 btn.textContent='Explore 3D World';
 btn.setAttribute('aria-haspopup','dialog');
 btn.addEventListener('click',openWorld);
 host.append(btn);
}
function closeWorld(){
 if(!active)return;
 active.remove();active=null;
 document.body.classList.remove('psychworld-open');
 window.removeEventListener('message',receive);
 document.removeEventListener('keydown',escape);
 if(previousFocus?.isConnected)previousFocus.focus();
 previousFocus=null;
}
function escape(e){if(e.key==='Escape'){e.preventDefault();closeWorld();}}
function receive(e){
 if(!active||e.origin!==location.origin||e.source!==active.querySelector('iframe')?.contentWindow)return;
 const data=e.data;
 if(!data||typeof data!=='object')return;
 if(data.type==='psychworld:close'){closeWorld();return;}
 if(data.type==='psychworld:visit'&&allowed.has(data.tab)){
  const tab=data.tab;closeWorld();
  window.PsychDeskCore?.setTab?.(tab);
 }
}
function openWorld(){
 if(active)return;
 previousFocus=document.activeElement;
 const layer=document.createElement('section');
 layer.id='psychWorldOverlay';layer.setAttribute('role','dialog');
 layer.setAttribute('aria-modal','true');layer.setAttribute('aria-label','Psychology World');
 const frame=document.createElement('iframe');
 frame.title='Interactive Psychology World';frame.src='world/index.html';
 frame.setAttribute('allow','fullscreen');frame.setAttribute('loading','eager');
 const close=document.createElement('button');
 close.type='button';close.className='psychworld-exit';close.textContent='Return to study desk';
 close.addEventListener('click',closeWorld);
 layer.append(frame,close);document.body.append(layer);active=layer;
 document.body.classList.add('psychworld-open');
 window.addEventListener('message',receive);
 document.addEventListener('keydown',escape);
 close.focus();
}
const observer=new MutationObserver(attachLaunch);
observer.observe(main,{childList:true,subtree:true});
window.addEventListener('psychdesk:tab-changed',attachLaunch);
attachLaunch();
})();