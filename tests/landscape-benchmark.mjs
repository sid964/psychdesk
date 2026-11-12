// Opt-in benchmark: THREE_MODULE=/absolute/path/to/three.module.mjs node tests/landscape-benchmark.mjs
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const THREE=await import(pathToFileURL(process.env.THREE_MODULE).href);
const baseline=execFileSync('git',['show','41934d734aeecf5a30de808e4e57105146b1398d:world/landscape.js'],{encoding:'utf8'});
const {createLandscape:before}=await import('data:text/javascript;base64,'+Buffer.from(baseline).toString('base64'));
import {createLandscape as after} from '../world/landscape.js';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
globalThis.document={createElement:()=>({getContext:()=>null})};
const destinations=[{x:-13,z:7},{x:-1,z:-14},{x:13,z:-7},{x:-1,z:12},{x:-14,z:-10},{x:15,z:9}];
function signature(scene){
 const h=createHash('sha256');scene.traverse(node=>{
  for(const value of Object.values(node.geometry?.attributes||{}))h.update(Buffer.from(value.array.buffer));
  if(node.geometry?.index)h.update(Buffer.from(node.geometry.index.array.buffer));
  if(node.instanceMatrix)h.update(Buffer.from(node.instanceMatrix.array.buffer));
  h.update(JSON.stringify({count:node.count,position:node.position.toArray(),scale:node.scale.toArray(),rotation:node.rotation.toArray()}));
 });return h.digest('hex');
}
const results=[];
for(const coarse of [false,true]){
 const timing={before:[],after:[]},sigs={};
 for(let i=0;i<4;i++)for(const [name,fn] of [['before',before],['after',after]]){
  const scene=new THREE.Scene(),start=performance.now();fn(THREE,scene,destinations,{coarse});const ms=performance.now()-start;
  if(i)timing[name].push(ms);sigs[name]=signature(scene);
  scene.traverse(n=>{n.geometry?.dispose();const m=n.material;for(const v of m?(Array.isArray(m)?m:[m]):[])v.dispose()});
 }
 assert.equal(sigs.before,sigs.after,'terrain and instance data must be identical');
 const median=xs=>xs.sort((a,b)=>a-b)[1];results.push({quality:coarse?'medium':'high',beforeMs:median(timing.before),afterMs:median(timing.after),identicalGeometry:true,signature:sigs.after});
}
console.log(JSON.stringify(results,null,2));
