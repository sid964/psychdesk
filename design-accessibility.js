/* Keep existing navigation buttons and routes. Expose the selected page to screen readers. */
(() => {
  'use strict';
  const navs = [...document.querySelectorAll('.rail-nav, .bottom-nav')];
  if (!navs.length || !('MutationObserver' in window)) return;
  const sync = nav => {
    for (const button of nav.querySelectorAll('button[data-tab]')) {
      if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  };
  for (const nav of navs) {
    sync(nav);
    const observer = new MutationObserver(changes => {
      if (changes.some(change => change.attributeName === 'class')) sync(nav);
    });
    observer.observe(nav, {subtree: true, attributes: true, attributeFilter: ['class']});
  }
})();
