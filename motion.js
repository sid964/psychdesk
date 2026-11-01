/* PsychDesk motion: finite, interruptible animations; never delays application state. */
(()=>{'use strict';
 const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
 const active=new Set();let lastTab=null,previous=new Map();
 const ease='cubic-bezier(.22,1,.36,1)';
 function play(element,frames,options={}){
  if(!element?.animate||preference.matches||document.hidden)return;
  const animation=element.animate(frames,{duration:360,easing:ease,...options});
  active.add(animation);
  const clean=()=>active.delete(animation);
  animation.addEventListener('finish',clean,{once:true});animation.addEventListener('cancel',clean,{once:true});
  return animation;
 }
 function cancel(){for(const animation of active)animation.cancel();active.clear();}
 function visible(el){const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.width>0;}
 function arrive(el,index=0){play(el,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:Math.min(index*28,112)});}
 function render(root,tab){
  cancel();
  const changed=tab!==lastTab;
  const next=new Map();
  if(changed){
   const candidates=[...root.querySelectorAll('.hero,.stat,.card,.banner,.subject-card,.note-card,.task-row,.empty,.ink-library-top,.ink-note-card,.tool-card')].filter(visible);
   // Animate only the outermost selected surfaces, with a bounded stagger.
   const selected=new Set(candidates);
   candidates.filter(el=>{for(let p=el.parentElement;p&&p!==root;p=p.parentElement)if(selected.has(p))return false;return true;}).slice(0,18).forEach(arrive);
   const current=document.querySelector('.bottom-nav .active .nav-ico');
   play(current,[{transform:'scale(.86)'},{transform:'scale(1.06)',offset:.65},{transform:'scale(1)'}],{duration:320});
  }
  let progressIndex=0;
  for(const el of root.querySelectorAll('.task-row,.note-card,.answer,.check-btn,.progress>div')){
   const owner=el.matches('.task-row,.note-card')?el.querySelector('[data-id]')||el:el;
   const key=el.matches('.progress>div')?'progress:'+progressIndex++:el.classList[0]+':'+(owner.dataset.id||owner.dataset.noteId||el.textContent.trim().slice(0,100));
   const state=el.matches('.check-btn')?el.classList.contains('done'):el.matches('.progress>div')?el.style.width:el.textContent.slice(0,160);
   next.set(key,state);
   if(el.matches('.progress>div')&&visible(el)){
    const value=parseFloat(state),old=changed?0:parseFloat(previous.get(key));
    if(value>0&&Number.isFinite(old)&&old!==value)play(el,[{transform:'scaleX('+Math.min(1,old/value)+')'},{transform:'scaleX(1)'}],{duration:420});
   }
   if(!changed&&visible(el)){
    if(el.matches('.check-btn')&&previous.has(key)&&previous.get(key)!==state)play(el,[{transform:'scale(.8)'},{transform:'scale(1.12)',offset:.6},{transform:'scale(1)'}],{duration:300});
    else if(!previous.has(key)&&el.matches('.task-row,.note-card,.answer'))arrive(el);
   }
  }
  previous=next;lastTab=tab;
 }
 preference.addEventListener('change',()=>{if(preference.matches)cancel();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});
 window.PsychDeskMotion={render,cancel};
})();
