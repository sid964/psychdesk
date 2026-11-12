import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// A lightweight, optional world. PsychDesk study data remains in the parent app.
// Every destination is also available through the semantic HTML navigation.
const destinations=[
 {id:'notes',name:'Notebook House',x:-10,z:7,color:0xc99077,kind:'house'},
 {id:'materials',name:'Research Library',x:0,z:-10,color:0x9fa6be,kind:'library'},
 {id:'garden',name:'Memory Garden',x:10,z:-5,color:0xc8ae83,kind:'garden'},
 {id:'recall',name:'Recall Pavilion',x:0,z:10,color:0xc9a98b,kind:'house'},
 {id:'dictionary',name:'Concept Observatory',x:-10,z:-8,color:0xada4ca,kind:'tower'},
 {id:'focus',name:'Quiet Clearing',x:10,z:9,color:0xb5a997,kind:'clearing'}
];
const allowed=new Set(destinations.map(p=>p.id));
const canvasHost=document.getElementById('worldCanvas');
const pinsHost=document.getElementById('worldPins');
const message=document.getElementById('worldMessage');
const ambientButton=document.getElementById('ambientToggle');
const motionReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=window.matchMedia('(pointer: coarse)').matches;
const tabFromTarget=target=>target?.closest?.('[data-visit]')?.dataset.visit;
function visit(tab){
 if(!allowed.has(tab))return;
 if(window.parent!==window){
  window.parent.postMessage({type:'psychworld:visit',tab},location.origin);
 }else{
  location.href='../index.html';
 }
}
document.addEventListener('click',event=>{const tab=tabFromTarget(event.target);if(tab)visit(tab);});
document.getElementById('worldClose').addEventListener('click',()=>{
 if(window.parent!==window)window.parent.postMessage({type:'psychworld:close'},location.origin);
 else location.href='../index.html';
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if(window.parent!==window)window.parent.postMessage({type:'psychworld:close'},location.origin);
  else location.href='../index.html';
 }
});
function fail(text){
 message.textContent=text+' You can still use the study destinations below.';
 canvasHost.style.display='none';
}
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:!coarse,alpha:false,powerPreference:'default'});}
catch{fail('3D graphics are unavailable on this device.');}
if(renderer){
 const scene=new THREE.Scene();
 const hour=new Date().getHours();
 const night=hour>=19||hour<6;
 scene.background=new THREE.Color(night?0x142533:0x8ea8b3);
 scene.fog=new THREE.Fog(night?0x142533:0x8ea8b3,38,92);
 const camera=new THREE.PerspectiveCamera(43,1,.1,180);
 camera.position.set(26,25,28);
 canvasHost.appendChild(renderer.domElement);
 const controls=new OrbitControls(camera,renderer.domElement);
 controls.target.set(0,0,0);controls.enableDamping=!motionReduced;controls.dampingFactor=.055;
 controls.minDistance=9;controls.maxDistance=62;controls.maxPolarAngle=Math.PI*.48;
 controls.minPolarAngle=.18;controls.enablePan=true;
 const hemisphere=new THREE.HemisphereLight(night?0xa2b9df:0xfff3dc,0x33463a,night?1.25:2.05);
 scene.add(hemisphere);
 const sunlight=new THREE.DirectionalLight(night?0xb4c9e0:0xffdfb9,night?1.6:2.5);
 sunlight.position.set(-10,22,12);scene.add(sunlight);
 const material=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness,flatShading:true});
 const earth=material(0x6b6153),grass=material(night?0x53675e:0x76947a),pathmat=material(0xc4b59e);
 const watermat=new THREE.MeshStandardMaterial({color:night?0x406477:0x6ea8aa,roughness:.33,metalness:.07,transparent:true,opacity:.86});
 const trunkMat=material(0x796351),leafMat=[material(0x71866e),material(0x93a385),material(0x607b74),material(0xaab08b)];
 const windowMat=material(night?0xffd69f:0xf7ecd0),stone=material(0x9ca39b);
 const cylinder=(r1,r2,h,segments,mat,x,y,z)=>{
  const o=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat);
  o.position.set(x,y,z);scene.add(o);return o;
 };
 cylinder(40,40,.13,64,watermat,0,-1.35,0);
 cylinder(22.4,21.2,2.4,48,earth,0,-1.45,0);
 cylinder(22.45,22.45,.22,48,grass,0,-.16,0);
 // Each path connects the central meeting place to an educational destination.
 cylinder(3.2,3.2,.08,32,pathmat,0,.02,0);
 for(const p of destinations){
  const dx=p.x,dz=p.z,dist=Math.hypot(dx,dz);
  const strip=new THREE.Mesh(new THREE.BoxGeometry(2.3,.055,dist),pathmat);
  strip.position.set(dx/2,-.01,dz/2);strip.rotation.y=Math.atan2(dx,dz);scene.add(strip);
 }
 // Rocks, hand-placed groves and a soft landmark horizon.
 for(let i=0;i<46;i++){
  const angle=i*2.39996323,rad=9+(i%7)*1.83;
  const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad;
  if(destinations.some(p=>Math.hypot(x-p.x,z-p.z)<4.2))continue;
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.24,1.65,6),trunkMat);
  trunk.position.set(x,.83,z);scene.add(trunk);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(.9+(i%3)*.18,2.65+(i%4)*.16,6),leafMat[i%leafMat.length]);
  crown.position.set(x,2.45,z);crown.rotation.y=angle;scene.add(crown);
  if(i%4===0){
   const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.45,0),stone);
   rock.position.set(x+.95,.22,z-.6);rock.scale.y=.58;scene.add(rock);
  }
 }
 const interactive=[];
 function box(parent,w,h,d,mat,x,y,z){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 }
 for(const p of destinations){
  const group=new THREE.Group();group.position.set(p.x,.12,p.z);
  group.userData.placeId=p.id;scene.add(group);interactive.push(group);
  const wall=material(p.color),roof=material(p.kind==='tower'?0x666078:0x715c5a);
  if(p.kind==='garden'){
   const soil=new THREE.Mesh(new THREE.CylinderGeometry(3,3,.28,12),material(0x87957b));
   soil.position.y=.02;group.add(soil);
   for(let j=0;j<8;j++){
    const t=j*Math.PI/4,stem=box(group,.12,.9,.12,leafMat[j%4],Math.cos(t)*2,.52,Math.sin(t)*2);
    const blossom=new THREE.Mesh(new THREE.DodecahedronGeometry(.4,0),material(j%2?0xf3d2b5:0xd5b4b9));
    blossom.position.set(stem.position.x,1.15,stem.position.z);group.add(blossom);
   }
   const tree=new THREE.Mesh(new THREE.DodecahedronGeometry(1.6,1),leafMat[1]);
   tree.position.set(0,2.6,0);group.add(tree);
  }else if(p.kind==='clearing'){
   const floor=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,.14,18),material(0xbaa992));
   floor.position.y=.08;group.add(floor);
   for(let j=0;j<5;j++){
    const a=j*2*Math.PI/5;
    box(group,.35,.5,.35,trunkMat,Math.cos(a)*2,.4,Math.sin(a)*2);
   }
   // The clearing remains open for calm, unobstructed reading.
  }else if(p.kind==='tower'){
   const base=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.85,3.8,8),wall);
   base.position.y=1.85;group.add(base);
   const dome=new THREE.Mesh(new THREE.ConeGeometry(2,1.75,8),roof);
   dome.position.y=4.6;group.add(dome);
   box(group,1.1,1,.12,windowMat,0,2.3,1.45);
  }else{
   const w=p.kind==='library'?5:3.6,h=p.kind==='library'?3:2.65;
   box(group,w,h,3.4,wall,0,h/2,0);
   const top=new THREE.Mesh(new THREE.ConeGeometry(p.kind==='library'?3.95:3.2,1.75,4),roof);
   top.position.y=h+.67;top.rotation.y=Math.PI/4;group.add(top);
   box(group,1.05,1.2,.13,windowMat,-w/4,1.6,1.74);
   box(group,1.05,1.2,.13,windowMat,w/4,1.6,1.74);
   box(group,.82,1.45,.16,trunkMat,0,.73,1.79);
  }
  const halo=new THREE.Mesh(new THREE.RingGeometry(2.6,2.75,40),new THREE.MeshBasicMaterial({color:0xf4deb1,side:THREE.DoubleSide,transparent:true,opacity:.62}));
  halo.rotation.x=-Math.PI/2;halo.position.y=.12;group.add(halo);
 }
 // Deliberate, low-cost environmental motion (no particles or postprocessing).
 const clouds=[];
 for(let i=0;i<4;i++){
  const cloud=new THREE.Group();
  for(let j=0;j<3;j++){
   const puff=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7+(j%2)*.55,1),new THREE.MeshBasicMaterial({color:night?0x617486:0xe8dfcb,transparent:true,opacity:.42}));
   puff.position.set((j-1)*1.7,j===1?.55:0,0);cloud.add(puff);
  }
  cloud.position.set(-17+i*12,12+i%2*2,-20+(i%3)*15);scene.add(cloud);clouds.push(cloud);
 }
 const labels=destinations.map(p=>{
  const button=document.createElement('button');button.type='button';button.className='world-pin';
  button.textContent=p.name;button.dataset.visit=p.id;pinsHost.appendChild(button);
  return {button,p,point:new THREE.Vector3(p.x,p.kind==='tower'?6.4:4.7,p.z)};
 });
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
 const canvas=renderer.domElement;
 function hit(event){
  const rect=canvas.getBoundingClientRect();
  pointer.x=((event.clientX-rect.left)/rect.width)*2-1;
  pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  for(const h of raycaster.intersectObjects(interactive,true)){
   let node=h.object;
   while(node&&!node.userData.placeId)node=node.parent;
   if(node?.userData.placeId)return node.userData.placeId;
  }
  return null;
 }
 let pressed=null;
 canvas.addEventListener('pointerdown',e=>{pressed={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  canvas.style.cursor=hit(e)?'pointer':'grab';
 });
 canvas.addEventListener('pointerup',e=>{
  if(pressed&&Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y)<6){
   const id=hit(e);if(id)visit(id);
  }
  pressed=null;
 });
 const keys=new Set();
 window.addEventListener('keydown',e=>{if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement?.tagName))keys.add(e.key.toLowerCase());});
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
 window.addEventListener('blur',()=>keys.clear());
 let ambient=false;
 ambientButton.addEventListener('click',()=>{
  ambient=!ambient;controls.autoRotate=ambient&&!motionReduced;
  controls.autoRotateSpeed=.3;ambientButton.setAttribute('aria-pressed',String(ambient));
  ambientButton.textContent=ambient?'Ambient mode on':'Ambient mode';
 });
 function reset(){
  camera.position.set(26,25,28);controls.target.set(0,0,0);controls.update();
 }
 document.getElementById('worldReset').addEventListener('click',reset);
 try{
  const saved=JSON.parse(sessionStorage.getItem('psychworld-view-v1')||'null');
  if(saved?.camera?.length===3&&saved?.target?.length===3&&[...saved.camera,...saved.target].every(v=>Number.isFinite(v)&&Math.abs(v)<100)){
   camera.position.fromArray(saved.camera);controls.target.fromArray(saved.target);
  }
 }catch{}
 controls.addEventListener('end',()=>{
  try{sessionStorage.setItem('psychworld-view-v1',JSON.stringify({camera:camera.position.toArray(),target:controls.target.toArray()}));}catch{}
 });
 const observer=new ResizeObserver(()=>{
  const width=canvasHost.clientWidth,height=canvasHost.clientHeight;
  if(width&&height){camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}
 });
 observer.observe(canvasHost);
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,coarse?1.25:1.75));
 let previous=performance.now(),elapsed=0;
 const forward=new THREE.Vector3(),right=new THREE.Vector3(),shift=new THREE.Vector3(),screen=new THREE.Vector3();
 function animate(now){
  const delta=Math.min((now-previous)/1000,.05);previous=now;elapsed+=delta;
  forward.subVectors(controls.target,camera.position);forward.y=0;forward.normalize();
  right.set(-forward.z,0,forward.x);shift.set(0,0,0);
  if(keys.has('w'))shift.add(forward);
  if(keys.has('s'))shift.sub(forward);
  if(keys.has('a'))shift.sub(right);
  if(keys.has('d'))shift.add(right);
  if(shift.lengthSq()){
   shift.normalize().multiplyScalar(delta*8);
   const next=controls.target.clone().add(shift);
   if(Math.hypot(next.x,next.z)<20){controls.target.add(shift);camera.position.add(shift);}
  }
  if(!motionReduced)clouds.forEach((c,i)=>{c.position.x+=delta*(.045+i*.008);if(c.position.x>35)c.position.x=-35;});
  controls.update();
  for(const {button,point} of labels){
   screen.copy(point).project(camera);
   const visible=screen.z<1&&screen.z>-1&&Math.abs(screen.x)<.9&&Math.abs(screen.y)<.84;
   button.hidden=!visible;
   if(visible){button.style.left=((screen.x+1)/2*100)+'%';button.style.top=((-screen.y+1)/2*100)+'%';}
  }
  renderer.render(scene,camera);
 }
 function visibility(){
  if(document.hidden){renderer.setAnimationLoop(null);}
  else{previous=performance.now();renderer.setAnimationLoop(animate);}
 }
 document.addEventListener('visibilitychange',visibility);
 visibility();
 window.addEventListener('pagehide',()=>{
  renderer.setAnimationLoop(null);observer.disconnect();controls.dispose();
  const geometries=new Set(),materials=new Set();
  scene.traverse(obj=>{
   if(obj.geometry)geometries.add(obj.geometry);
   if(obj.material)(Array.isArray(obj.material)?obj.material:[obj.material]).forEach(m=>materials.add(m));
  });
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();
 },{once:true});
}
