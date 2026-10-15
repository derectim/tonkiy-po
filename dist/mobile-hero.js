/* Keep the first screen stable while mobile browser bars or keyboards move. */
(() => {
  'use strict';
  const hero = document.querySelector('.table-hero');
  if (!hero || typeof window.matchMedia !== 'function') return;
  const mobile = window.matchMedia('(max-width: 600px)');
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.mobile-app-nav');
  let measuredWidth = 0, resizeTimer = 0;

  function measure() {
    resizeTimer = 0;
    if (!mobile.matches) {
      if (!measuredWidth) return;
      hero.style.removeProperty('--mobile-hero-height');
      delete hero.dataset.heroSize;
      measuredWidth = 0;
      document.dispatchEvent(new CustomEvent('cafe:hero-layout'));
      return;
    }
    const width = window.innerWidth;
    if (width === measuredWidth) return;
    hero.style.removeProperty('--mobile-hero-height');
    const height = Math.round(hero.getBoundingClientRect().height);
    if (height <= 0) return;
    const headerHeight = header?.getBoundingClientRect().height || 0;
    const navHeight = nav ? Number.parseFloat(getComputedStyle(nav).height) || 0 : 0;
    const screenHeight = height + headerHeight + navHeight;
    hero.style.setProperty('--mobile-hero-height', `${height}px`);
    hero.dataset.heroSize = screenHeight <= 480 ? 'short' : screenHeight <= 690 ? 'compact' : 'regular';
    measuredWidth = width;
    document.dispatchEvent(new CustomEvent('cafe:hero-layout'));
  }

  function onViewportChange() {
    if (mobile.matches && window.innerWidth === measuredWidth) return;
    clearTimeout(resizeTimer);
    if (!mobile.matches) { measure(); return; }
    // Wait for the final dimensions after rotation; height-only changes do nothing.
    resizeTimer = setTimeout(measure, 160);
  }

  window.addEventListener('resize', onViewportChange, { passive: true });
  window.addEventListener('pageshow', onViewportChange);
  window.addEventListener('pagehide', () => { clearTimeout(resizeTimer); resizeTimer = 0; });
  mobile.addEventListener('change', onViewportChange);
  measure();
})();
