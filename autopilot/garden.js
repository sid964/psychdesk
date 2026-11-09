/* PsychDesk Garden — original scalable illustration.
   No network requests, no extra data stores, and no progress penalties. */
(()=>{'use strict';
const tree=(x,y,s,shade)=>`<g transform="translate(${x} ${y}) scale(${s})" class="garden-tree" role="button" tabindex="0" aria-label="Gently sway a tree">
 <path d="M-7 10 Q-4 -24 0 -59 Q5 -27 9 10" fill="#755942"/>
 <path d="M-1 -42 Q-20 -58 -26 -68 M2 -30 Q23 -46 25 -53" fill="none" stroke="#755942" stroke-width="5" stroke-linecap="round"/>
 <g class="garden-canopy">
 <ellipse cx="-29" cy="-67" rx="32" ry="30" fill="${shade}"/>
 <ellipse cx="13" cy="-86" rx="38" ry="38" fill="#8db98b"/>
 <ellipse cx="43" cy="-58" rx="33" ry="30" fill="${shade}"/>
 <ellipse cx="-5" cy="-93" rx="43" ry="39" fill="#6c9f7c"/>
 <path d="M-35 -98 Q-7 -120 23 -103" fill="none" stroke="#b5d6aa" stroke-width="5" stroke-linecap="round" opacity=".65"/>
 <g class="garden-leaf-shimmer"><circle cx="-20" cy="-83" r="4" fill="#d9eac2"/><circle cx="22" cy="-73" r="3" fill="#d9eac2"/></g>
 </g></g>`;
const pine=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})" class="garden-tree garden-pine" role="button" tabindex="0" aria-label="Gently sway a pine tree">
 <path d="M-6 0 V-78 H6 V0Z" fill="#866747"/>
 <g class="garden-needles">
 <path d="M-48 -28 L0 -111 48 -28Z" fill="#5c947a"/>
 <path d="M-40 -65 L0 -140 40 -65Z" fill="#78aa83"/>
 <path d="M-27 -101 L0 -158 27 -101Z" fill="#a1c39a"/>
 <path d="M-20 -111 L0 -149 19 -112" fill="none" stroke="#c5ddba" stroke-width="4" opacity=".7" stroke-linecap="round"/>
 </g></g>`;
const shrub=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})" class="garden-shrub">
 <g class="garden-shrub-crown"><ellipse cy="-7" rx="28" ry="16" fill="#7fb087"/>
 <circle cx="-13" cy="-17" r="16" fill="#9bc99a"/><circle cx="13" cy="-17" r="15" fill="#6b9e77"/>
 <circle cx="0" cy="-28" r="15" fill="#8fbd8d"/><circle cx="-3" cy="-29" r="2" fill="#e2f0cd"/></g></g>`;
const flower=(x,y,i)=>`<g transform="translate(${x} ${y})" class="garden-meadow-flower"><g class="garden-flower-sway garden-sway-${i%3}">
 <path d="M0 0 Q-3 -9 0 -20" stroke="#5c946c" stroke-width="3" stroke-linecap="round" fill="none"/>
 <path d="M-2 -7 Q-13 -17 -13 -7 Q-6 -2 -2 -7 M0 -10 Q10 -19 12 -12 Q10 -5 0 -10" fill="#7eb487"/>
 <circle cy="-21" r="6" fill="#fcebd2"/><circle cy="-21" r="2.5" fill="#d49f73"/>
 </g></g>`;
