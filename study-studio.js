/* Small, optional study activities and progressive layouts; no new account data. */
(()=>{'use strict';
const core=window.PsychDeskCore;if(!core)return;
const expanded=new Map(),choices=new Map();let current='today';
const prompts={
 today:[['Could a test be reliable but not valid?','Give an example, then check your Psychometrics material.'],['What would Piaget and Vygotsky explain differently?','Choose one learning situation. Compare the two explanations.'],['When would you use a paired t-test?','State the design, choose the test, then check your Statistics notes.']],
 university:[['Try an answer without your notes.','Choose one syllabus heading. Write a definition, an explanation and an example; check all three afterwards.'],['Turn a difficult topic into three questions.','Try one now, then set a study date for another attempt.']],
 psychology:[['Explain an idea to a curious friend.','Use everyday language and one concrete example. Then check what your explanation leaves out.'],['Find two theories that disagree.','What evidence would help you decide between their predictions?']],
 planner:[['Make room for one small win.','Choose a topic you can actually work through today, rather than filling every free hour.'],['Plan the return visit.','After one study attempt, set a later date to try recalling it again.']],
 notes:[['Start with “I used to think… now I think…”.','Write one thing a lecture or reading changed your mind about.'],['Make a one-minute explanation.','Use a definition, an example and one question you still have.']],
 ink:[['Draw the idea before describing it.','Try a diagram of a process, then label the links from memory.'],['Try a visual comparison.','Divide the page in two. Put a theory on each side and draw what connects them.']],
 stickies:[['One sticky, one thought.','Capture a question or a useful example. You can organize it later.'],['Make a reminder for your future self.','Write the distinction you keep mixing up, with one example.']],
 recall:[['Answer first. Peek second.','Say the answer or write a quick version before revealing the card.'],['Add an example to the definition.','After recalling a term, use it in a situation you have not memorized.']],
 focus:[['Give this session a finish line.','For example: read two pages and explain the main claim. Minutes are a guide, not the learning outcome.'],['Finish with one sentence.','What do you understand now that you could not explain at the start?']],
 materials:[['Read with a question in mind.','Write one question before you open the book. Look for evidence that answers it.'],['Keep one useful passage.','After reading, save a short explanation in your own words, with the source.']],
 reader:[['Pause after a paragraph.','Look away and explain its main idea. Then reread to check it.'],['Highlight less, explain more.','Choose one passage and write why it matters instead of marking the whole page.']],
 research:[['Be a source detective.','Identify the claim, the method, and one limitation before you use a study in an answer.'],['Compare two sources.','Do they reach the same conclusion? Check whether they studied the same population and question.']],
 dictionary:[['Guess before opening a definition.','What do you think the term means? Check it, then make your own example.'],['Find a confusing pair.','Choose two similar terms and state the difference in one sentence.']],
 timeline:[['Connect an event to an idea.','Which question was this researcher trying to answer? Read the linked source for context.'],['Look for a change in thinking.','Choose two milestones and explain what changed between them.']],
 search:[['Follow a thread.','Search one concept, then compare what you wrote in a note with your flashcards about it.']],
 voice:[['Teach it out loud.','Explain a concept for a minute, then review and correct the transcript.'],['Try a spoken summary.','What is the main claim, the evidence and the question you still have?']],
 board:[['Build a wall of questions.','Put one question on each card. Move related questions next to one another.'],['Sort the evidence.','Use one card per finding and group cards that support different explanations.']],
 mindmap:[['Start with just three concepts.','Connect them and explain aloud what each connection means.'],['Map from memory first.','Check your sources afterwards and add what was missing.']],
 insights:[['Find one useful pattern.','Which subject got your attention this week? Choose one small adjustment for the next session.'],['Look beyond minutes.','Write down something you can explain better now. Logged time alone cannot show understanding.']]
};
function fold(node,label,key){
 if(!node||node.closest('.studio-disclosure'))return;
 const details=document.createElement('details');details.className='studio-disclosure';
 details.open=expanded.get(current+':'+key)||false;
 const summary=document.createElement('summary');summary.textContent=label;details.append(summary);
 node.before(details);details.append(node);
 const stateKey=current+':'+key;details.addEventListener('toggle',()=>expanded.set(stateKey,details.open));
}
function group(root,selectors,label,key){
 const nodes=selectors.map(s=>root.querySelector(s)).filter(Boolean);if(!nodes.length)return;
 const box=document.createElement('div');box.className='studio-optional-fields';nodes[0].before(box);for(const node of nodes)box.append(node);fold(box,label,key);
}
function spark(root,tab){
 const items=prompts[tab];if(!items)return;
 const box=document.createElement('details');box.className='studio-spark';
 const name=tab==='notes'?'Need a writing prompt?':'Optional study prompt';
 box.innerHTML='<summary>'+name+'</summary><div class="studio-spark-body"><h2></h2><p class="note"></p><button type="button" class="link-btn" data-studio="another">Another idea ↻</button></div>';
 const draw=()=>{const row=items[(choices.get(tab)||0)%items.length];box.querySelector('h2').textContent=row[0];box.querySelector('p').textContent=row[1]};draw();
 box.querySelector('button').hidden=items.length<2;
 box.querySelector('button').addEventListener('click',()=>{choices.set(tab,(choices.get(tab)||0)+1);draw()});
 const hero=root.querySelector('.hero');if(hero)hero.after(box);
}
function enhance(root,tab){
 current=tab;root.dataset.studyLayout=tab;
 if(root.querySelector('.studio-spark'))return;
 if(tab==='today'){
  const box=root.querySelector('.desk-question');if(box){const b=document.createElement('button');b.type='button';b.className='link-btn studio-another';b.textContent='Another question ↻';b.addEventListener('click',()=>{const i=((choices.get(tab)||0)+1)%prompts.today.length;choices.set(tab,i);box.querySelector('h2').textContent=prompts.today[i][0];box.querySelector('p').textContent=prompts.today[i][1]});box.append(b);}return;
 }
 if(tab==='tools'){
  const nav=document.createElement('nav');nav.className='studio-jumps';nav.setAttribute('aria-label','Find a kind of study tool');
  root.querySelectorAll('.tool-group').forEach((section,i)=>{section.id='studio-tool-group-'+i;const link=document.createElement('a');link.href='#'+section.id;link.textContent=section.querySelector('h2').textContent;nav.append(link)});root.querySelector('.hero')?.after(nav);return;
 }
 spark(root,tab);
 if(tab==='dictionary'||tab==='timeline'){
  const b=document.createElement('button');b.className='secondary studio-surprise';b.type='button';b.textContent=tab==='dictionary'?'Surprise me with a concept ↗':'Explore a milestone ↗';
  b.addEventListener('click',()=>{const k=window.PsychDeskKnowledge,list=tab==='dictionary'?k.glossary():k.history();if(!list.length)return;const previous=choices.get(tab+':id');const pool=list.filter(x=>x.id!==previous);const source=pool.length?pool:list;const item=source[Math.floor(Math.random()*source.length)];choices.set(tab+':id',item.id);if(tab==='dictionary')k.openTerm(item.id);else k.openEvent(item.id);const target=root.querySelector(tab==='dictionary'?'#psyDefinitionDetail':'#psyEventDetail');if(target){target.setAttribute('tabindex','-1');target.scrollIntoView({block:'nearest'});target.focus({preventScroll:true});}});root.querySelector('.hero')?.append(b);
 }
 if(tab==='recall'){
  fold(root.querySelector('.study-recall-panel'),'Make cards from notes · when you need it','generate');
  const heading=[...root.querySelectorAll('.section-row')].find(row=>row.querySelector('h2')?.textContent==='Your deck');
  if(heading){const box=document.createElement('div');heading.before(box);let node=heading;while(node&&!node.classList.contains('spacer')&&!node.classList.contains('studio-disclosure')){const next=node.nextElementSibling;box.append(node);node=next;}fold(box,'Browse & edit your flashcards','deck');}
 }
 if(tab==='research'){
  fold(root.querySelector('.ref-metrics'),'Your source collection in numbers','metrics');
  const labels=[...root.querySelectorAll('.ref-controls>label')].slice(1);if(labels.length){const box=document.createElement('div');box.className='studio-reference-filters';labels[0].before(box);labels.forEach(label=>box.append(label));fold(box,'Filter & sort your sources','ref-filters');}
 }
 if(tab==='dictionary'||tab==='timeline')fold(root.querySelector('.psy-info-strip'),'About this collection','collection');
 if(tab==='insights')fold(root.querySelector('.summary-grid'),'Your week in numbers','week-numbers');
 if(tab==='voice')group(root,['.study-voice-label:has(#voiceTitle)','.study-voice-label:has(#voiceSubject)'],'Title & subject · optional','voice-meta');
 if(tab==='ink'){
  fold(root.querySelector('.ink-note-meta'),'Name this page or choose a subject','ink-meta');
  fold(root.querySelector('.ink-export-actions'),'Export or manage this page','ink-export');
 }
 if(tab==='materials'){
  const notes=root.querySelectorAll(':scope > p.note');notes.forEach((node,i)=>fold(node,i?'Saving, sync & original files':'File sizes & upload details','library-help-'+i));
 }
 if(tab==='focus'){
  const panel=root.querySelector('.study-focus-extras'),card=root.querySelector('.focus-clock')?.closest('.card');if(panel&&card)card.after(panel);
 }
 if(tab==='insights'){
  const action=document.createElement('button');action.type='button';action.className='secondary studio-plan';action.dataset.tab='planner';action.textContent='Plan one small next step →';root.querySelector('.hero')?.append(action);
 }
}
window.PsychDeskStudio={enhance};core.render();
})();
