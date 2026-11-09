/* PsychDesk Garden — original scalable illustration.
   No network requests, no extra data stores, and no progress penalties. */
(()=>{'use strict';
const grass=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})" class="garden-grass-group"><g class="garden-grass-sway">
 <path d="M0 0 Q-4 -12 -9 -16 M0 0 Q2 -15 3 -21 M0 0 Q7 -9 12 -13" stroke="#6ba47a" stroke-width="3" stroke-linecap="round" fill="none"/>
 </g></g>`;
// Original vector diorama: directional light, object shadows and separate terrain faces.
const art=`<svg class="garden-art" viewBox="0 0 660 480" role="group" aria-label="Your miniature idea garden, with a reading pavilion and a moonlit pond" xmlns="http://www.w3.org/2000/svg">
<defs>
 <radialGradient id="desk-leaf" cx="28%" cy="20%" r="78%"><stop stop-color="#abc3a0"/><stop offset=".46" stop-color="#63866d"/><stop offset="1" stop-color="#263f35"/></radialGradient>
 <linearGradient id="desk-ground" x2=".7" y2="1"><stop stop-color="#8c9e7e"/><stop offset=".5" stop-color="#5b725b"/><stop offset="1" stop-color="#324b40"/></linearGradient>
 <linearGradient id="desk-edge" x2="0" y2="1"><stop stop-color="#596052"/><stop offset="1" stop-color="#202a25"/></linearGradient>
 <linearGradient id="desk-water" x2=".8" y2="1"><stop stop-color="#91b5b1"/><stop offset=".45" stop-color="#456b6c"/><stop offset="1" stop-color="#213f43"/></linearGradient>
 <linearGradient id="desk-roof" x2=".8" y2="1"><stop stop-color="#b0aa94"/><stop offset="1" stop-color="#595f55"/></linearGradient>
 <radialGradient id="desk-halo"><stop stop-color="#a9bca4" stop-opacity=".16"/><stop offset="1" stop-color="#a9bca4" stop-opacity="0"/></radialGradient>
 <radialGradient id="desk-shadow"><stop stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="350" cy="240" rx="285" ry="210" fill="url(#desk-halo)"/>
<ellipse cx="336" cy="428" rx="278" ry="42" fill="url(#desk-shadow)"/>
<!-- A shallow stone plinth, its front and right faces lit separately. -->
<path d="M66 285 326 153 596 277 338 420Z" fill="#17251f" transform="translate(0 21)"/>
<path d="M66 285 338 418 338 445 66 311Z" fill="url(#desk-edge)"/>
<path d="M338 418 596 277 596 305 338 445Z" fill="#26382f"/>
<path d="M66 285 326 153 596 277 338 418Z" fill="url(#desk-ground)" stroke="#889980" stroke-width="1.5"/>
<path d="M66 285 338 418 596 277" fill="none" stroke="#b3b99c" stroke-opacity=".5" stroke-width="2"/>
<path d="M81 301 337 427 580 295" fill="none" stroke="#a3aa91" stroke-opacity=".16"/>
<!-- Recessed water, a stone edge, and a quiet walking path. -->
<path d="M211 215 Q274 248 288 286 T393 371" fill="none" stroke="#3f5143" stroke-width="27"/>
<path d="M211 211 Q274 244 288 282 T393 367" fill="none" stroke="#b5af94" stroke-width="19"/>
<path d="M211 210 Q274 243 288 281 T393 366" fill="none" stroke="#d3cdb2" stroke-opacity=".4" stroke-width="2"/>
<ellipse cx="441" cy="304" rx="69" ry="32" transform="rotate(-24 441 304)" fill="#a1a58b"/>
<ellipse cx="441" cy="302" rx="63" ry="27" transform="rotate(-24 441 302)" fill="#203b35"/>
<ellipse cx="443" cy="305" rx="58" ry="22" transform="rotate(-24 443 305)" fill="url(#desk-water)"/>
<path d="M410 311 Q439 286 472 292 M430 315 Q449 300 465 303" stroke="#cee0d6" stroke-opacity=".45" fill="none" stroke-width="1.5"/>
<!-- Contact shadows ground every tree; crowns have a shared light direction. -->
${[[163,267,.76],[262,218,.84],[489,270,.85],[539,293,.5]].map(([x,y,s])=>`<g transform="translate(${x} ${y}) scale(${s})" class="garden-tree" role="button" tabindex="0" aria-label="Gently sway a tree"><ellipse cx="19" cy="7" rx="47" ry="13" fill="#162b23" opacity=".42"/><path d="M-5 5 -2 -80 5 -80 7 5Z" fill="#6e6956"/><path d="M1 -40 -24 -66 M3 -55 24 -82" stroke="#797461" stroke-width="4"/><g class="garden-canopy"><ellipse cx="-23" cy="-75" rx="31" ry="39" fill="url(#desk-leaf)"/><ellipse cx="24" cy="-85" rx="34" ry="44" fill="url(#desk-leaf)"/><ellipse cx="-3" cy="-110" rx="36" ry="47" fill="url(#desk-leaf)"/><path d="M-21 -127 Q-12 -144 2 -143" stroke="#cfdbc0" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/></g></g>`).join('')}
<!-- A quiet reading pavilion: roof plane, shaded side, lit interior and steps. -->
<g transform="translate(334 261)">
 <ellipse cx="9" cy="29" rx="67" ry="20" fill="#182b21" opacity=".4"/>
 <path d="M-50 23 0 0 57 25 6 54Z" fill="#6b7260"/>
 <path d="M-50 23 6 49 57 25 57 31 6 57 -50 30Z" fill="#a6a48b"/>
 <path d="M-37 -30 4 -51 43 -30 43 25 3 46 -37 24Z" fill="#c1b99d"/>
 <path d="M3 -10 43 -30 43 25 3 46Z" fill="#767e69"/>
 <path d="M-27 -12 -5 -2 -5 32 -27 22Z" fill="#303e34"/>
 <path d="M14 -5 34 -15 34 12 14 23Z" fill="#e8cf91"/>
 <path d="M24 -10V18 M14 9 34 -1" stroke="#6c7260" stroke-width="2"/>
 <path d="M-51 -30 0 -65 57 -35 5 -6Z" fill="url(#desk-roof)"/>
 <path d="M-51 -30 5 -6 57 -35 57 -28 5 2 -51 -23Z" fill="#454e43"/>
 <path d="M-51 -30 0 -65 57 -35" fill="none" stroke="#ded7ba" stroke-opacity=".7" stroke-width="2"/>
 <path d="M-22 30 -4 38 -15 44 -33 36Z" fill="#b6b299"/>
 <path d="M-33 36 -15 44 -15 49 -33 41Z" fill="#747c66"/>
