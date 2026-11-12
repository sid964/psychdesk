// Small moving residents, wild birds and butterflies. All motion is optional.
export function createLife(THREE,scene,routes,height,{coarse=false,reduced=false,night=false}={}){
 const colors={
  skin:[0x9d735b,0xb98e74,0xc5a38a,0x8b6557],
  clothes:[0x9d7862,0x596e77,0x897a8a,0x7e8169],
  trouser:[0x474a52,0x5b5a56,0x4b5357,0x656257]
 };
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.94});
 const flesh=colors.skin.map(mat),cloth=colors.clothes.map(mat),pants=colors.trouser.map(mat),hair=mat(0x40352e);
 const trunk=mat(0x60483e);
 const people=[],interact=[];
 function cylinder(r1,r2,h,m,root,y=0){
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,10),m);
  mesh.position.y=y;mesh.castShadow=!coarse;root.add(mesh);return mesh;
 }
 function ball(r,m,parent,x,y,z,scale=[1,1,1]){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,9),m);
  mesh.position.set(x,y,z);mesh.scale.set(...scale);mesh.castShadow=!coarse;parent.add(mesh);return mesh;
 }
 for(let i=0;i<(coarse?2:4);i++){
  const person=new THREE.Group();person.userData.person=true;
  person.userData.name=['A reader on an afternoon walk','A neighbor exploring the gardens','A researcher taking a break','Someone enjoying the quiet path'][i];
  const legs=[],arms=[];
  const body=new THREE.Group();body.position.y=.9;person.add(body);
  cylinder(.26,.2,.7,cloth[i],body,.37);
  ball(.26,flesh[i],body,0,1.05,0,[.88,1.13,.87]);
  ball(.27,hair,body,0,1.23,-.04,[.95,.36,.91]);
  cylinder(.08,.07,.38,flesh[i],body,.8);
  for(const side of [-1,1]){
   const arm=new THREE.Group();arm.position.set(side*.29,.62,0);body.add(arm);
   cylinder(.085,.07,.62,cloth[i],arm,-.28);
   ball(.08,flesh[i],arm,0,-.62,0);arms.push({arm,side});
   const leg=new THREE.Group();leg.position.set(side*.12,-.05,0);body.add(leg);
   cylinder(.105,.085,.69,pants[i],leg,-.31);
   ball(.125,trunk,leg,0,-.7,.09,[1,.57,1.55]);legs.push({leg,side});
  }
  person.scale.setScalar(.95+i*.035);
  scene.add(person);people.push({person,body,legs,arms,route:routes[i%routes.length],phase:i*1.77,speed:.019+i*.0026,shift:i*.23});
  interact.push(person);
 }
 // Two small rabbits bring subtle movement to the woodland edge.
 const rabbits=[];const rabbitMat=mat(0xafa18b),innerEar=mat(0xc8aa9a);
 for(let i=0;i<2;i++){
  const root=new THREE.Group();
  ball(.42,rabbitMat,root,0,.35,0,[1,.83,1.35]);
  ball(.3,rabbitMat,root,0,.45,.42,[1,1,1.0]);
  for(const x of [-.16,.16]){
   const ear=ball(.10,rabbitMat,root,x,.89,.52,[.72,2.2,.55]);
   ear.rotation.z=x*.7;
   ball(.054,innerEar,root,x,.92,.57,[.6,2,.4]);
  }
  ball(.10,rabbitMat,root,0,.4,-.51,[1,1,1]);
  scene.add(root);rabbits.push(root);
 }
 // Low-detail wildlife stays atmospheric rather than drawing attention to itself.
 const birds=[],birdMat=mat(night?0x8a9298:0x5b6666);
 for(let i=0;i<(coarse?3:6);i++){
  const bird=new THREE.Group();
  const wingGeometry=new THREE.BufferGeometry();
  wingGeometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.66,.04,.13,-.21,.06,.33],3));
  wingGeometry.computeVertexNormals();
  const wingLeft=new THREE.Mesh(wingGeometry,new THREE.MeshLambertMaterial({color:0x696f6b,side:THREE.DoubleSide}));
  const wingRight=wingLeft.clone();wingRight.scale.x=-1;
  bird.add(wingLeft,wingRight);
  ball(.12,birdMat,bird,0,0,0,[1,.65,1.7]);
  scene.add(bird);birds.push({bird,wingLeft,wingRight,phase:i*1.1,rad:17+i*2.8,height:9+(i%3)*2});
 }
 const butterflies=[];
 const wingColors=[0xe4c2ac,0xdbd5b0,0xc9c6d5].map(x=>new THREE.MeshStandardMaterial({color:x,side:THREE.DoubleSide,roughness:.88}));
 for(let i=0;i<(coarse?5:15);i++){
  const root=new THREE.Group();
  const left=ball(.14,wingColors[i%3],root,-.13,0,0,[1.3,.1,1.0]);
  const right=ball(.14,wingColors[i%3],root,.13,0,0,[1.3,.1,1.0]);
  ball(.05,trunk,root,0,0,0,[.6,1.4,.7]);
  scene.add(root);butterflies.push({root,left,right,x:(i%5-2)*5.5,z:(Math.floor(i/5)-1)*7,phase:i*.83});
 }
 function animate(t,dt){
  if(reduced){
   if(!people[0].frozen){
    for(const p of people){
     const pos=p.route.getPoint(.54);
     p.person.position.set(pos.x,height(pos.x,pos.z),pos.z);
     p.person.rotation.y=Math.atan2(p.route.getTangent(.54).x,p.route.getTangent(.54).z);
    }
    people[0].frozen=true;
   }
   return;
  }
  for(const p of people){
   const cyc=(t*p.speed+p.shift)%2,s=cyc<=1?cyc:2-cyc,dir=cyc<=1?1:-1;
   const u=.10+s*.78,pos=p.route.getPoint(u),tan=p.route.getTangent(u);
   p.person.position.set(pos.x,height(pos.x,pos.z)+Math.abs(Math.sin(t*7.2+p.phase))*.023,pos.z);
   p.person.rotation.y=Math.atan2(tan.x*dir,tan.z*dir);
   const gait=Math.sin(t*7+p.phase);
   p.body.rotation.z=Math.sin(t*3.5+p.phase)*.018;
   p.legs.forEach(({leg,side})=>leg.rotation.x=gait*side*.38);
   p.arms.forEach(({arm,side})=>arm.rotation.x=-gait*side*.38);
  }
  rabbits.forEach((r,i)=>{
   const phase=t*.22+i*2;
   const x=14+Math.sin(phase)*2.7,z=14+Math.cos(phase*.7)*2.4;
   r.position.set(x,height(x,z)+Math.max(0,Math.sin(t*1.2+i*3))*.11,z);
   r.rotation.y=phase+1;
  });
  birds.forEach(({bird,wingLeft,wingRight,phase,rad,height:h})=>{
   const a=t*.1+phase;
   bird.position.set(Math.sin(a)*rad, h+Math.sin(a*1.3)*1.1,Math.cos(a)*rad*.65);
   bird.rotation.y=a+.7;
   wingLeft.rotation.z=.32*Math.sin(t*7+phase);
   wingRight.rotation.z=-.32*Math.sin(t*7+phase);
  });
  butterflies.forEach(({root,left,right,x,z,phase},i)=>{
   root.position.set(x+Math.sin(t*.68+phase)*.9,height(x,z)+1.2+Math.sin(t*1.7+phase)*.24,z+Math.cos(t*.7+phase)*.85);
   root.rotation.y=t*.3+phase;
   const flutter=Math.sin(t*12+i);
   left.rotation.z=flutter*.55;right.rotation.z=-flutter*.55;
  });
 }
 animate(0,0);
 return {people:interact,animate};
}
