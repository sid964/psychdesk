// Handcrafted landmarks with textured timber, warm glass, weathered stone and gardens.
export function createPlaces(THREE,scene,destinations,height,{night=false,coarse=false}={}){
 const materials={
  plaster:new THREE.MeshStandardMaterial({color:0xcbbda0,roughness:.98}),
  lightPlaster:new THREE.MeshStandardMaterial({color:0xe4d8be,roughness:.96}),
  timber:new THREE.MeshStandardMaterial({color:0x6b5343,roughness:.94}),
  timberLight:new THREE.MeshStandardMaterial({color:0xa08768,roughness:.9}),
  stone:new THREE.MeshStandardMaterial({color:0x888b7d,roughness:1}),
  roof:new THREE.MeshStandardMaterial({color:0x665849,roughness:.94,side:THREE.DoubleSide}),
  glass:new THREE.MeshPhysicalMaterial({color:0xefcfa7,emissive:0xf3ba76,emissiveIntensity:night?.78:.27,roughness:.26,metalness:.05,clearcoat:.6}),
  leaf:new THREE.MeshStandardMaterial({color:0x748f65,roughness:1}),
  flowers:[0xe5c5bd,0xe9d7ae,0xc7b5cf].map(color=>new THREE.MeshStandardMaterial({color,roughness:.8})),
  iron:new THREE.MeshStandardMaterial({color:0x4d514e,roughness:.6,metalness:.2})
 };
 function proceduralTexture(draw){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  draw(ctx);const tx=new THREE.CanvasTexture(canvas);
  tx.colorSpace=THREE.SRGBColorSpace;tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
  tx.anisotropy=coarse?1:4;return tx;
 }
 const roofTex=proceduralTexture(ctx=>{
  ctx.fillStyle='#87715c';ctx.fillRect(0,0,256,256);
  for(let y=0;y<256;y+=22){
   ctx.fillStyle=y%44?'#8f7963':'#806850';ctx.fillRect(0,y,256,20);
   ctx.strokeStyle='#51453899';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(0,y+21);ctx.lineTo(256,y+21);
   for(let x=(y/22%2)*17;x<260;x+=34){ctx.moveTo(x,y);ctx.lineTo(x,y+21);}
   ctx.stroke();
  }
  for(let i=0;i<900;i++){
   const x=(i*131)%256,y=(i*179)%256;
   ctx.fillStyle=i%2?'#b8a18526':'#332d2522';ctx.fillRect(x,y,2,2);
  }
 });
 if(roofTex){roofTex.repeat.set(2,2.4);materials.roof.map=roofTex;materials.roof.needsUpdate=true;}
 const wallTex=proceduralTexture(ctx=>{
  ctx.fillStyle='#eee7d3';ctx.fillRect(0,0,256,256);
  for(let i=0;i<1800;i++){
   const x=(i*137)%256,y=(i*211)%256;
   ctx.fillStyle=i%3?'#8f877016':'#ffffff22';ctx.fillRect(x,y,1+(i%4),1+(i%3));
  }
 });
 if(wallTex){materials.lightPlaster.map=wallTex;materials.lightPlaster.needsUpdate=true;}
 function box(group,w,h,d,mat,x,y,z,cast=true){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z);m.castShadow=cast&&!coarse;m.receiveShadow=true;group.add(m);return m;
 }
 function cylinder(group,top,bottom,h,mat,x,y,z,segments=12){
  const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,segments),mat);
  m.position.set(x,y,z);m.castShadow=!coarse;m.receiveShadow=true;group.add(m);return m;
 }
 function sphere(group,r,mat,x,y,z,sx=1,sy=1,sz=1){
  const m=new THREE.Mesh(new THREE.SphereGeometry(r,12,9),mat);
  m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=!coarse;group.add(m);return m;
 }
 function beamBetween(group,a,b,r,mat){
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(q,p);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),8),mat);
  mesh.position.copy(p.add(q).multiplyScalar(.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  mesh.castShadow=!coarse;group.add(mesh);return mesh;
 }
 function window(group,x,y,z,w=.9,h=1.1){
  box(group,w+.16,h+.17,.13,materials.timber,x,y,z,false);
  box(group,w,h,.15,materials.glass,x,y,z+.09,false);
  box(group,.07,h,.10,materials.timberLight,x,y,z+.19,false);
  box(group,w,.07,.10,materials.timberLight,x,y,z+.20,false);
  box(group,w+.26,.12,.28,materials.stone,x,y-h/2-.04,z+.12,false);
 }
 function shingles(group,w,d,top,rise){
  const geometry=new THREE.BufferGeometry(),verts=[],uvs=[],idx=[];
  const ridge=top+rise;
  for(let side of [-1,1]){
   const x=side*(w/2+.43),zFront=-d/2-.5,zBack=d/2+.5;
   const base=verts.length/3;
   verts.push(0,ridge,zFront,x,top,zFront,0,ridge,zBack,x,top,zBack);
   uvs.push(0,0,1,0,0,1,1,1);
   idx.push(base,base+1,base+2,base+1,base+3,base+2);
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(idx);geometry.computeVertexNormals();
  const roof=new THREE.Mesh(geometry,materials.roof);roof.castShadow=!coarse;roof.receiveShadow=true;group.add(roof);
  // The ridge and rain gutters soften the silhouette.
  beamBetween(group,[0,ridge,-d/2-.52],[0,ridge,d/2+.52],.1,materials.timber);
  for(const side of [-1,1])beamBetween(group,[side*(w/2+.43),top,-d/2-.5],[side*(w/2+.43),top,d/2+.5],.09,materials.timber);
 }
 function plantBox(group,x,z){
  box(group,.92,.35,.43,materials.timber,x,.34,z);
  for(let i=-1;i<=1;i++){
   sphere(group,.24,materials.leaf,x+i*.23,.65,z,.8,.68,.75);
   sphere(group,.082,materials.flowers[(i+3)%3],x+i*.24,.84,z);
  }
 }
 function lantern(group,x,y,z){
  cylinder(group,.035,.04,.72,materials.iron,x,y-.35,z,8);
  const fixture=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.37,8),materials.glass);
  fixture.position.set(x,y,z);group.add(fixture);
  cylinder(group,.24,.24,.045,materials.timber,x,y+.22,z,8);
 }
 function cottage(group,w=4.4,d=4.4,h=3.1,library=false){
  box(group,w+.7,.34,d+.65,materials.stone,0,.08,0);
  box(group,w,h,d,library?materials.lightPlaster:materials.plaster,0,h/2+.22,0);
  for(const sign of [-1,1]){
   for(const side of [-1,1])box(group,.16,h+.1,.16,materials.timberLight,side*(w/2-.18),h/2+.22,sign*(d/2-.08));
   box(group,w+.06,.15,.19,materials.timberLight,0,h*.73,sign*(d/2+.02));
  }
  shingles(group,w,d,h+.21,library?1.65:1.43);
  box(group,1.02,1.95,.19,materials.timber,0,1.19,d/2+.15);
  cylinder(group,.09,.09,.08,materials.iron,.32,1.28,d/2+.3);
  window(group,-w*.29,1.92,d/2+.12,.83,1.08);
  window(group,w*.29,1.92,d/2+.12,.83,1.08);
  if(library){
   window(group,-w*.35,2.0,-d/2-.12,.8,1.1);window(group,w*.35,2,-d/2-.12,.8,1.1);
   box(group,.72,1.75,.68,materials.stone,w*.25,h+1.2,-d*.16);
  }
  box(group,2.5,.11,1.35,materials.stone,0,.09,d/2+1.1);
  plantBox(group,-w*.37,d/2+.95);plantBox(group,w*.37,d/2+.95);
  lantern(group,-w*.37,2.3,d/2+.22);lantern(group,w*.37,2.3,d/2+.22);
 }
 function gazebo(group,radius=2.35,ornate=false){
  cylinder(group,radius,radius,.35,materials.stone,0,.10,0,12);
  for(let i=0;i<8;i++){
   const a=i*Math.PI/4,x=Math.sin(a)*radius*.91,z=Math.cos(a)*radius*.91;
   cylinder(group,.085,.11,3.0,materials.timber,x,1.68,z,8);
   sphere(group,.13,materials.iron,x,3.26,z);
  }
  const roof=new THREE.Mesh(new THREE.ConeGeometry(radius*1.18,1.32,8),materials.roof);
  roof.position.y=3.76;roof.rotation.y=Math.PI/8;roof.castShadow=!coarse;group.add(roof);
  cylinder(group,.75,.8,.16,materials.timber,0,.91,0,12);
  cylinder(group,.12,.12,.85,materials.timber,0,.52,0,8);
  if(ornate){
   for(let i=0;i<5;i++){
    const a=i*2*Math.PI/5;
    box(group,1.18,.13,.5,materials.timber,Math.sin(a)*1.54,.67,Math.cos(a)*1.54).rotation.y=a;
   }
  }
 }
 function memoryGarden(group){
  const soil=new THREE.Mesh(new THREE.CircleGeometry(3.7,40),new THREE.MeshStandardMaterial({color:0x9c9471,roughness:1}));
  soil.rotation.x=-Math.PI/2;soil.position.y=.06;group.add(soil);
  // Centerpiece: a flowering, broadleaf memory tree with irregular branches.
  cylinder(group,.29,.47,4.65,materials.timber,0,2.44,0,12);
  for(let i=0;i<8;i++){
   const a=i*Math.PI*2/8,rad=1.2+(i%3)*.3;
   beamBetween(group,[0,3.1,0],[Math.cos(a)*rad,4.0+(i%3)*.42,Math.sin(a)*rad],.12,materials.timber);
   sphere(group,1.44,materials.leaf,Math.cos(a)*rad,4.5+(i%3)*.4,Math.sin(a)*rad,1.2,.81,1.06);
  }
  sphere(group,1.6,materials.leaf,0,5.1,0,1.4,.88,1.26);
  for(let i=0;i<42;i++){
   const a=i*2.3999,r=1.8+(.35+(i%7)/8)*1.65,x=Math.cos(a)*r,z=Math.sin(a)*r;
   cylinder(group,.026,.034,.35,materials.leaf,x,.35,z,5);
   sphere(group,.13,materials.flowers[i%3],x,.6,z,.94,.62,.82);
  }
  // Ground-level concept stones invite a deliberate click instead of emitting points.
  for(let i=0;i<3;i++){
   const a=i*2.09+Math.PI*.25,x=Math.sin(a)*2.55,z=Math.cos(a)*2.55;
   const rock=sphere(group,.34,materials.stone,x,.31,z,.84,.45,1.05);
   rock.userData.concept=['Spacing effect','Attention','Cognitive dissonance'][i];
   rock.userData.kind='concept';
  }
 }
 function observatory(group){
  cylinder(group,2.25,2.5,.4,materials.stone,0,.05,0,16);
  cylinder(group,1.65,1.93,5.3,materials.lightPlaster,0,2.83,0,20);
  for(let i=0;i<12;i++){
   const angle=i*Math.PI*2/12;
   const x=Math.sin(angle)*1.82,z=Math.cos(angle)*1.82;
   cylinder(group,.045,.065,5.35,materials.timber,x,2.8,z,6);
  }
  cylinder(group,2.05,1.93,.24,materials.stone,0,5.56,0,20);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1.97,24,12,0,Math.PI*2,0,Math.PI/2),materials.roof);
  dome.position.y=5.72;dome.castShadow=!coarse;group.add(dome);
  for(let a=0;a<4;a++){
   const angle=a*Math.PI/2;
   sphere(group,.45,materials.glass,Math.sin(angle)*1.62,3.23,Math.cos(angle)*1.62,.7,1.3,.18);
  }
  box(group,1.12,1.95,.2,materials.timber,0,1.23,1.95);
  // A small working telescope points toward the distant sky.
  const pivot=new THREE.Group();pivot.position.set(.8,7.0,0);pivot.rotation.z=-.34;
  cylinder(pivot,.18,.23,1.65,materials.iron,0,.2,0,14);
  sphere(pivot,.26,materials.glass,0,1.12,0);group.add(pivot);
 }
 function clearing(group){
  gazebo(group,2.8,false);
  for(let i=0;i<6;i++){
   const a=i*Math.PI*2/6,r=3.65;
   const x=Math.sin(a)*r,z=Math.cos(a)*r;
   sphere(group,.55,materials.leaf,x,.48,z,1.35,.7,1);
  }
  lantern(group,-2.4,2.55,0);lantern(group,2.4,2.55,0);
 }
 const interactive=[],concepts=[];
 for(const d of destinations){
  const group=new THREE.Group();
  group.position.set(d.x,height(d.x,d.z)+.08,d.z);
  group.userData.placeId=d.id;group.userData.title=d.name;
  scene.add(group);interactive.push(group);
  if(d.id==='notes')cottage(group,4.25,4.2,2.85,false);
  else if(d.id==='materials')cottage(group,6.8,5.7,3.75,true);
  else if(d.id==='garden')memoryGarden(group);
  else if(d.id==='recall')gazebo(group,2.7,true);
  else if(d.id==='dictionary')observatory(group);
  else if(d.id==='focus')clearing(group);
  group.traverse(object=>{if(object.userData.concept)concepts.push(object);});
 }
 return {interactive,concepts};
}
