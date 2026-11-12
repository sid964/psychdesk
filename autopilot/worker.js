/* Deterministic, local-only text extraction. Never alters the source. */
'use strict';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const word=s=>clean(s).normalize('NFKD').toLowerCase().replace(/[^a-z0-9 ]/g,'');
function analyze(source){
 const text=String(source.text||'').slice(0,120000);
 const lines=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
 const terms=[],cards=[],headings=[],questions=[],dates=[],people=[],dois=[];
 const seen=new Set();
 const definition=/^([A-Za-z][A-Za-z\s\-()]{2,70})\s*(?::|–|—|\bis\s+defined\s+as\b)\s*(.{12,550})$/i;
 for(const line of lines.slice(0,2000)){
  if (/^(?:#{1,4}\s+|(?:chapter|unit|section|lecture)\s+\d+\b)/i.test(line) && line.length<180)headings.push(clean(line.replace(/^#+\s*/,'')));
  else if (/^(?:\d+(?:\.\d+)*[.)]?\s+|[A-Z][A-Z\s]{5,70}$)/.test(line)&&line.length<110)headings.push(clean(line));
  if (/\?$/.test(line)&&line.length<220)questions.push(line);
  const m=line.match(definition);
  if(m&&m[2].split(/\s+/).length>=3){
   const term=clean(m[1]),answer=clean(m[2]);
   const k=word(term);
   if(!seen.has(k)&&!/^(?:the|an|this|that|note|example)$/i.test(term)){
    seen.add(k);terms.push(term);
    cards.push({question:'What is '+term+'?',answer,origin:'explicit definition',term});
   }
  }
  const doi=line.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/ig)||[];
  for(const v of doi)if(!dois.includes(v))dois.push(v.replace(/[.,;]$/,''));
  const year=line.match(/\b(?:18|19|20)\d{2}\b/g)||[];
  for(const v of year)if(!dates.includes(v))dates.push(v);
  const named=line.match(/\b(?:Piaget|Vygotsky|Pavlov|Skinner|Bandura|Freud|Wundt|James|Beck|Rogers|Watson|Erikson|Kahneman|Tulving|Ebbinghaus)\b/gi)||[];
  for(const v of named)if(!people.some(x=>x.toLowerCase()===v.toLowerCase()))people.push(v);
 }
 const tags=[
  ['cog',['memory','attention','perception','working memory','cognition']],
  ['bio',['neuron','brain','amygdala','synapse','neurotransmitter']],
  ['dev',['piaget','vygotsky','development','childhood','attachment']],
  ['soc',['social','conformity','attitude','prejudice','group']],
  ['res',['hypothesis','sample','validity','reliability','experiment','statistics']],
  ['counsel',['therapy','counseling','counselling','cbt','psychotherapy']],
  ['abnormal',['disorder','psychopathology','symptoms','diagnosis']]
 ];
 const corpus=word((source.title||'')+' '+text.slice(0,30000));
 const title=word(source.title||'');
 const contains=term=>(' '+corpus+' ').includes(' '+word(term)+' ');
 const categoryScores=new Map(tags.map(([id,keys])=>[id,{hits:keys.reduce((n,k)=>n+(contains(k)?1:0),0),matched:keys.filter(contains)}]));
 const subjectList=Array.isArray(source.subjects)?source.subjects.filter(s=>s&&typeof s.id==='string'&&typeof s.name==='string').slice(0,80):[];
 const stop=new Set(['psychology','psychological','study','studies','and','the','of','for','introduction','course','semester','unit','subject','topics']);
 const scored=(subjectList.length?subjectList.map(s=>{
  const normalized=word(s.name);
  const words=[...new Set(normalized.split(' ').filter(t=>t.length>=4&&!stop.has(t)))];
  const keywordMatches=words.filter(contains);
  const titleMatches=words.filter(w=>(' '+title+' ').includes(' '+w+' '));
  const legacy=categoryScores.get(s.id)||{hits:0,matched:[]};
  const matched=[...new Set([...legacy.matched,...keywordMatches])];
  const hits=legacy.hits+keywordMatches.length+titleMatches.length;
  return {id:s.id,hits,matched};
 }):tags.map(([id])=>({id,hits:categoryScores.get(id)?.hits||0,matched:categoryScores.get(id)?.matched||[]})))
 .sort((a,b)=>b.hits-a.hits||a.id.localeCompare(b.id));
 const guess=scored[0]?.hits>=2&&scored[0].hits>(scored[1]?.hits||0)?scored[0].id:'';
 const confidence=guess?Math.min(.96,.58+scored[0].hits*.11):0;
 const outline=headings.slice(0,40);
 return {sourceId:source.id,revision:source.revision,terms:terms.slice(0,60),cards:cards.slice(0,25),outline,questions:questions.slice(0,25),years:dates.slice(0,30),researchers:people.slice(0,30),dois:dois.slice(0,20),suggestion:{subjectId:guess,confidence,matched:guess?scored[0].matched.slice(0,8):[]},type:/\blecture|transcript\b/i.test(source.title||'')?'lecture':outline.some(s=>/^chapter\b/i.test(s))?'chapter':'note',excerpt:clean(text).slice(0,320)};
}
self.onmessage=e=>{const {jobId,source}=e.data||{};try{self.postMessage({jobId,result:analyze(source)})}catch(error){self.postMessage({jobId,error:String(error?.message||error)})}};
