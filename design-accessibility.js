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
  // The account label is icon-only at phone widths; keep the actual status
  // available to assistive technology even when the visible text is concealed.
  const account = document.getElementById('accountBtn');
  if (account) {
    const syncAccount = () => {
      const visibleStatus = (account.textContent || '').trim().replace(/\s+/g, ' ').slice(0,80);
      account.setAttribute('aria-label', visibleStatus
        ? 'Google account and sync: ' + visibleStatus
        : 'Google account and sync status');
    };
    const accountObserver = new MutationObserver(syncAccount);
    accountObserver.observe(account, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['data-state']
    });
    syncAccount();
  }
})();
