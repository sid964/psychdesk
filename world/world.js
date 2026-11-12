import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createLandscape } from './landscape.js?v=immersive-20261112';
import { createPlaces } from './places.js';
import { createLife } from './life.js';

// An atmospheric landscape, not a low-poly island: organic terrain, architecture,
// resident walkers and wildlife. All actual study records stay in PsychDesk.
const destinations=[
 {id:'notes',name:'Notebook Cottage',x:-13,z:7},
 {id:'materials',name:'Research Library',x:-1,z:-14},
 {id:'garden',name:'Memory Garden',x:13,z:-7},
 {id:'recall',name:'Recall Pavilion',x:-1,z:12},
 {id:'dictionary',name:'Concept Observatory',x:-14,z:-10},
 {id:'focus',name:'Quiet Clearing',x:15,z:9}
];
const host=document.getElementById('worldCanvas');
const pinsHost=document.getElementById('worldPins');
const message=document.getElementById('worldMessage');
const ambientButton=document.getElementById('ambientToggle');
const resetButton=document.getElementById('worldReset');
const qualityButton=document.getElementById('qualityToggle');
const tourButton=document.getElementById('worldTour');
const status=document.getElementById('worldStatus');
const coarse=matchMedia('(pointer: coarse)').matches;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const lowMemory=Number(navigator.deviceMemory||8)<4;
const quality=coarse||lowMemory?'medium':'high';
const night=new Date().getHours()>=19||new Date().getHours()<6;
const tip=(title,body,destination)=>{
 if(window.PsychDeskWorldUI?.showDetail)window.PsychDeskWorldUI.showDetail(title,body,destination);
};
const visit=tab=>window.PsychDeskWorldUI?.visit?.(tab);
function error(text){
 message.textContent=text+' The study destinations below remain available.';
 host.style.display='none';
 if(ambientButton)ambientButton.disabled=true;
 if(qualityButton)qualityButton.disabled=true;
}
let renderer;
try{
 renderer=new THREE.WebGLRenderer({antialias:!coarse&&!lowMemory,alpha:false,powerPreference:'high-performance',stencil:false});
}catch{
 error('3D rendering is unavailable on this device.');
}
if(renderer){
 const scene=new THREE.Scene();
 const horizon=night?0x71858d:0xc3d2cc;
 scene.background=new THREE.Color(horizon);
 scene.fog=new THREE.FogExp2(horizon,night?.012:.0097);
 const camera=new THREE.PerspectiveCamera(49,1,.12,240);
 camera.position.set(34,24,40);
 camera.lookAt(0,1.5,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=night?1.1:1.06;
 const pixelRatio={high:1.75,medium:1.25,low:.9};
 let tier=quality;
 function applyQuality(){
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,pixelRatio[tier]));
  renderer.shadowMap.enabled=tier==='high';
  if(sun) sun.castShadow=tier==='high';
  if(qualityButton)qualityButton.textContent='Quality: '+tier[0].toUpperCase()+tier.slice(1);
  const width=host.clientWidth,height=host.clientHeight;
  if(width&&height)renderer.setSize(width,height,false);
 }
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.shadowMap.enabled=tier==='high';
 host.appendChild(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.target.set(0,1,0);controls.minDistance=8;controls.maxDistance=76;
 controls.maxPolarAngle=Math.PI*.455;controls.minPolarAngle=.18;
 controls.enableDamping=!reduced;controls.dampingFactor=.065;
 controls.zoomSpeed=.78;controls.rotateSpeed=.57;controls.panSpeed=.8;
 controls.screenSpacePanning=true;
 // Horizon atmosphere with warm sun haze, not a solid artificial sky box.
 const sky=new THREE.Mesh(new THREE.SphereGeometry(195,40,24),
  new THREE.ShaderMaterial({
   uniforms:{
    upper:{value:new THREE.Color(night?0x1d3449:0x82a9b5)},
    lower:{value:new THREE.Color(night?0x899397:0xe2e0cb)},
    sunColor:{value:new THREE.Color(night?0xc1bdba:0xffddb1)},
    sunDirection:{value:new THREE.Vector3(-.4,.44,-.55).normalize()}
   },
   vertexShader:'varying vec3 vDir; void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:'varying vec3 vDir;uniform vec3 upper;uniform vec3 lower;uniform vec3 sunColor;uniform vec3 sunDirection;void main(){vec3 d=normalize(vDir);float h=smoothstep(-.18,.75,d.y);vec3 c=mix(lower,upper,h);float glow=pow(max(dot(d,sunDirection),0.0),22.0)*.19; c=mix(c,sunColor,glow);gl_FragColor=vec4(c,1.0);}',
   side:THREE.BackSide,depthWrite:false,fog:false
  })
 );
 scene.add(sky);
 const skyLight=new THREE.HemisphereLight(night?0x93a8c8:0xf8f1df,night?0x3b5043:0x4d6651,night?1.25:1.65);
 scene.add(skyLight);
 const sun=new THREE.DirectionalLight(night?0xc8c8bc:0xffe2b7,night?1.2:2.5);
 sun.position.set(-28,48,22);
 sun.castShadow=tier==='high';
 sun.shadow.mapSize.set(1536,1536);
 sun.shadow.camera.near=.5;sun.shadow.camera.far=135;
 sun.shadow.camera.left=-46;sun.shadow.camera.right=46;
 sun.shadow.camera.top=46;sun.shadow.camera.bottom=-46;
 sun.shadow.bias=-.0005;
 sun.shadow.normalBias=.025;
 sun.shadow.radius=3;
 scene.add(sun);
 applyQuality();
 const landscape=createLandscape(THREE,scene,destinations,{coarse:tier!=='high',reduced,night});
 const places=createPlaces(THREE,scene,destinations,landscape.height,{coarse:tier!=='high',night});
 const life=createLife(THREE,scene,landscape.routes,landscape.height,{coarse:tier!=='high',reduced,night});
 // The scene can be used even if decoration fails to load; navigation is independent.
 const labels=destinations.map(d=>{
  const button=document.createElement('button');
  button.type='button';button.className='world-pin';
  button.textContent=d.name;button.dataset.look=d.id;
  button.setAttribute('aria-label','Approach '+d.name);
  pinsHost.appendChild(button);
  return {button,d,at:new THREE.Vector3(d.x,landscape.height(d.x,d.z)+(d.id==='dictionary'?7.7:d.id==='garden'?7:5.3),d.z)};
 });
 // A guided camera visit is separate from opening a study tool. It keeps the
 // World useful as a place to explore, with direct tool links always available.
 const placeStories={
  notes:'A quiet cottage for writing, returning to notes and finding a thought again.',
  materials:'The library leads into reading materials and saved research.',
  garden:'A living landmark for memories and discoveries saved while studying.',
  recall:'A place to practice recalling what was learned, without rushing.',
  dictionary:'Explore psychological ideas and the relationships between concepts.',
  focus:'An open, quiet space that leads to focused study.'
 };
 const detail=document.getElementById('worldDetail');
 let tourIndex=-1,cameraFlight=null;
 function focusPlace(id){
  const index=destinations.findIndex(d=>d.id===id);
  if(index<0)return false;
  const d=destinations[index];tourIndex=index;
  const endTarget=new THREE.Vector3(d.x,landscape.height(d.x,d.z)+(id==='dictionary'?3.2:2.2),d.z);
  const offset=new THREE.Vector3().subVectors(camera.position,controls.target);
  offset.y=0;
  if(offset.lengthSq()<.01)offset.set(1,0,1);
  offset.normalize().multiplyScalar(id==='dictionary'?18:14.5);
  const endPosition=endTarget.clone().add(offset).add(new THREE.Vector3(0,id==='dictionary'?10:8.2,0));
  cameraFlight={startCamera:camera.position.clone(),startTarget:controls.target.clone(),endPosition,endTarget,progress:0};
  if(reduced){
   camera.position.copy(endPosition);controls.target.copy(endTarget);
   cameraFlight=null;controls.update();
  }
  ambient=false;controls.autoRotate=false;
  ambientButton.setAttribute('aria-pressed','false');ambientButton.textContent='Ambient mode';
  labels.forEach(({button, d:location})=>button.setAttribute('aria-current',location.id===id?'location':'false'));
  document.body.classList.add('world-exploring');
  tip(d.name,placeStories[id],id);
  if(tourButton){tourButton.textContent='Next place';tourButton.title='Next: '+destinations[(index+1)%destinations.length].name;}
  if(status)status.textContent='Living landscape · viewing '+d.name;
  return true;
 }
 function resetView(){
  cameraFlight=null;tourIndex=-1;
  camera.position.set(34,24,40);controls.target.set(0,1,0);controls.update();
  labels.forEach(({button})=>button.removeAttribute('aria-current'));
  document.body.classList.remove('world-exploring');
  if(detail)detail.hidden=true;
  if(tourButton){tourButton.textContent='Explore places';tourButton.title='Approach '+destinations[0].name;}
  if(status)status.textContent='Living landscape · overview';
 }
 labels.forEach(({button,d})=>button.addEventListener('click',()=>focusPlace(d.id)));
 tourButton?.addEventListener('click',()=>focusPlace(destinations[(tourIndex+1)%destinations.length].id));
 window.PsychDeskWorld3D={focusPlace,resetView};
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),canvas=renderer.domElement;
 const selectable=[...places.interactive,...life.people];
 function pick(event){
  const bounds=canvas.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,-(event.clientY-bounds.top)/bounds.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  for(const hit of raycaster.intersectObjects(selectable,true)){
   let node=hit.object,concept=null,person=null,place=null;
   while(node){
    if(!concept&&node.userData?.concept)concept=node.userData.concept;
    if(!person&&node.userData?.person)person=node.userData.name;
    if(!place&&node.userData?.placeId)place=node.userData.placeId;
    node=node.parent;
   }
   if(concept)return {kind:'concept',value:concept};
   if(person)return {kind:'person',value:person};
   if(place)return {kind:'place',value:place};
  }
  return null;
 }
 const conceptInfo={
  'Spacing effect':'A little review spread over time usually lasts longer than the same practice packed into one session.',
  Attention:'Attention selects some information for deeper processing. It can also hide surprisingly visible events.',
  'Cognitive dissonance':'When beliefs and actions conflict, people may feel tension and try to reduce the inconsistency.'
 };
 let pointerDown=null;
 canvas.addEventListener('pointerdown',e=>{pointerDown={x:e.clientX,y:e.clientY};});
 let lastHover=0;
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch'||e.pointerType==='pen'&&e.buttons)return;
  // Raycasting the entire scene on every mouse pixel needlessly stalls the GPU.
  const now=performance.now();if(now-lastHover<70)return;lastHover=now;
  canvas.style.cursor=pick(e)?'pointer':'grab';
 });
 canvas.addEventListener('pointercancel',()=>{pointerDown=null;});
 canvas.addEventListener('pointerup',e=>{
  if(!pointerDown||Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>7){pointerDown=null;return;}
  pointerDown=null;const selected=pick(e);if(!selected)return;
  if(selected.kind==='place')visit(selected.value);
  if(selected.kind==='concept')tip(selected.value,conceptInfo[selected.value]||'Visit the psychology dictionary to discover more.','dictionary');
  if(selected.kind==='person')tip('A living world',selected.value+'. Take a moment to explore, then open a study location.');
 });
 const keyState=new Set();
 window.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey||['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))return;
  keyState.add(e.key.toLowerCase());
 });
 window.addEventListener('keyup',e=>keyState.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>keyState.clear());
 let ambient=false;
 ambientButton.addEventListener('click',()=>{
  ambient=!ambient;
  controls.autoRotate=ambient&&!reduced;controls.autoRotateSpeed=.24;
  ambientButton.setAttribute('aria-pressed',String(ambient));
  ambientButton.textContent=ambient?'Ambient mode on':'Ambient mode';
 });
 qualityButton?.addEventListener('click',()=>{
  tier=tier==='high'?'medium':tier==='medium'?'low':'high';applyQuality();
 });
 resetButton.addEventListener('click',()=>{
  camera.position.set(34,24,40);controls.target.set(0,1,0);controls.update();
 });
 try{
  const saved=JSON.parse(sessionStorage.getItem('psychworld-view-v1')||'null');
  if(saved?.camera?.length===3&&saved?.target?.length===3&&
     [...saved.camera,...saved.target].every(v=>Number.isFinite(v)&&Math.abs(v)<110)){
   camera.position.fromArray(saved.camera);controls.target.fromArray(saved.target);
  }
 }catch{}
 controls.addEventListener('end',()=>{
  try{sessionStorage.setItem('psychworld-view-v1',JSON.stringify({camera:camera.position.toArray(),target:controls.target.toArray()}));}catch{}
 });
 const ro=new ResizeObserver(()=>{
  const width=host.clientWidth,height=host.clientHeight;
  if(width&&height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
 });
 ro.observe(host);
 const forward=new THREE.Vector3(),right=new THREE.Vector3(),shift=new THREE.Vector3(),projected=new THREE.Vector3();
 let last=performance.now(),elapsed=0;
 function animate(now){
  const delta=Math.min((now-last)/1000,.05);last=now;
  elapsed+=delta;
  forward.subVectors(controls.target,camera.position);forward.y=0;forward.normalize();
  right.set(-forward.z,0,forward.x);shift.set(0,0,0);
  if(keyState.has('w')||keyState.has('arrowup'))shift.add(forward);
  if(keyState.has('s')||keyState.has('arrowdown'))shift.sub(forward);
  if(keyState.has('a')||keyState.has('arrowleft'))shift.sub(right);
  if(keyState.has('d')||keyState.has('arrowright'))shift.add(right);
  if(shift.lengthSq()){
   shift.normalize().multiplyScalar(delta*9);
   const next=controls.target.clone().add(shift);
   if(Math.hypot(next.x,next.z)<48){
    controls.target.add(shift);camera.position.add(shift);
   }
  }
  controls.update();
  if(!reduced){landscape.animate(elapsed,delta);life.animate(elapsed,delta);}
  for(const {button,at} of labels){
   projected.copy(at).project(camera);
   const visible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<.86&&Math.abs(projected.y)<.82;
   button.hidden=!visible;
   if(visible){
    button.style.left=((projected.x+1)*50)+'%';
    button.style.top=((1-projected.y)*50)+'%';
   }
  }
  renderer.render(scene,camera);
 }
 function visibility(){
  if(document.hidden)renderer.setAnimationLoop(null);
  else{last=performance.now();renderer.setAnimationLoop(animate);}
 }
 document.addEventListener('visibilitychange',visibility);
 visibility();
 if(status)status.textContent='Living landscape · '+(night?'evening':'daylight')+' · '+(reduced?'reduced motion':'gentle motion');
 window.addEventListener('pageshow',visibility);
 window.addEventListener('pagehide',event=>{
  renderer.setAnimationLoop(null);
  // Back/Forward cache keeps this document alive. Dispose only on final exit;
  // otherwise a restored page holds a dead renderer and disconnected controls.
  if(event.persisted)return;
  ro.disconnect();controls.dispose();
  const geometries=new Set(),materials=new Set(),textures=new Set();
  scene.traverse(node=>{
   if(node.geometry)geometries.add(node.geometry);
   const raw=node.material;if(raw)(Array.isArray(raw)?raw:[raw]).forEach(m=>materials.add(m));
  });
  geometries.forEach(g=>g.dispose());
  materials.forEach(m=>{
   for(const key of ['map','normalMap','roughnessMap','emissiveMap'])if(m[key])textures.add(m[key]);
   m.dispose();
  });
  textures.forEach(t=>t.dispose());sun.shadow.dispose();renderer.dispose();
 });
}
