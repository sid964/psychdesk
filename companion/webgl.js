/* Native WebGL companion renderer. No framework, external CDN or game engine.
   Geometry/UVs: Pikachu by Kataphoric; see assets/PIKACHU-CREDITS.md. */
(()=>{'use strict';
const host=document.getElementById('psychdesk-companion'),body=host?.querySelector('.pc-body');
if(!host||!body||!window.DecompressionStream)return;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),canvas=document.createElement('canvas');
canvas.className='pc-webgl';canvas.setAttribute('aria-hidden','true');
let gl;try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});}catch{return;}
if(!gl)return;
body.append(canvas);
const VERTEX=`
precision highp float;
attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;
attribute vec2 aJoints;attribute vec2 aWeights;
uniform mat4 uBones[9];uniform mat4 uModel;uniform mat4 uViewProjection;
varying vec2 vUV;varying vec3 vNormal;
mat4 joint(float i){
 if(i<0.5)return uBones[0];if(i<1.5)return uBones[1];if(i<2.5)return uBones[2];
 if(i<3.5)return uBones[3];if(i<4.5)return uBones[4];if(i<5.5)return uBones[5];
 if(i<6.5)return uBones[6];if(i<7.5)return uBones[7];return uBones[8];
}
void main(){mat4 skin=joint(aJoints.x)*aWeights.x+joint(aJoints.y)*aWeights.y;
 gl_Position=uViewProjection*uModel*skin*vec4(aPosition,1.0);
 vNormal=normalize(mat3(uModel)*mat3(skin)*aNormal);vUV=aUV;}
`;
const FRAGMENT=`
precision mediump float;
uniform sampler2D uTexture;varying vec2 vUV;varying vec3 vNormal;
void main(){vec4 tex=texture2D(uTexture,vUV);if(tex.a<0.05)discard;
 vec3 base=pow(tex.rgb,vec3(2.2));
 if(tex.r>0.7&&tex.g>0.55&&tex.b<0.5)base=vec3(1.0,0.55,0.002);
 vec3 n=normalize(vNormal);
 float key=max(dot(n,normalize(vec3(-0.5,0.8,1.0))),0.0);
 float fill=max(dot(n,normalize(vec3(0.8,0.25,0.6))),0.0);
 float rim=pow(1.0-max(dot(n,vec3(0.0,0.0,1.0)),0.0),3.0)*0.04;
 vec3 color=pow(clamp(base*(0.55+0.40*key+0.13*fill)+rim,0.0,1.0),vec3(1.0/2.2));
 gl_FragColor=vec4(color,tex.a);}
`;
let program,meshes=[],ready=false,failed=false,frame=0,transition=0,stateStarted=0,previousState='',lastPose=null,fromPose=null,lookX=0,lookY=0,press=false;
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mul(a,b){const c=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)for(let k=0;k<4;k++)c[j*4+i]+=a[k*4+i]*b[j*4+k];return c;}
function translation(x,y,z){const a=identity();a[12]=x;a[13]=y;a[14]=z;return a;}
function rotate(axis,t){const a=identity(),s=Math.sin(t),c=Math.cos(t);if(axis===0){a[5]=c;a[6]=s;a[9]=-s;a[10]=c;}else if(axis===1){a[0]=c;a[2]=-s;a[8]=s;a[10]=c;}else{a[0]=c;a[1]=s;a[4]=-s;a[5]=c;}return a;}
function pivot(p,x=0,y=0,z=0){return mul(mul(mul(mul(translation(...p),rotate(2,z)),rotate(1,y)),rotate(0,x)),translation(-p[0],-p[1],-p[2]));}
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
function viewProjection(aspect){
 const eye=[0,2.2,8],target=[0,1.75,0],z=normalize(eye.map((v,i)=>v-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);
 const view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
 const h=4.15,w=h*aspect,l=-w/2,r=w/2,b=-.325,t=3.825,n=.1,f=50;
 const ortho=new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);
 // View already centers the character at 1.75 units.
 ortho[13]=0;return mul(ortho,view);
}
function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Companion shader unavailable');}return shader;}
const loc={};
function setup(){
 const vs=compile(gl.VERTEX_SHADER,VERTEX),fs=compile(gl.FRAGMENT_SHADER,FRAGMENT);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
 if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Companion renderer unavailable');
 for(const n of ['aPosition','aNormal','aUV','aJoints','aWeights'])loc[n]=gl.getAttribLocation(program,n);
 for(const n of ['uModel','uViewProjection','uTexture','uBones[0]'])loc[n]=gl.getUniformLocation(program,n);
 gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
}
function buffer(data,kind=gl.ARRAY_BUFFER){const b=gl.createBuffer();gl.bindBuffer(kind,b);gl.bufferData(kind,data,gl.STATIC_DRAW);return b;}
const smooth=(a,b,v)=>{const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x);};
function skinWeights(part){
 const joints=[],weights=[];
 for(let i=0;i<part.positions.length;i+=3){const [x,y,z]=part.positions.slice(i,i+3);let base=0,bone=1,w=smooth(2.02,2.35,y);
  if(z<.4){bone=6;w=1-smooth(-.2,.4,z);}
  else if(y>2.95&&Math.abs(x)>.24){base=1;bone=x<0?2:3;w=smooth(2.95,3.13,y);}
  else if(y>1.45&&y<2.12&&Math.abs(x)>.60&&z>.65){bone=x<0?4:5;w=smooth(.60,.78,Math.abs(x));}
  else if(y<.42){bone=x<0?7:8;w=1-smooth(.22,.42,y);}
  if(part.name!=='Mesh_1'){base=1;bone=1;w=1;}
  joints.push(base,bone);weights.push(1-w,w);
 }
 return {joints,weights};
}
async function upload(part){
 if(part.positions.length%3||part.normals.length!==part.positions.length||part.uvs.length*3!==part.positions.length*2||part.indices.some(i=>i<0||i>=part.positions.length/3||i>65535))throw Error('Invalid companion mesh');
 const skin=skinWeights(part),image=new Image();
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=new URL('./assets/'+part.texture,scriptURL).href;});
 if(failed)throw Error('Companion suspended');
 const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
 const result={texture:tex,count:part.indices.length,indices:buffer(new Uint16Array(part.indices),gl.ELEMENT_ARRAY_BUFFER),attrs:{}};
 for(const [name,data,size] of [['aPosition',part.positions,3],['aNormal',part.normals,3],['aUV',part.uvs,2],['aJoints',skin.joints,2],['aWeights',skin.weights,2]])result.attrs[name]={buffer:buffer(new Float32Array(data)),size};
 return result;
}
function pose(state,t){
 const p={yaw:host.dataset.facing==='left'?.5:-.6,headX:0,headY:0,earL:0,earR:0,pawL:0,pawR:0,tail:0,footL:0,footR:0,bounce:0,lean:0};
 if(!reduced.matches&&host.dataset.live!=='false'){p.headY=lookX*.2;p.headX=lookY*.1;p.yaw+=lookX*.08;}
 const wave=Math.sin(t*16),step=Math.sin(t*12);
 switch(state){
  case 'waving':p.pawR=1.0+wave*.18;p.earL=-.08;break;
  case 'pointing':p.pawR=.6;p.headY=-.17;break;
  case 'celebrating':p.pawL=-.85;p.pawR=.95;p.bounce=Math.abs(Math.sin(t*8))*.18;p.tail=Math.sin(t*10)*.13;break;
  case 'walking':p.pawL=step*.24;p.pawR=-step*.24;p.footL=step*.35;p.footR=-step*.35;p.bounce=Math.abs(step)*.07;p.tail=step*.1;p.earL=step*.07;p.earR=-step*.07;break;
  case 'thinking':p.headX=.1;p.headY=-.18;p.pawL=.45;p.earR=-.18;break;
  case 'looking':p.headY=Math.sin(t*3)*.22;p.earL=.08;break;
  case 'stretching':p.pawL=-.5;p.pawR=.55;p.headX=-.12;break;
  case 'sleeping':p.headX=.24;p.earL=.25;p.earR=-.25;p.lean=.08;break;
  case 'syncing':p.tail=Math.sin(t*5)*.18;p.headY=Math.sin(t*3)*.08;break;
  case 'disconnected':p.headX=.17;p.earL=.22;p.earR=-.22;break;
  case 'interacting':case 'pet-react':p.bounce=Math.sin(Math.min(t/.6,1)*Math.PI)*.12;p.pawL=-.13;p.pawR=.13;break;
 }
 if(press)p.bounce=-.05;
 if(reduced.matches||host.dataset.live==='false'){for(const k of Object.keys(p))if(k!=='yaw')p[k]=0;}
 return p;
}
function matrices(p){
 const head=pivot([0,2.2,1.1],p.headX,p.headY);
 return [identity(),head,mul(head,pivot([-.42,2.94,1],0,0,p.earL)),mul(head,pivot([.42,2.94,1],0,0,p.earR)),pivot([-.53,1.95,1.05],0,0,p.pawL),pivot([.53,1.95,1.05],0,0,p.pawR),pivot([0,1.2,.25],0,p.tail,0),pivot([-.38,.3,1],p.footL,0,0),pivot([.38,.3,1],p.footR,0,0)];
}
function visible(){return ready&&!failed&&!document.hidden&&host.dataset.mode!=='hidden'&&host.dataset.state!=='hidden'&&!host.classList.contains('pc-suppressed')&&!host.classList.contains('pc-custom-art');}
function stop(){if(frame)cancelAnimationFrame(frame);frame=0;}
function draw(now){
 frame=0;if(!visible())return;
 const rect=body.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),width=Math.max(1,Math.round(rect.width*dpr)),height=Math.max(1,Math.round(rect.height*dpr));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);}
 const state=host.dataset.state||'resting',seconds=(now-stateStarted)/1000,p=pose(state,reduced.matches?0:seconds);
 const progress=(reduced.matches||host.dataset.live==='false')?1:Math.min(1,(now-transition)/300),ease=1-Math.pow(1-progress,3);
 if(fromPose&&progress<1)for(const k in p)p[k]=fromPose[k]+(p[k]-fromPose[k])*ease;
 lastPose=p;
 gl.useProgram(program);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 gl.uniformMatrix4fv(loc.uViewProjection,false,viewProjection(width/height));
 gl.uniformMatrix4fv(loc.uModel,false,mul(translation(0,p.bounce,0),mul(rotate(1,p.yaw),pivot([0,1.5,1],p.lean,0,0))));
 const bones=new Float32Array(9*16);matrices(p).forEach((m,i)=>bones.set(m,i*16));gl.uniformMatrix4fv(loc['uBones[0]'],false,bones);gl.uniform1i(loc.uTexture,0);gl.activeTexture(gl.TEXTURE0);
 for(const mesh of meshes){
  for(const [name,a] of Object.entries(mesh.attrs)){gl.bindBuffer(gl.ARRAY_BUFFER,a.buffer);gl.enableVertexAttribArray(loc[name]);gl.vertexAttribPointer(loc[name],a.size,gl.FLOAT,false,0,0);}
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.indices);gl.bindTexture(gl.TEXTURE_2D,mesh.texture);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
 }
 // Every interaction has a finite render window. Resting and idle retain a static frame.
 const duration={walking:8000,syncing:12000,waving:1500,pointing:1600,celebrating:1700,thinking:1800,looking:1800,stretching:2200,'pet-react':900,interacting:1200}[state]||0;
 if(!reduced.matches&&host.dataset.live!=='false'&&(progress<1||seconds*1000<duration))frame=requestAnimationFrame(draw);
}
function request(animate=true){
 if(!ready)return;
 const state=host.dataset.state||'resting';
 if(state!==previousState){previousState=state;stateStarted=performance.now();}
 if(animate){fromPose=lastPose?{...lastPose}:null;transition=performance.now();}
 stop();if(visible())frame=requestAnimationFrame(draw);
}
function failure(){
 if(failed)return;failed=true;stop();host.classList.remove('pc-has-webgl');canvas.remove();
 observer?.disconnect();resize?.disconnect();
 for(const m of meshes){for(const a of Object.values(m.attrs))gl.deleteBuffer(a.buffer);gl.deleteBuffer(m.indices);gl.deleteTexture(m.texture);}meshes=[];
 if(program)gl.deleteProgram(program);
}
const button=host.querySelector('.pc-character');
button.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||e.buttons||reduced.matches||host.dataset.live==='false')return;const r=button.getBoundingClientRect();lookX=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/(r.width/2||1)));lookY=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/(r.height/2||1)));request();},{passive:true});
button.addEventListener('pointerleave',()=>{lookX=lookY=0;request();});
button.addEventListener('pointerdown',()=>{press=true;request();},{passive:true});
for(const event of ['pointerup','pointercancel','blur'])button.addEventListener(event,()=>{press=false;request();},{passive:true});
const observer=new MutationObserver(()=>{if(!visible()){stop();return;}request();});
observer.observe(host,{attributes:true,attributeFilter:['data-state','data-mode','data-facing','data-live','data-size','class']});
const resize=typeof ResizeObserver==='function'?new ResizeObserver(()=>request(false)):null;resize?.observe(button);
document.addEventListener('visibilitychange',()=>{lookX=lookY=0;press=false;if(document.hidden)stop();else request();});
reduced.addEventListener?.('change',()=>request());
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failure();});
const scriptURL=document.currentScript?.src||new URL('companion/webgl.js',document.baseURI).href;
(async()=>{
 try{
  setup();const response=await fetch(new URL('./assets/pikachu-3d.json.gz',scriptURL));if(!response.ok)throw Error('Companion model unavailable');
  const bytes=new Uint8Array(await response.arrayBuffer());
  const raw=new Blob([bytes]).stream(),stream=bytes[0]===31&&bytes[1]===139?raw.pipeThrough(new DecompressionStream('gzip')):raw;
  const data=await new Response(stream).json();
  if(data.version!==1||!Array.isArray(data.meshes)||data.meshes.length!==4)throw Error('Unsupported companion model');
  for(const part of data.meshes)meshes.push(await upload(part));
  if(failed)return;ready=true;host.classList.add('pc-has-webgl');request();
 }catch{failure();}
})();
})();
