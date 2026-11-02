/* Oneko sprite layout adapted from adryd325/oneko.js (MIT).
   Original cat artwork: Masayuki Koba's X11 oneko. Full notice in assets/ONEKO-LICENSE.txt. */
(()=>{'use strict';
const host=document.getElementById('psychdesk-companion'),sprite=host?.querySelector('.pc-cat');
if(!host||!sprite)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const frames={idle:[[-3,-3]],alert:[[-7,-3]],scratch:[[-5,0],[-6,0],[-7,0]],tired:[[-3,-2]],sleep:[[-2,0],[-2,-1]],N:[[-1,-2],[-1,-3]],NE:[[0,-2],[0,-3]],E:[[-3,0],[-3,-1]],SE:[[-5,-1],[-5,-2]],S:[[-6,-3],[-7,-2]],SW:[[-5,-3],[-6,-1]],W:[[-4,-2],[-4,-3]],NW:[[-1,0],[-1,-1]]};
let timer=0,key='',index=0;
function stop(){clearTimeout(timer);timer=0;}
function paint(name,frame=0){const xy=(frames[name]||frames.idle)[frame%(frames[name]||frames.idle).length];sprite.style.backgroundPosition=(-xy[0]*100/7)+'% '+(-xy[1]*100/3)+'%';}
function sync(){
 const state=host.dataset.state||'resting',quiet=document.hidden||host.dataset.mode==='hidden'||host.classList.contains('pc-suppressed')||host.dataset.live==='false'||reduced.matches;
 const current=[state,quiet,host.dataset.walkDirection].join('|');if(current===key)return;key=current;stop();index=0;
 if(quiet){paint(state==='sleeping'?'sleep':'idle');return;}
 let name='idle',delay=180,limit=0;
 if(state==='walking'){name=frames[host.dataset.walkDirection]?host.dataset.walkDirection:(host.dataset.facing==='left'?'W':'E');delay=130;limit=64;}
 else if(state==='sleeping'){name='sleep';delay=600;limit=8;}
 else if(['stretching','celebrating','pet-react','interacting'].includes(state)){name='scratch';limit=7;}
 else if(['thinking','disconnected'].includes(state))name='tired';
 else if(['waving','looking','pointing','syncing'].includes(state)){name='alert';}
 paint(name);
 function tick(){timer=0;if(document.hidden||host.classList.contains('pc-suppressed')||host.dataset.mode==='hidden')return;paint(name,++index);if(index<limit)timer=setTimeout(tick,delay);else if(state!=='sleeping'&&state!=='walking')paint('idle');}
 if(limit)timer=setTimeout(tick,delay);
}
new MutationObserver(sync).observe(host,{attributes:true,attributeFilter:['data-state','data-mode','data-live','data-walk-direction','data-facing','class']});
document.addEventListener('visibilitychange',()=>{key='';sync();});reduced.addEventListener?.('change',()=>{key='';sync();});
const preload=new Image();preload.onerror=()=>{stop();sprite.style.backgroundImage='none';sprite.textContent='🐈';};preload.src=new URL('./assets/oneko.gif',document.currentScript?.src||new URL('companion/cat.js',document.baseURI)).href;
sync();
})();
