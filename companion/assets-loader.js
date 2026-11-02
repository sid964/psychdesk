/* Private pose files stay in this browser. No uploads or study-data writes. */
(()=>{'use strict';
const KEY='psychdesk-companion-art-v1';
const states=['idle','resting','sleeping','walking','waving','pointing','thinking','celebrating','syncing','disconnected','pet-react'];
let local={};try{local=JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{}
const valid=url=>typeof url==='string'&&(/^(?:\.\.?\/|\/[^/]|[a-z0-9_-]+\/)[^?#]*\.(?:png|webp|svg)(?:[?#].*)?$/i.test(url)||/^data:image\/(?:png|webp|svg\+xml);base64,[a-z0-9+/=]+$/i.test(url));
window.PsychDeskCompanionAssets={states,
 candidates(state){const map=window.PsychDeskCompanionArtwork||{};return [...new Set([local[state],map[state],local.idle,map.idle].filter(valid))];},
 async import(state,file){
  if(!states.includes(state)||!file||file.size>350000||! /\.(png|webp|svg)$/i.test(file.name))throw Error('Choose a PNG, WebP or SVG under 350 KB.');
  const url=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read this pose.'));reader.readAsDataURL(file);});
  if(!valid(url))throw Error('Unsupported image format.');
  await new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=()=>reject(Error('This image could not be decoded.'));img.src=url;});
  const next={...local,[state]:url};try{localStorage.setItem(KEY,JSON.stringify(next));}catch{throw Error('Browser storage is full. Use a smaller pose.');}local=next;
 },
 reset(){localStorage.removeItem(KEY);local={};}
};
})();