</g>
${[[130,305,.75],[221,329,.65],[514,337,.6],[451,365,.4]].map(([x,y,s])=>`<g transform="translate(${x} ${y}) scale(${s})"><ellipse cy="4" rx="32" ry="10" fill="#203b2d" opacity=".6"/><ellipse cy="-10" rx="29" ry="22" fill="url(#desk-leaf)"/></g>`).join('')}
${grass(105,290,.7)}${grass(211,310,.63)}${grass(397,344,.67)}${grass(505,330,.54)}
<ellipse class="garden-pond-ripple" cx="441" cy="305" rx="28" ry="8" transform="rotate(-24 441 305)" fill="none" stroke="#c6dfd3" stroke-width="1.4" opacity=".5"/>
<ellipse class="garden-pond-hit" cx="441" cy="305" rx="63" ry="30" transform="rotate(-24 441 305)" fill="transparent" role="button" tabindex="0" aria-label="Make gentle ripples in the pond"/>
<g class="garden-fireflies" fill="#ead9a5"><circle cx="215" cy="183" r="2"/><circle cx="453" cy="207" r="2"/><circle cx="378" cy="338" r="2"/></g>
</svg>`;
function scene(saved,concepts){
 const flowers=(Array.isArray(saved)?saved:[]).slice(-5);
 const chips=flowers.map((item,i)=>{
  const c=(concepts||[]).find(v=>v.id===item.id);
  return c?'<button type="button" class="garden-flower garden-flower-'+i+'" data-auto="related" data-id="'+String(c.id).replace(/[^a-z0-9-]/g,'')+'" aria-label="Explore saved idea: '+String(c.term||c.title||'Saved idea').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'"><span class="idea-sprout" aria-hidden="true"></span></button>':'';
 }).join('');
 scheduleObservation();
 return '<div class="garden-world">'+art+chips+'<span class="garden-world-caption" aria-hidden="true">saved study concepts</span></div>';
}
// Pause decorative motion when off-screen or in a background tab.
let watcher;
function observe(){
 const gardens=document.querySelectorAll('.garden-world');
 if(!watcher&&'IntersectionObserver' in window)watcher=new IntersectionObserver(entries=>{
  for(const entry of entries){
   const paused=!entry.isIntersecting;
   entry.target.classList.toggle('garden-motion-paused',paused);
   entry.target.closest('.garden-landing')?.classList.toggle('garden-motion-paused',paused);
  }
 },{rootMargin:'70px'});
 gardens.forEach(node=>{
  if(!node.dataset.gardenObserved){node.dataset.gardenObserved='1';watcher?.observe(node);}
 });
}
function scheduleObservation(){requestAnimationFrame(observe);}
document.addEventListener('visibilitychange',()=>{
 document.documentElement.classList.toggle('garden-document-hidden',document.hidden);
});
window.addEventListener('psychdesk:tab-changed',scheduleObservation);
window.addEventListener('psychdesk:data-replaced',scheduleObservation);
/* Ambient lighting follows local time; interaction is optional and never stores data. */
function updateGardenLight(){
 const hour=new Date().getHours();
 document.documentElement.dataset.gardenTime=hour<11?'morning':hour<17?'afternoon':hour<20?'evening':'night';
}
updateGardenLight();
const activeReactions=new WeakMap();
const motionDisabled=()=>document.documentElement.dataset.motion==='off'
 ||document.documentElement.classList.contains('psychdesk-ambient-off')
 ||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function reactToGarden(target){
 const element=target?.closest?.('.garden-tree, .garden-pond-hit');
 if(!element||!element.closest('.garden-world')||motionDisabled()
  ||element.closest('.garden-motion-paused'))return;
 const tree=element.closest('.garden-tree');
 const node=tree||element.closest('svg.garden-art');
 const className=tree?'garden-reacting':'garden-pond-reacting';
 if(!node)return;
 window.clearTimeout(activeReactions.get(node));
 node.classList.remove(className);
 void node.getBoundingClientRect();
 node.classList.add(className);
 activeReactions.set(node,window.setTimeout(()=>node.classList.remove(className),960));
}
document.addEventListener('click',event=>reactToGarden(event.target));
document.addEventListener('keydown',event=>{
 if((event.key==='Enter'||event.key===' ')&&event.target?.matches?.('.garden-tree, .garden-pond-hit')){
  event.preventDefault();reactToGarden(event.target);
 }
});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateGardenLight()});
window.PsychDeskGarden={scene};
})();
