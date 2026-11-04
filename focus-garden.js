/* Focus Garden — original scenic artwork and optional ambience controls.
   No study data, timing, or account state is stored in this module. */
(()=>{
'use strict';
const storageKey='psychdesk-focus-garden-motion-v1';
const svg=`<svg class="focus-garden-art" viewBox="0 0 1080 630" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
<defs>
 <radialGradient id="fgMoonGlow"><stop stop-color="#b6dfc2" stop-opacity=".30"/><stop offset=".55" stop-color="#89b4b0" stop-opacity=".10"/><stop offset="1" stop-color="#809c9b" stop-opacity="0"/></radialGradient>
 <linearGradient id="fgMountain" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#31564f"/><stop offset="1" stop-color="#16332d"/></linearGradient>
 <linearGradient id="fgMeadow" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#142d25"/><stop offset="1" stop-color="#091712"/></linearGradient>
 <linearGradient id="fgPond" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#5f9992" stop-opacity=".7"/><stop offset="1" stop-color="#183b38" stop-opacity=".4"/></linearGradient>
 <filter id="fgSoftBlur"><feGaussianBlur stdDeviation="17"/></filter>
</defs>
<!-- moon and a deep soft sky -->
<circle class="focus-garden-moon-halo" cx="550" cy="175" r="245" fill="url(#fgMoonGlow)"/>
<circle cx="550" cy="169" r="57" fill="#dfead9" opacity=".86"/>
<circle cx="537" cy="151" r="43" fill="#f7f0d7" opacity=".5"/>
<g fill="#ebf2da" opacity=".62" class="focus-garden-stars">
 <circle cx="91" cy="91" r="1.7"/><circle cx="232" cy="138" r="1.1"/><circle cx="328" cy="73" r="1.7"/><circle cx="783" cy="104" r="1.5"/><circle cx="944" cy="83" r="1.5"/><circle cx="1012" cy="188" r="1.2"/><circle cx="145" cy="205" r="1.2"/><circle cx="831" cy="217" r="1.3"/>
</g>
<g class="focus-garden-cloud" fill="#709b91" opacity=".16"><ellipse cx="257" cy="132" rx="140" ry="16"/><ellipse cx="309" cy="119" rx="87" ry="18"/><ellipse cx="820" cy="189" rx="130" ry="15"/></g>
<path d="M0 400 100 332 194 383 304 310 410 386 544 300 665 385 788 321 907 399 1014 345 1080 376V630H0Z" fill="#28453e" opacity=".66"/>
<path d="M0 441 153 347 273 413 413 326 549 412 703 329 851 429 963 361 1080 403V630H0Z" fill="url(#fgMountain)" opacity=".93"/>
<path d="M0 482Q128 422 258 471T531 453Q686 412 830 466T1080 429V630H0Z" fill="#17372e"/>
<g class="focus-garden-mist" filter="url(#fgSoftBlur)" fill="#7ea9a1" opacity=".16"><ellipse cx="480" cy="457" rx="550" ry="26"/><ellipse cx="770" cy="509" rx="360" ry="19"/></g>
<!-- a quiet reflecting pool -->
<ellipse cx="548" cy="549" rx="350" ry="61" fill="#0b2824"/>
<ellipse cx="548" cy="541" rx="302" ry="40" fill="url(#fgPond)" opacity=".75"/>
<path class="focus-garden-ripple" d="M390 539q85 -17 188 0t152 0" stroke="#b7d5c6" opacity=".36" stroke-width="2" fill="none" stroke-linecap="round"/>
<path class="focus-garden-ripple ripple-two" d="M440 554q103 -13 198 0" stroke="#d0e7d8" opacity=".22" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M0 519Q172 487 301 522Q404 576 532 593Q742 579 843 515T1080 506V630H0Z" fill="url(#fgMeadow)"/>
<path d="M0 572Q140 542 288 574T567 617Q822 557 1080 571V630H0Z" fill="#0a1d16" opacity=".92"/>
<!-- rooted trees; only their inner foliage sways -->
<g transform="translate(102 501)"><path d="M-8 0V-222H7V0" fill="#14281e"/><g class="focus-garden-pine pine-one"><path d="M-87 -101 0 -316 87 -101Z" fill="#315d47"/><path d="M-76 -161 0 -351 76 -161Z" fill="#3f7355"/><path d="M-57 -231 0 -383 57 -231Z" fill="#477d5b"/><path d="M-16 -313 0 -373 18 -313" fill="none" stroke="#80a484" opacity=".35" stroke-width="5" stroke-linecap="round"/></g></g>
<g transform="translate(252 481) scale(.76)"><path d="M-7 0V-185H7V0" fill="#173026"/><g class="focus-garden-pine pine-two"><path d="M-65 -87 0 -248 65 -87Z" fill="#2b5844"/><path d="M-53 -150 0 -302 53 -150Z" fill="#356b4d"/><path d="M-38 -211 0 -343 38 -211Z" fill="#487e5d"/></g></g>
<g transform="translate(974 508)"><path d="M-9 0V-232H8V0" fill="#132820"/><g class="focus-garden-pine pine-three"><path d="M-95 -97 0 -320 95 -97Z" fill="#2a5744"/><path d="M-80 -169 0 -364 80 -169Z" fill="#3c7052"/><path d="M-60 -242 0 -395 60 -242Z" fill="#498061"/></g></g>
<g transform="translate(845 483) scale(.73)"><path d="M-8 0V-185H8V0" fill="#193225"/><g class="focus-garden-pine pine-four"><path d="M-79 -78 0 -250 79 -78Z" fill="#2c5946"/><path d="M-65 -141 0 -312 65 -141Z" fill="#3d7655"/><path d="M-42 -219 0 -340 42 -219Z" fill="#53916a"/></g></g>
<g class="focus-garden-reeds" stroke="#69a07a" stroke-width="3" stroke-linecap="round" fill="none" opacity=".85">
 <g transform="translate(360 578)" class="focus-garden-reed"><path d="M0 0Q-14 -31 -13 -49M0 0Q6 -41 17 -57M0 0Q-22 -12 -38 -24"/></g>
 <g transform="translate(719 574)" class="focus-garden-reed reed-two"><path d="M0 0Q8 -28 6 -56M0 0Q-15 -30 -22 -42M0 0Q16 -16 31 -20"/></g>
 <g transform="translate(179 540)" class="focus-garden-reed reed-three"><path d="M0 0Q-12 -31 -9 -51M0 0Q12 -38 19 -44"/></g>
</g>
<g class="focus-garden-lights" fill="#e5dba2">
 <circle cx="351" cy="372" r="3.3"/><circle cx="708" cy="348" r="2.7"/><circle cx="821" cy="408" r="2.1"/><circle cx="279" cy="412" r="2.6"/><circle cx="741" cy="475" r="2.9"/>
</g>
<g class="focus-garden-drifting-leaves" fill="#a6bc83">
 <path class="focus-garden-leaf leaf-one" d="M281 231q-9 -13 -17 -2q3 13 17 2Z"/>
 <path class="focus-garden-leaf leaf-two" d="M787 255q-11 -9 -14 6q9 9 14 -6Z"/>
 <path class="focus-garden-leaf leaf-three" d="M690 159q-10 -10 -15 3q12 8 15 -3Z"/>
</g>
</svg>`;
function scene(){return svg;}
let motionOn=true;
try{motionOn=localStorage.getItem(storageKey)!=='off';}catch{}
function update(){
 document.documentElement.dataset.focusGardenMotion=motionOn?'on':'off';
 const b=document.querySelector('[data-focus-garden-action="motion"]');
 if(b){b.textContent=motionOn?'Wind on':'Wind off';b.setAttribute('aria-pressed',String(motionOn));b.setAttribute('aria-label',motionOn?'Pause focus garden motion':'Resume focus garden motion');}
}
function isMotionOn(){return motionOn;}
document.addEventListener('click',e=>{
 const control=e.target.closest('[data-focus-garden-action="motion"]');
 if(!control)return;
 motionOn=!motionOn;
 try{localStorage.setItem(storageKey,motionOn?'on':'off');}catch{}
 update();
});
document.addEventListener('visibilitychange',()=>{
 document.documentElement.classList.toggle('focus-garden-hidden',document.hidden);
});
update();
window.PsychDeskFocusGarden={scene,isMotionOn};
})();
