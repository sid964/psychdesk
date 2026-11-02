/* Presentation-only enhancements; no study-data writes or service changes. */
(() => {
 'use strict';
 document.addEventListener('click', event => {
  if (event.target.closest('[data-workspace-settings]')) window.PsychDeskCore?.settings();
 });
 // Keep the saved light/dark preference intact while this OLED design stays black.
 const meta = document.querySelector('meta[name="theme-color"]');
 if (meta) {
  const update = () => { if (meta.content !== '#000000') meta.content = '#000000'; };
  update(); new MutationObserver(update).observe(meta, {attributes:true,attributeFilter:['content']});
 }
 // Make long detail panes reachable immediately after selecting a mobile result.
 document.addEventListener('click', event => {
  if (!matchMedia('(max-width:650px)').matches) return;
  const selected = event.target.closest('[data-psy="selectTerm"],[data-psy="selectEvent"]');
  if (selected) requestAnimationFrame(() => {
   const detail = document.querySelector(selected.dataset.psy === 'selectTerm' ? '#psyDefinitionDetail' : '#psyEventDetail');
   if (!detail) return;
   detail.setAttribute('tabindex','-1');
   detail.focus({preventScroll:true});
   detail.scrollIntoView({block:'start',behavior:'instant'});
  });
 });
})();
