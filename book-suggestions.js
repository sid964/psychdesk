/* Private PDF suggestion entry point. Uploaded files belong in the owner's
   Google Form / Drive, never a public GitHub Issue or the site's Firestore records. */
(()=>{'use strict';
 const core=window.PsychDeskCore;
 if(!core)return;
 const h=core.esc;
 function formLink(){
  const raw=String(window.PSYCHDESK_BOOK_SUGGESTION_FORM_URL||'').trim();
  try{
   const u=new URL(raw);
   if(u.protocol!=='https:')return '';
   if(u.hostname==='forms.gle'&&u.pathname.length>1)return u.href;
   if(u.hostname==='docs.google.com'&&/^\/forms\/(?:d\/e\/)?[\w-]+\/(?:viewform|formResponse)\/?$/.test(u.pathname))return u.href;
  }catch{}
  return '';
 }
 function open(){
  const url=formLink();
  core.openModal('Suggest a book',
   '<section class="book-suggestion-modal">'+
   '<p>Know a psychology reference book that should be included in this bookshelf? Suggest it for review and indexing.</p>'+
   (url?
    '<p>The submission form asks for the book title, author, and <strong>a PDF file (required)</strong>. You may need to sign in with Google to upload. Files are delivered privately to the form owner, not published on GitHub.</p>'+
    '<a class="primary book-suggestion-go" href="'+h(url)+'" target="_blank" rel="noopener noreferrer">Open suggestion form</a>':
    '<p class="book-suggestion-unavailable" role="status">PDF suggestions are not open yet. The private upload form still needs to be connected by the site owner. Please check back later.</p>')+
   '<p class="book-suggestion-note">Only share PDFs that you have permission to distribute. Suggestions are reviewed before being added to the bookshelf.</p>'+
   '</section>');
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('[data-book-suggest="open"]');
  if(!button)return;
  event.preventDefault();open();
 });
 window.PsychDeskBookSuggestions={open,formLink};
})();