const grass=(x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})" class="garden-grass-group"><g class="garden-grass-sway">
 <path d="M0 0 Q-4 -12 -9 -16 M0 0 Q2 -15 3 -21 M0 0 Q7 -9 12 -13" stroke="#6ba47a" stroke-width="3" stroke-linecap="round" fill="none"/>
 </g></g>`;
const art=`<svg class="garden-art" viewBox="0 0 660 480" role="img" aria-label="An illustrated floating garden with a tiny reading cottage, trees, flowers and a winding path" xmlns="http://www.w3.org/2000/svg">
 <defs>
 <linearGradient id="garden-land" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b7d6a0"/><stop offset="1" stop-color="#84b883"/></linearGradient>
 <linearGradient id="garden-cliff" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b18e6d"/><stop offset="1" stop-color="#8e6d51"/></linearGradient>
 <radialGradient id="garden-shadow"><stop stop-color="#244f41" stop-opacity=".17"/><stop offset="1" stop-color="#244f41" stop-opacity="0"/></radialGradient>
 </defs>
 <ellipse cx="355" cy="422" rx="255" ry="41" fill="url(#garden-shadow)"/>
 <g class="garden-cloud" fill="#fbfff5" opacity=".75">
   <ellipse cx="117" cy="95" rx="51" ry="14"/><ellipse cx="137" cy="84" rx="26" ry="19"/><ellipse cx="90" cy="84" rx="24" ry="19"/>
   <ellipse cx="535" cy="75" rx="43" ry="11"/><ellipse cx="548" cy="65" rx="24" ry="16"/>
 </g>
 <!-- Small moving points of light, part of the illustration, never controls -->
 <g class="garden-sky-motes" aria-hidden="true" fill="#fff7d1">
  <circle class="garden-mote garden-mote-a" cx="178" cy="132" r="2.8" opacity=".78"/>
  <circle class="garden-mote garden-mote-b" cx="336" cy="102" r="2.2" opacity=".74"/>
  <circle class="garden-mote garden-mote-c" cx="575" cy="164" r="2.6" opacity=".72"/>
  <circle class="garden-mote garden-mote-d" cx="270" cy="189" r="1.9" opacity=".66"/>
 </g>
 <!-- Short translucent wind streams travel above the leaves -->
 <g class="garden-wind-trails" aria-hidden="true" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" opacity=".63">
 <path class="garden-wind garden-wind-a" d="M97 162 Q145 144 192 156 T289 154" stroke-dasharray="19 15 40 150"/>
 <path class="garden-wind garden-wind-b" d="M386 150 Q428 136 463 147 T550 146" stroke-dasharray="13 21 25 135"/>
 <path class="garden-wind garden-wind-c" d="M137 201 Q178 189 213 199 T275 197" stroke-dasharray="18 22 38 140"/>
 </g>
 <circle cx="492" cy="98" r="45" fill="#fff5bc" opacity=".69" class="garden-sun"/>
 <circle cx="492" cy="98" r="62" fill="none" stroke="#fff7d0" stroke-width="3" opacity=".40"/>
 <!-- Floating garden, drawn as a small isometric world -->
 <path d="M66 282 329 152 611 281 345 419Z" fill="#6b9d78" opacity=".55" transform="translate(0 20)"/>
 <path d="M66 281 345 414 345 449 66 315Z" fill="url(#garden-cliff)"/>
 <path d="M345 414 611 281 611 315 345 449Z" fill="#886748"/>
 <path d="M66 281 329 151 611 281 345 414Z" fill="url(#garden-land)" stroke="#8cba86" stroke-width="3"/>
 <path d="M84 280 329 162 590 283 346 401Z" fill="none" stroke="#d2e9b3" stroke-width="3" opacity=".6"/>
 <path d="M205 214 Q280 232 305 277 T426 350" fill="none" stroke="#e5d9ac" stroke-width="26" opacity=".88" stroke-linecap="round"/>
 <path d="M205 214 Q280 232 305 277 T426 350" fill="none" stroke="#fff1c6" stroke-width="12" opacity=".82" stroke-linecap="round"/>
 <ellipse cx="429" cy="292" rx="58" ry="27" fill="#7eaf9b" transform="rotate(-20 429 292)"/>
 <ellipse cx="431" cy="288" rx="45" ry="18" fill="#9fc9bd" opacity=".9" transform="rotate(-20 431 288)"/>
 <path d="M403 291 Q420 277 449 280" stroke="#eaf8e5" stroke-width="3" fill="none" opacity=".66"/>
 <g opacity=".94">${pine(163,266,.62)}${tree(267,227,.79,'#8eb28b')}${tree(490,306,.82,'#8bb58b')}${pine(546,289,.47)}</g>
 <!-- Tiny storybook reading cottage -->
 <g transform="translate(331 252)">
 <ellipse cx="0" cy="30" rx="70" ry="20" fill="#668d6f" opacity=".35"/>
 <path d="M-38 -15 1 -38 41 -16 41 34 1 58 -38 34Z" fill="#f7e5c3" stroke="#b9a27c" stroke-width="2"/>
 <path d="M1 -38 41 -16 1 5 -39 -16Z" fill="#967458"/>
 <path d="M1 -53 55 -20 42 -8 1 -32 -45 -8 -56 -19Z" fill="#cb8568"/>
 <path d="M-12 8 4 17 4 50 -12 41Z" fill="#855f49"/>
 <path d="M18 12 32 5 32 21 18 29Z" fill="#9fc7ac" stroke="#fff5ce" stroke-width="4"/>
 <circle cx="0" cy="29" r="2" fill="#f4d8a1"/>
 <path d="M-54 -19 1 -53 55 -20" fill="none" stroke="#e9b194" stroke-width="3" stroke-linejoin="round"/>
 <path d="M27 -38 V-55" stroke="#bd9c7e" stroke-width="7" stroke-linecap="round"/>
 </g>
 <!-- Air gently drifts from the cottage chimney. -->
 <g class="garden-cottage-smoke" aria-hidden="true" fill="#fffbe8">
  <ellipse class="garden-smoke garden-smoke-a" cx="360" cy="195" rx="5" ry="7" opacity=".5"/>
  <ellipse class="garden-smoke garden-smoke-b" cx="371" cy="176" rx="7" ry="9" opacity=".38"/>
  <ellipse class="garden-smoke garden-smoke-c" cx="383" cy="152" rx="8" ry="10" opacity=".3"/>
 </g>
 ${shrub(134,307,.82)}${shrub(235,320,.66)}${shrub(554,329,.66)}${shrub(464,357,.45)}
 <!-- Gentle meadow flowers -->
 ${flower(167,322,0)}${flower(175,326,1)}${flower(221,348,2)}${flower(455,365,1)}${flower(520,333,0)}
 ${grass(105,290,.7)}${grass(211,310,.63)}${grass(397,344,.67)}${grass(505,330,.54)}
 <ellipse class="garden-pond-ripple" cx="429" cy="289" rx="29" ry="9" transform="rotate(-20 429 289)" fill="none" stroke="#ecfff6" stroke-width="2" opacity=".7"/>
 <ellipse class="garden-pond-hit" cx="429" cy="289" rx="58" ry="26" transform="rotate(-20 429 289)" fill="transparent" role="button" tabindex="0" aria-label="Make gentle ripples in the pond"/>
 <g class="garden-falling-leaves" aria-hidden="true">
 <path class="garden-drift-leaf garden-drift-leaf-a" d="M309 142 Q300 133 294 144 Q300 151 309 142" fill="#e6d5a0"/>
 <path class="garden-drift-leaf garden-drift-leaf-b" d="M521 213 Q512 206 506 216 Q515 224 521 213" fill="#c5dda7"/>
 <path class="garden-drift-leaf garden-drift-leaf-c" d="M217 172 Q205 169 209 181 Q220 184 217 172" fill="#e1bf92"/>
 <path class="garden-drift-leaf garden-drift-leaf-d" d="M422 173 Q410 169 414 183 Q425 183 422 173" fill="#d8e8ae"/>
 </g>
 <g transform="translate(530 177)"><g class="garden-butterfly"><path d="M0 0 Q-24 -27 -25 -5 Q-19 9 0 4 Q18 10 23 -6 Q20 -27 0 0Z" fill="#eabfa2"/><path d="M0 0V10" stroke="#8a775d" stroke-width="2"/></g></g>
 <g transform="translate(193 208)"><g class="garden-butterfly garden-butterfly-second" aria-hidden="true"><path d="M0 0 Q-15 -19 -18 -3 Q-13 8 0 3 Q13 8 17 -4 Q15 -18 0 0Z" fill="#f7d9aa"/><path d="M0 0V7" stroke="#96785d" stroke-width="1.7"/></g></g>
 <g class="garden-fireflies" fill="#f9eabb"><circle cx="220" cy="175" r="3"/><circle cx="560" cy="195" r="3"/><circle cx="469" cy="211" r="2.4"/><circle cx="290" cy="125" r="2.7"/></g>
 </svg>`;
function scene(saved,concepts){
 const flowers=(Array.isArray(saved)?saved:[]).slice(-5);
 const chips=flowers.map((item,i)=>{
  const c=(concepts||[]).find(v=>v.id===item.id);
  return c?'<button type="button" class="garden-flower garden-flower-'+i+'" data-auto="related" data-id="'+String(c.id).replace(/[^a-z0-9-]/g,'')+'" aria-label="Explore saved idea: '+String(c.term).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'"><span aria-hidden="true">✿</span></button>':'';
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
