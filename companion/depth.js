/* Perspective motion layer. Original artwork, state machine and hit areas stay intact. */
(()=>{'use strict';
const host=document.getElementById('psychdesk-companion'),body=host?.querySelector('.pc-body');
if(!host||!body||host.querySelector('.pc-depth-scene'))return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const scene=document.createElement('span'),turn=document.createElement('span'),look=document.createElement('span');
scene.className='pc-depth-scene';turn.className='pc-depth-turn';look.className='pc-depth-look';
scene.setAttribute('aria-hidden','true');
body.before(scene);scene.append(turn);turn.append(look);look.append(body);
let frame=0,point=null;
const allowed=()=>!reduced.matches&&!document.hidden&&host.dataset.live!=='false'&&host.dataset.mode!=='hidden'&&!host.classList.contains('pc-suppressed');
function reset(){
 if(frame)cancelAnimationFrame(frame);frame=0;point=null;
 look.style.removeProperty('--pc-depth-x');look.style.removeProperty('--pc-depth-y');
}
function move(e){
 if(e.pointerType==='touch'||e.buttons||!allowed()){reset();return;}
 point={x:e.clientX,y:e.clientY};
 if(frame)return;
 frame=requestAnimationFrame(()=>{
  frame=0;if(!point||!allowed())return;
  const r=scene.getBoundingClientRect();
  const clamp=v=>Math.max(-1,Math.min(1,v));
  look.style.setProperty('--pc-depth-x',(-clamp((point.y-r.top-r.height/2)/(r.height/2||1))*7).toFixed(2)+'deg');
  look.style.setProperty('--pc-depth-y',(clamp((point.x-r.left-r.width/2)/(r.width/2||1))*11).toFixed(2)+'deg');
 });
}
const button=host.querySelector('.pc-character');
button.addEventListener('pointermove',move,{passive:true});
button.addEventListener('pointerleave',reset);
button.addEventListener('pointerdown',reset,{passive:true});
button.addEventListener('pointercancel',reset);
button.addEventListener('blur',reset);
document.addEventListener('visibilitychange',reset);
reduced.addEventListener?.('change',reset);
new MutationObserver(()=>{if(!allowed()||host.dataset.state==='walking')reset();})
 .observe(host,{attributes:true,attributeFilter:['data-live','data-mode','data-state','class']});
})();
