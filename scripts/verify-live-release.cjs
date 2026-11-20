/* Phase 6: verify GitHub Pages serves the same release for every critical study surface.
 * Unlike a check of only index/app/service-worker files, this catches a stale
 * World renderer, course stylesheet or lesson script at deployment time.
 * No credentials or external services besides the published Pages site.
 */
'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');

const CRITICAL_FILES=Object.freeze([
 'index.html','app.js','sw.js','study-clarity.css','autopilot/studio.js',
 'book-catalog.js','book-reader.js','book-reader.css','book-reference.css',
 'pdf-reader.js','pdf-reader.css','reader-studio.css','firebase-sync.js',
 'psychopathology-graph.js','psychopathology-graph.css',
 'world/index.html','world/world.js','world/world.css','world/life.js'
]);
const ROOT=path.resolve(__dirname,'..');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function verifyRelease({
 site='https://sid964.github.io/psychdesk/',
 sha=process.env.GITHUB_SHA,
 attempts=30,
 delayMs=6000,
 timeoutMs=12000,
 fetcher=globalThis.fetch,
 root=ROOT,
 log=console.log
}={}){
 if(!/^[a-f0-9]{40}$/i.test(sha||''))throw Error('GITHUB_SHA must be a full 40-character commit hash');
 if(!Number.isInteger(attempts)||attempts<1||attempts>30)throw Error('Invalid retry count');
 const base=new URL(site);
 if(base.protocol!=='https:')throw Error('Published release URL must use HTTPS');
 const expected=new Map(await Promise.all(CRITICAL_FILES.map(async file=>[file,digest(await fs.readFile(path.join(root,file)))])));
 let remaining=[];
 for(let attempt=1;attempt<=attempts;attempt++){
  const checks=await Promise.all(CRITICAL_FILES.map(async file=>{
   const url=new URL(file,base);url.searchParams.set('release',sha);url.searchParams.set('n',String(attempt));
   try{
    const response=await fetcher(url.toString(),{
     headers:{'Cache-Control':'no-cache'},
     signal:AbortSignal.timeout(timeoutMs)
    });
    if(!response.ok)return {file,problem:'HTTP '+response.status};
    const published=digest(Buffer.from(await response.arrayBuffer()));
    return {file,problem:published===expected.get(file)?null:'content mismatch'};
   }catch(error){return {file,problem:'request '+(error?.name||'failed')};}
  }));
  remaining=checks.filter(x=>x.problem);
  if(!remaining.length){
   log('LIVE_RELEASE_VERIFIED: '+CRITICAL_FILES.length+' critical assets match '+sha+' (attempt '+attempt+')');
   return {sha,attempts:attempt,verified:CRITICAL_FILES.slice()};
  }
  log('Attempt '+attempt+'/'+attempts+': '+remaining.map(x=>x.file+' ('+x.problem+')').join(', '));
  if(attempt<attempts)await sleep(delayMs);
 }
 throw Error('Published Pages release is inconsistent with '+sha+': '+remaining.map(x=>x.file+' ('+x.problem+')').join(', '));
}
if(require.main===module)verifyRelease().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={CRITICAL_FILES,digest,verifyRelease};
