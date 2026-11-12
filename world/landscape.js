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
 // Procedural fine-grained soil and meadow texture improves material response
 // without downloading assets or introducing paid services.
 const groundMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1});
 const terrainCanvas=document.createElement('canvas');terrainCanvas.width=terrainCanvas.height=256;
 const terrainContext=terrainCanvas.getContext('2d');
 if(terrainContext){
  const image=terrainContext.createImageData(256,256);
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
   const i=(y*256+x)*4;
   const dapple=Math.sin(x*.16+Math.sin(y*.11))*5+Math.cos(y*.21-x*.13)*5;
   const grain=(rand(x*17.3+y*91.7)-.5)*29;
   const v=Math.round(clamp(222+dapple+grain,172,249));
   image.data[i]=v+3;image.data[i+1]=v+2;image.data[i+2]=v-7;image.data[i+3]=255;
  }
  terrainContext.putImageData(image,0,0);
  const surface=new THREE.CanvasTexture(terrainCanvas);
  surface.colorSpace=THREE.SRGBColorSpace;
  surface.wrapS=surface.wrapT=THREE.RepeatWrapping;
  surface.repeat.set(25,25);surface.anisotropy=coarse?1:4;
  groundMaterial.map=surface;
  if(!coarse){groundMaterial.bumpMap=surface;groundMaterial.bumpScale=.045;}
 }
 const ground=new THREE.Mesh(grid,groundMaterial);
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
 // Routes do not change after construction. Reuse their exact samples instead
 // of allocating and evaluating 216 spline points for every meadow candidate.
 const pathSamples=routes.flatMap(path=>Array.from({length:36},(_,j)=>path.getPoint(j/35)));
 function distanceToPath(x,z){
  let best=1e4;
  for(const p of pathSamples){
   best=Math.min(best,Math.hypot(x-p.x,z-p.z));
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
 // Tree crowns are smooth, overlapping foliage masses; no cone-tree silhouettes.
 const canopyGeom=new THREE.SphereGeometry(1,coarse?10:14,coarse?8:11);
  // Generated foliage microtexture makes each crown react to natural lighting.
  const leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=128;
  const leafContext=leafCanvas.getContext('2d');
  let leafSurface=null;
  if(leafContext){
   const image=leafContext.createImageData(128,128);
   for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const at=(y*128+x)*4;
    const vein=Math.sin(x*.78+y*.43)*6+Math.cos(x*.36-y*.62)*9;
    const v=Math.round(clamp(225+vein+(rand(x*137+y*41)-.5)*43,166,255));
    image.data[at]=v;image.data[at+1]=v;image.data[at+2]=v-5;image.data[at+3]=255;
   }
   leafContext.putImageData(image,0,0);
   leafSurface=new THREE.CanvasTexture(leafCanvas);
   leafSurface.colorSpace=THREE.SRGBColorSpace;
   leafSurface.wrapS=leafSurface.wrapT=THREE.RepeatWrapping;
   leafSurface.repeat.set(3,2);leafSurface.anisotropy=coarse?1:4;
  }
 const canopyMats=[
  new THREE.MeshStandardMaterial({color:night?0x607c65:0x718c63,roughness:1}),
  new THREE.MeshStandardMaterial({color:night?0x567768:0x829b75,roughness:1}),
  new THREE.MeshStandardMaterial({color:night?0x668579:0x5e846a,roughness:1}),
  new THREE.MeshStandardMaterial({color:night?0x7b8b67:0x9eab81,roughness:1})
 ];
 canopyMats.forEach(material=>{
   if(leafSurface){material.map=leafSurface;if(!coarse){material.bumpMap=leafSurface;material.bumpScale=.025;}}
  });
  const treeCenters=[];
 const treeCount=coarse?74:152;
 for(let i=0;i<treeCount*4&&treeCenters.length<treeCount;i++){
  const a=rand(i*7+3)*Math.PI*2,r=12+Math.sqrt(rand(i*11+12))*49;
  const x=Math.sin(a)*r,z=Math.cos(a)*r;
  if(distanceToPath(x,z)<2.4||destinations.some(p=>Math.hypot(x-p.x,z-p.z)<5)||Math.hypot((x-pond.x)/pond.rx,(z-pond.z)/pond.rz)<1.22)continue;
  treeCenters.push({x,z,h:3.2+rand(i*9+4)*4.8,kind:i%8,seed:i});
 }
 const trunkGeometry=new THREE.CylinderGeometry(.12,.24,1,9,1);
  const trunks=new THREE.InstancedMesh(trunkGeometry,mats.bark,treeCenters.length);
  const limbGeometry=new THREE.CylinderGeometry(.08,.13,1,7);
  const limbs=new THREE.InstancedMesh(limbGeometry,mats.bark,treeCenters.length*3);
  const clusters=coarse?5:7;
  const canopy=[0,1,2,3].map(k=>new THREE.InstancedMesh(canopyGeom,canopyMats[k],treeCenters.length*clusters));
  const dummy=new THREE.Object3D(),canopyIndex=[0,0,0,0];
  const limbStart=new THREE.Vector3(),direction=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  treeCenters.forEach((tree,i)=>{
   const y=height(tree.x,tree.z),t=tree.h;
   dummy.position.set(tree.x,y+t*.34,tree.z);dummy.scale.set(t*.21,t*.68,t*.21);
   dummy.rotation.set(0,rand(i*13)*Math.PI*2,0);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
   // Inclined woody limbs and uneven foliage break up the toy-like silhouette.
   for(let j=0;j<3;j++){
    const angle=j*Math.PI*2/3+rand(i*7)*2;
    limbStart.set(tree.x,y+t*.48,tree.z);
    direction.set(Math.cos(angle)*t*(.22+rand(i*31+j)*.06),t*(.33+rand(i*17+j)*.08),Math.sin(angle)*t*.24);
    dummy.position.copy(limbStart).addScaledVector(direction,.5);
    dummy.quaternion.setFromUnitVectors(up,direction.clone().normalize());
    dummy.scale.set(t*.50,direction.length(),t*.50);
    dummy.updateMatrix();limbs.setMatrixAt(i*3+j,dummy.matrix);
   }
   for(let j=0;j<clusters;j++){
    const angle=(j+rand(i*23+j)*.26)*Math.PI*2/clusters;
    const spread=t*(.13+rand(i*41+j*7)*.13);
    const type=(i+j)%4,size=t*(.22+rand(i*13+j)*.075);
    dummy.position.set(tree.x+Math.cos(angle)*spread,y+t*(.71+rand(i*31+j)*.18),tree.z+Math.sin(angle)*spread);
    dummy.scale.set(size*(.96+rand(i*19+j)*.2),size*(.78+rand(i*23+j)*.26),size*(.88+rand(i*29+j)*.22));
    dummy.rotation.set(.16*Math.sin(angle),angle*.5,.14*Math.cos(angle));
    dummy.updateMatrix();canopy[type].setMatrixAt(canopyIndex[type]++,dummy.matrix);
   }
  });
  trunks.instanceMatrix.needsUpdate=true;trunks.castShadow=!coarse;
  limbs.instanceMatrix.needsUpdate=true;limbs.castShadow=!coarse;
  scene.add(trunks,limbs);
  canopy.forEach((mesh,i)=>{mesh.count=canopyIndex[i];mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=!coarse;scene.add(mesh);});
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
