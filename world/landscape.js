// Organic, deterministic environment: no paid assets, APIs, or tracking.
export function createLandscape(THREE,scene,destinations,{coarse=false,reduced=false,night=false}={}){
 const clamp=THREE.MathUtils.clamp, mix=THREE.MathUtils.lerp;
 const rand=(n)=>{const v=Math.sin(n*127.1+78.233)*43758.5453;return v-Math.floor(v);};
 const noise=(x,z)=>Math.sin(x*.19+Math.sin(z*.105)*1.9)*Math.cos(z*.145-x*.052)*.42+
   Math.sin(z*.34+x*.24)*.17+Math.cos(z*.59-x*.47)*.08;
 const pond={x:8,z:20,rx:8.7,rz:5.7};
 function height(x,z){
  const radial=Math.hypot(x,z);
  let value=.52*noise(x,z)+.11*Math.cos(x*.74+z*.52);
  value+=Math.max(0,radial-33)*.17+Math.max(0,radial-50)*.27;
  for(const d of destinations){
   const distance=Math.hypot(d.x-x,d.z-z);
   const ease=clamp((distance-3.8)/4,0,1);value=mix(0,value,ease*ease*(3-2*ease));
  }
  const pondDistance=Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz);
  const pondCut=1-THREE.MathUtils.smoothstep(pondDistance,.72,1.19);
  value=mix(value,-.88,pondCut);
  return value;
 }
 const mats={
  bark:new THREE.MeshStandardMaterial({color:0x776550,roughness:.98}),
  grass:new THREE.MeshStandardMaterial({color:0x5f815c,roughness:1,side:THREE.DoubleSide}),
  stone:new THREE.MeshStandardMaterial({color:0x9b9990,roughness:1}),
  sandy:new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}),
  water:new THREE.MeshPhysicalMaterial({color:night?0x4c7a8e:0x7ba9a2,roughness:.24,metalness:.05,transparent:true,opacity:.91,depthWrite:false,clearcoat:.28,clearcoatRoughness:.16})
 };
 // The world continues into a hazy valley, rather than sitting on a floating cylinder.
 const worldSize=148,segments=coarse?104:172;
 const grid=new THREE.PlaneGeometry(worldSize,worldSize,segments,segments);
 grid.rotateX(-Math.PI/2);
 const positions=grid.attributes.position;
 const vertexColors=new Float32Array(positions.count*3);
 const low=new THREE.Color(night?0x596c58:0x8b9b74);
 const high=new THREE.Color(night?0x426355:0x55775b);
 const sunlit=new THREE.Color(night?0x657a61:0x9cb18b);
 const color=new THREE.Color();
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),h=height(x,z);
  positions.setY(i,h);
  const variation=noise(x*1.5,z*1.5)*.14+(rand(i*31)-.5)*.08;
  color.copy(low).lerp(high,clamp(.47+variation+h*.034,0,1)).lerp(sunlit,clamp(.14+Math.sin(x*.35+z*.12)*.08,0,.28));
  vertexColors[i*3]=color.r;vertexColors[i*3+1]=color.g;vertexColors[i*3+2]=color.b;
 }
 grid.setAttribute('color',new THREE.BufferAttribute(vertexColors,3));grid.computeVertexNormals();
 const ground=new THREE.Mesh(grid,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}));
 ground.receiveShadow=!coarse;
 scene.add(ground);
 // Gentle horizon ridge, rendered as soft atmospheric silhouettes.
 for(let band=0;band<2;band++){
  const count=128,verts=[],indices=[];
  const radius=80+band*35;
  for(let i=0;i<=count;i++){
   const a=i/count*Math.PI*2,rr=radius+7*Math.sin(a*4.1+band)+4*Math.sin(a*9.7);
   const x=Math.sin(a)*rr,z=Math.cos(a)*rr;
   const peak=(band?18:13)+5*Math.sin(a*5.2+2)+3*Math.cos(a*12.1);
   verts.push(x,-2,z,x,peak,z);
   if(i<count){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geo.setIndex(indices);geo.computeVertexNormals();
  scene.add(new THREE.Mesh(geo,new THREE.MeshLambertMaterial({color:band?0x839b9a:0x6e8c84,side:THREE.DoubleSide})));
 }
 // Winding natural paths. Ground-level ribbon follows the sculpted relief.
 const routes=destinations.map((d,i)=>{
  const sideways=i%2?-2.2:2.2,dist=Math.hypot(d.x,d.z),nx=-d.z/dist,nz=d.x/dist;
  return new THREE.CatmullRomCurve3([
   new THREE.Vector3(0,0,0),
   new THREE.Vector3(d.x*.38+nx*sideways,0,d.z*.38+nz*sideways),
   new THREE.Vector3(d.x*.72-nx*sideways*.25,0,d.z*.72-nz*sideways*.25),
   new THREE.Vector3(d.x,0,d.z)
  ],false,'centripetal',.42);
 });
 function distanceToPath(x,z){
  let best=1e4;
  for(const path of routes)for(let j=0;j<=35;j++){
   const p=path.getPoint(j/35);best=Math.min(best,Math.hypot(x-p.x,z-p.z));
  }
  return best;
 }
 for(const [n,route] of routes.entries()){
  const vertices=[],colors=[],index=[],sampleCount=72;
  for(let i=0;i<=sampleCount;i++){
   const t=i/sampleCount,p=route.getPoint(t),tangent=route.getTangent(t).normalize();
   const normal=new THREE.Vector3(-tangent.z,0,tangent.x);
   const width=1.15+Math.sin(t*Math.PI*3+n)*.12;
   for(let side=-1;side<=1;side+=2){
    const x=p.x+normal.x*side*width,z=p.z+normal.z*side*width;
    vertices.push(x,height(x,z)+.047,z);
    const v=.73+rand(i*71+n*12+side)*.2;
    colors.push(.65*v+.10,.58*v+.13,.47*v+.17);
   }
   if(i<sampleCount){const k=i*2;index.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(index);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,mats.sandy);mesh.receiveShadow=true;scene.add(mesh);
 }
 // Pond is softly inset into its shore and has a continuously drifting normal texture.
 const waterGeom=new THREE.CircleGeometry(1,96);waterGeom.rotateX(-Math.PI/2);
 waterGeom.scale(pond.rx,1,pond.rz);
 const water=new THREE.Mesh(waterGeom,mats.water);
 water.position.set(pond.x,-.32,pond.z);water.renderOrder=1;scene.add(water);
 const rippleCanvas=document.createElement('canvas');rippleCanvas.width=rippleCanvas.height=128;
 const c=rippleCanvas.getContext('2d');
 if(c){c.fillStyle='#8080ff';c.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){
   const dx=Math.sin(x*.16+y*.07),dy=Math.cos(y*.14-x*.06);
   c.fillStyle='rgb('+Math.round(128+dx*43)+','+Math.round(128+dy*42)+',246)';
   c.fillRect(x,y,2,2);
  }
  const normal=new THREE.CanvasTexture(rippleCanvas);
  normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.repeat.set(4,3);normal.anisotropy=coarse?1:4;
  mats.water.normalMap=normal;mats.water.normalScale.set(.14,.14);mats.water.needsUpdate=true;
 }
 const waterEdge=new THREE.Mesh(
  new THREE.RingGeometry(1,1.035,96),new THREE.MeshBasicMaterial({color:0xc4c4a3,transparent:true,opacity:.34,side:THREE.DoubleSide}));
 waterEdge.rotation.x=-Math.PI/2;waterEdge.scale.set(pond.rx,pond.rz,1);
 waterEdge.position.set(pond.x,-.31,pond.z);scene.add(waterEdge);
 // Botanical cards break up spherical tree silhouettes into individual leaves.
 // All foliage is generated locally from alpha textures: no external assets.
 function foliageTexture(needle=false){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=384;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  ctx.clearRect(0,0,384,384);
  const random=i=>rand(i*19+(needle?39:17));
  // Internal fine twigs and leaf veins give the crowns depth at close zoom.
  for(let i=0;i<29;i++){
   const x=34+random(i*2)*316,y=42+random(i*2+1)*290;
   ctx.strokeStyle=needle?'#314b3299':'#534f3499';ctx.lineWidth=1.0+(i%3)*.55;
   ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(192,192,192+(x-192)*.12,210);ctx.stroke();
  }
  for(let i=0;i<(needle?330:230);i++){
   const x=35+random(i*5+31)*312,y=26+random(i*5+32)*332;
   const a=random(i*5+33)*6.28,sz=needle?3+random(i*5+34)*8:6+random(i*5+34)*15;
   const light=random(i*5+35);
   ctx.save();ctx.translate(x,y);ctx.rotate(a);
   if(needle){
    ctx.fillStyle=light<.3?'#344e3baa':light<.65?'#567553dd':'#8ba478e8';
    ctx.beginPath();ctx.moveTo(-sz,0);ctx.quadraticCurveTo(0,-1.5,sz*1.7,-sz*.24);
    ctx.quadraticCurveTo(0,1.1,-sz,0);ctx.fill();
   }else{
    ctx.fillStyle=light<.25?'#355c3eea':light<.5?'#517b4cdd':light<.78?'#709460e8':'#99ad77df';
    ctx.beginPath();ctx.moveTo(-sz*.9,0);
    ctx.quadraticCurveTo(0,-sz*.66,sz,0);
    ctx.quadraticCurveTo(0,sz*.46,-sz*.9,0);ctx.fill();
    if(i%5===0){
     ctx.strokeStyle='#c6c79a66';ctx.lineWidth=.75;
     ctx.beginPath();ctx.moveTo(-sz*.6,0);ctx.lineTo(sz*.65,0);ctx.stroke();
    }
   }
   ctx.restore();
  }
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  tex.anisotropy=coarse?1:4;return tex;
 }
 const leafTexture=foliageTexture(false),pineTexture=foliageTexture(true);
 const leafMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,map:leafTexture,side:THREE.DoubleSide,alphaTest:.2,
  transparent:false,roughness:1,metalness:0,depthWrite:true
 });
 const needleMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,map:pineTexture,side:THREE.DoubleSide,alphaTest:.23,
  transparent:false,roughness:1,metalness:0,depthWrite:true
 });
 const canopyGeom=new THREE.SphereGeometry(1,14,10);
 const crownPositions=canopyGeom.attributes.position;
 for(let i=0;i<crownPositions.count;i++){
  const x=crownPositions.getX(i),y=crownPositions.getY(i),z=crownPositions.getZ(i);
  const irregular=1+.12*Math.sin(x*11+y*7)+.10*Math.cos(z*13+x*5);
  crownPositions.setXYZ(i,x*irregular,y*(1+.08*Math.sin(z*9+x*3)),z*irregular);
 }
 canopyGeom.computeVertexNormals();
 const canopyMats=[
  new THREE.MeshStandardMaterial({color:night?0x3f5b47:0x466b4d,roughness:1}),
  new THREE.MeshStandardMaterial({color:night?0x496958:0x5d8258,roughness:1}),
  new THREE.MeshStandardMaterial({color:night?0x57705a:0x648f67,roughness:1}),
  new THREE.MeshStandardMaterial({color:night?0x68775e:0x7d9a6b,roughness:1})
 ];
 // Bark is subtly striated instead of flat-shaded brown.
 const barkCanvas=document.createElement('canvas');barkCanvas.width=128;barkCanvas.height=512;
 const bark=barkCanvas.getContext('2d');
 if(bark){
  bark.fillStyle='#9e8267';bark.fillRect(0,0,128,512);
  for(let i=0;i<750;i++){
   const x=rand(i*13+9)*128,y=rand(i*31+6)*512,dy=6+rand(i*17)*47;
   bark.strokeStyle=i%4===0?'#dbc1a62c':'#3e322835';bark.lineWidth=.6+rand(i*7)*2.3;
   bark.beginPath();bark.moveTo(x,y);bark.quadraticCurveTo(x+4*Math.sin(y*.02),y+dy*.45,x+2,y+dy);bark.stroke();
  }
  const tex=new THREE.CanvasTexture(barkCanvas);tex.colorSpace=THREE.SRGBColorSpace;
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,3);
  mats.bark.map=tex;mats.bark.needsUpdate=true;
 }
 const treeCenters=[];
 const treeCount=coarse?72:145;
 for(let i=0;i<treeCount*4&&treeCenters.length<treeCount;i++){
  const a=rand(i*7+3)*Math.PI*2,r=11+Math.sqrt(rand(i*11+12))*49;
  const x=Math.sin(a)*r,z=Math.cos(a)*r;
  if(distanceToPath(x,z)<2.4||destinations.some(p=>Math.hypot(x-p.x,z-p.z)<5)||Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.24)continue;
  treeCenters.push({x,z,h:3.5+rand(i*9+4)*5.3,kind:i%8,seed:i});
 }
 const trunkGeometry=new THREE.CylinderGeometry(.115,.22,1,10,1);
 const trunks=new THREE.InstancedMesh(trunkGeometry,mats.bark,treeCenters.length);
 const canopy=[0,1,2,3].map(i=>new THREE.InstancedMesh(canopyGeom,canopyMats[i],treeCenters.length*3));
 const twigGeom=new THREE.CylinderGeometry(.045,.068,1,7);
 const twigs=new THREE.InstancedMesh(twigGeom,mats.bark,treeCenters.length*3);
 const leafCardMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),leafMaterial,treeCenters.length*12);
 const pineCardMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),needleMaterial,treeCenters.length*12);
 const dummy=new THREE.Object3D(),canopyIndex=[0,0,0,0];
 let twigCount=0,leafCount=0,pineCount=0;
 const up=new THREE.Vector3(0,1,0);
 treeCenters.forEach((tree,i)=>{
  const y=height(tree.x,tree.z),t=tree.h,pine=i%6===0;
  dummy.position.set(tree.x,y+t*(pine?.45:.36),tree.z);
  dummy.scale.set(t*.035,t*(pine?.9:.72),t*.035);
  dummy.rotation.set(0,rand(i*13)*Math.PI*2,0);
  dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  if(!pine){
   for(let j=0;j<3;j++){
    const type=(i+j)%4,angle=j*Math.PI*2/3+rand(i*3)*2;
    const size=t*(.19+rand(i*13+j)*.055);
    dummy.position.set(tree.x+Math.cos(angle)*t*.19,y+t*(.66+.075*(j%2)),tree.z+Math.sin(angle)*t*.19);
    dummy.scale.set(size,size*(.81+rand(j+i)*.13),size*.88);
    dummy.rotation.set(.09*Math.sin(angle),0,.09*Math.cos(angle));
    dummy.updateMatrix();canopy[type].setMatrixAt(canopyIndex[type]++,dummy.matrix);
   }
   for(let j=0;j<3;j++){
    const a=j*2.095+rand(i*4)*1.8;
    const start=new THREE.Vector3(tree.x,y+t*.49,tree.z);
    const target=new THREE.Vector3(tree.x+Math.cos(a)*t*.22,y+t*(.65+j*.04),tree.z+Math.sin(a)*t*.22);
    const dir=new THREE.Vector3().subVectors(target,start);
    dummy.position.copy(start).add(target).multiplyScalar(.5);
    dummy.scale.set(t*.12,dir.length(),t*.12);
    dummy.quaternion.setFromUnitVectors(up,dir.normalize());dummy.updateMatrix();
    twigs.setMatrixAt(twigCount++,dummy.matrix);
   }
  }
  for(let j=0;j<(pine?12:10);j++){
   const a=j*2.4+rand(i*31+4)*1.6,ratio=pine?j/12:.42+rand(i*17+j*11)*.42;
   const tierHeight=pine?t*(.32+ratio*.65):t*(.56+ratio*.35);
   const width=pine?t*(.16+.11*(1-ratio)):t*(.36+rand(i+j*13)*.15);
   const radius=pine?t*(1-ratio)*.18:t*.24;
   dummy.position.set(tree.x+Math.cos(a)*radius,y+tierHeight,tree.z+Math.sin(a)*radius);
   dummy.scale.set(width*2.2,pine?t*.37:t*.58,1);
   dummy.rotation.set((rand(i*j+5)-.5)*.28,a+(j%2)*Math.PI*.5,(rand(i*j+7)-.5)*.28);
   dummy.updateMatrix();
   if(pine)pineCardMesh.setMatrixAt(pineCount++,dummy.matrix);
   else leafCardMesh.setMatrixAt(leafCount++,dummy.matrix);
  }
 });
 trunks.instanceMatrix.needsUpdate=true;trunks.castShadow=!coarse;scene.add(trunks);
 canopy.forEach((mesh,i)=>{mesh.count=canopyIndex[i];mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!coarse;scene.add(mesh);});
 twigs.count=twigCount;twigs.instanceMatrix.needsUpdate=true;scene.add(twigs);
 leafCardMesh.count=leafCount;leafCardMesh.instanceMatrix.needsUpdate=true;leafCardMesh.castShadow=!coarse;scene.add(leafCardMesh);
 pineCardMesh.count=pineCount;pineCardMesh.instanceMatrix.needsUpdate=true;pineCardMesh.castShadow=!coarse;scene.add(pineCardMesh);
 // Grass silhouettes and meadow flowers use instancing, not thousands of draw calls.
 const bladeGeo=new THREE.BufferGeometry();
 bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([
  -.08,0,0, .06,0,0, .01,.53,.06,
  0,0,-.07, 0,0,.07, .04,.45,0,
  -.05,0,.04, .06,0,-.04, -.05,.36,.06
 ],3));bladeGeo.computeVertexNormals();
 const grassMats=[new THREE.MeshLambertMaterial({color:0x9fae79,side:THREE.DoubleSide}),
  new THREE.MeshLambertMaterial({color:0x77956e,side:THREE.DoubleSide}),
  new THREE.MeshLambertMaterial({color:0xb0b38a,side:THREE.DoubleSide})];
 const grassCounts=grassMats.map(()=>0),maxGrass=coarse?1200:4200;
 const patches=grassMats.map(m=>new THREE.InstancedMesh(bladeGeo,m,Math.ceil(maxGrass/3)+80));
 for(let i=0;i<maxGrass*3&&grassCounts.reduce((a,b)=>a+b,0)<maxGrass;i++){
  const x=(rand(i*13+42)-.5)*110,z=(rand(i*17+9)-.5)*110;
  if(distanceToPath(x,z)<1.65||destinations.some(p=>Math.hypot(x-p.x,z-p.z)<3.6))continue;
  if(Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.2)continue;
  const type=i%3;if(grassCounts[type]>=patches[type].count)continue;
  const size=.68+rand(i*23)*1.1;
  dummy.position.set(x,height(x,z)-.02,z);dummy.scale.set(size,size*(.66+rand(i*7)*.75),size);
  dummy.rotation.set(0,rand(i*5)*6.28,0);dummy.updateMatrix();
  patches[type].setMatrixAt(grassCounts[type]++,dummy.matrix);
 }
 patches.forEach((mesh,i)=>{mesh.count=grassCounts[i];mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);});
 const flowerStemMat=new THREE.MeshStandardMaterial({color:0x6b8f62,roughness:1});
 const flowerGeo=new THREE.SphereGeometry(.11,7,5);
 const flowerColors=[0xe8cfba,0xf5e8c5,0xc7c5db,0xf4d0ae].map(color=>new THREE.MeshStandardMaterial({color,roughness:1,emissive:color,emissiveIntensity:.04}));
 const blossoms=flowerColors.map(m=>new THREE.InstancedMesh(flowerGeo,m,coarse?65:190));
 const stemGeo=new THREE.CylinderGeometry(.014,.023,.5,5);
 const stems=new THREE.InstancedMesh(stemGeo,flowerStemMat,coarse?160:530);
 let stemCount=0;const flowerCounts=[0,0,0,0];
 for(let i=0;i<(coarse?400:1250);i++){
  const x=(rand(i*13+21)-.5)*86,z=(rand(i*27+7)-.5)*86;
  if(distanceToPath(x,z)>3.5||distanceToPath(x,z)<1.4||Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.1)continue;
  if(destinations.some(d=>Math.hypot(d.x-x,d.z-z)<2))continue;
  const type=i%4;if(flowerCounts[type]>=blossoms[type].count||stemCount>=stems.count)continue;
  const h=.28+rand(i*19)*.34,y=height(x,z);
  dummy.position.set(x,y+h/2,z);dummy.rotation.set(0,0,0);dummy.scale.set(1,h/.5,1);dummy.updateMatrix();
  stems.setMatrixAt(stemCount++,dummy.matrix);
  dummy.position.set(x,y+h,z);dummy.scale.set(.7+rand(i*9)*.6,.7+rand(i*5)*.5,.7+rand(i*4)*.6);dummy.updateMatrix();
  blossoms[type].setMatrixAt(flowerCounts[type]++,dummy.matrix);
 }
 stems.count=stemCount;stems.instanceMatrix.needsUpdate=true;scene.add(stems);
 blossoms.forEach((mesh,i)=>{mesh.count=flowerCounts[i];mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);});
 // Boulders, weathered by natural irregular silhouettes.
 const rockGeo=new THREE.DodecahedronGeometry(1,1);const rocks=new THREE.InstancedMesh(rockGeo,mats.stone,coarse?45:130);
 const rockCount=coarse?45:130;
 for(let i=0;i<rockCount;i++){
  const x=(rand(i*37+3)-.5)*110,z=(rand(i*51+5)-.5)*110;
  const size=.14+rand(i*19+21)*.53;
  dummy.position.set(x,height(x,z)+size*.25,z);dummy.rotation.set(rand(i*8),rand(i*3)*6,rand(i*13));dummy.scale.set(size,size*.56,size*.79);
  dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
 }
 rocks.instanceMatrix.needsUpdate=true;rocks.castShadow=!coarse;scene.add(rocks);
 // Varying haze makes distant landscape read as depth rather than flat stage.
 const clouds=[];
 const cloudCanvas=document.createElement('canvas');cloudCanvas.width=cloudCanvas.height=128;
 const ctx=cloudCanvas.getContext('2d');
 if(ctx){
  const grad=ctx.createRadialGradient(64,64,6,64,64,64);
  grad.addColorStop(0,'rgba(246,245,226,0.55)');grad.addColorStop(.52,'rgba(236,236,222,.22)');
  grad.addColorStop(1,'rgba(239,241,226,0)');
  ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const cloudTex=new THREE.CanvasTexture(cloudCanvas);
  for(let i=0;i<11;i++){
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,opacity:night?.22:.48}));
   sprite.position.set((i-5)*21,28+(i%3)*6,-55+(i%4)*16);
   sprite.scale.set(34+(i%3)*14,13+(i%4)*5,1);scene.add(sprite);clouds.push(sprite);
  }
 }
 function animate(elapsed,dt){
  if(!reduced){
   if(mats.water.normalMap){mats.water.normalMap.offset.x=elapsed*.005;mats.water.normalMap.offset.y=-elapsed*.003;}
   for(const [i,c] of clouds.entries())c.position.x+=(dt*.09)*(i%2?.7:1.1);
  }
 }
 return {height,routes,pond,animate,materials:mats};
}
