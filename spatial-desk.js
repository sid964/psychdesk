/* Sensory, optional spatial depth. No analytics, network, saved sensor data,
   continuous render loop, or permission dialogs. */
(()=>{'use strict';
 const root=document.documentElement;
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 const coarse=window.matchMedia?.('(pointer:coarse)');
 let lastTouch=0,lastFrame=0,pending=null,scheduled=false,baseline=null;
 const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
 const allowed=()=>root.dataset.motion==='gentle'&&!reduced?.matches
  &&!root.classList.contains('psychdesk-ambient-off')&&!document.hidden;
 const home=()=>document.querySelector('.garden-home .garden-landing');
 function apply(x=0,y=0){
  const node=home();if(!node)return;
  if(!allowed()){x=0;y=0;}
  x=clamp(x,-1,1);y=clamp(y,-1,1);
  node.style.setProperty('--spatial-rx',(y*-2.4).toFixed(2)+'deg');
  node.style.setProperty('--spatial-ry',(x*3.6).toFixed(2)+'deg');
  node.style.setProperty('--spatial-tx',(x*7).toFixed(1)+'px');
  node.style.setProperty('--spatial-ty',(y*5).toFixed(1)+'px');
  node.style.setProperty('--spatial-light-x',(x*15).toFixed(1)+'px');
  node.style.setProperty('--spatial-light-y',(y*12).toFixed(1)+'px');
 }
 function queue(x,y){
  if(!allowed())return;
  pending=[x,y];
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{
   scheduled=false;
   if(pending){apply(...pending);pending=null;}
  });
 }
 document.addEventListener('pointermove',event=>{
  const node=home();if(!node||!node.contains(event.target))return;
  if(event.pointerType==='touch')lastTouch=Date.now();
  const rect=node.getBoundingClientRect();
  if(rect.width<1||rect.height<1)return;
  queue(clamp((event.clientX-rect.left)/rect.width*2-1,-1,1),
        clamp((event.clientY-rect.top)/rect.height*2-1,-1,1));
 },{passive:true});
 document.addEventListener('pointerout',event=>{
  const node=home();
  if(node?.contains(event.target)&&!node.contains(event.relatedTarget))apply();
 },{passive:true});
 document.addEventListener('pointerup',event=>{
  if(event.pointerType==='touch')apply();
 },{passive:true});
 // A relative, capped tilt on devices already exposing their orientation.
 // Browsers requiring permission are deliberately not prompted.
 window.addEventListener('deviceorientation',event=>{
  if(!coarse?.matches||!allowed()||Date.now()-lastTouch<2500)return;
  if(!Number.isFinite(event.gamma)||!Number.isFinite(event.beta))return;
  const now=Date.now();if(now-lastFrame<60)return;lastFrame=now;
  if(!baseline)baseline={gamma:event.gamma,beta:event.beta};
  const rect=home()?.getBoundingClientRect();
  if(!rect||rect.bottom<0||rect.top>innerHeight)return;
  queue(clamp((event.gamma-baseline.gamma)/30,-.6,.6),
        clamp((event.beta-baseline.beta)/45,-.6,.6));
 },{passive:true});
 document.addEventListener('visibilitychange',()=>{baseline=null;apply();});
 document.addEventListener('psychdesk:motion-changed',()=>{baseline=null;apply();});
 window.addEventListener('psychdesk:tab-changed',()=>{baseline=null;apply();});
 window.addEventListener('pagehide',()=>apply());
})();
