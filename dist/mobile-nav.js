/* Persistent navigation and a measured, event-driven mobile menu section rail. */
(() => {
  'use strict';
  const nav = document.querySelector('.mobile-app-nav');
  const rail = document.querySelector('#category-tabs');
  const index = document.querySelector('.menu-index');
  const content = document.querySelector('.menu-content');
  const grid = document.querySelector('#products-grid');
  const header = document.querySelector('.site-header');
  const mobile = window.matchMedia('(max-width: 600px)');
  const buttons = rail ? [...rail.querySelectorAll('[data-category]')] : [];
  let sections = [], contentTop = 0, active = '', offset = 149, scrollFrame = 0, measureFrame = 0;
  let pending = null, pendingTimer = 0;

  function update(detail = {}) {
    if (!nav) return;
    const badge = nav.querySelector('[data-mobile-cart-count]');
    const orderIndicator = nav.querySelector('.mobile-order-indicator');
    const count = Number.isInteger(detail.cartCount) ? detail.cartCount : Number(document.querySelector('#cart-count')?.textContent || 0);
    if (badge) { badge.hidden = count < 1; badge.textContent = count > 99 ? '99+' : String(count); }
    const hasOrder = Object.hasOwn(detail, 'activeOrder') ? Boolean(detail.activeOrder) : Boolean(document.querySelector('#order-dock.has-active-order'));
    if (orderIndicator) orderIndicator.hidden = !hasOrder;
    nav.querySelector('[data-action="track"]')?.setAttribute('aria-label', hasOrder ? 'Заказы: доступен статус заказа' : 'Заказы');
  }

  function revealChip(category) {
    const button = buttons.find((item) => item.dataset.category === category);
    if (!button || !rail || !mobile.matches) return;
    const railRect = rail.getBoundingClientRect(), buttonRect = button.getBoundingClientRect();
    const left = buttonRect.left - railRect.left + rail.scrollLeft, right = left + buttonRect.width;
    const visibleLeft = rail.scrollLeft + 16, visibleRight = rail.scrollLeft + rail.clientWidth - 16;
    if (left < visibleLeft || right > visibleRight) {
      const next = left < visibleLeft ? left - 16 : right - rail.clientWidth + 16;
      rail.scrollTo({ left: Math.max(0, next), behavior: 'instant' });
    }
  }

  function activate(category, force = false) {
    if (active === category && !force) return;
    active = category;
    document.dispatchEvent(new CustomEvent('cafe:category-active', { detail: { category } }));
    revealChip(category);
  }

  function cancelPending() { pending = null; clearTimeout(pendingTimer); }

  function spy() {
    scrollFrame = 0;
    if (!mobile.matches || document.hidden || document.body.classList.contains('has-open-dialog')) return;
    const position = window.scrollY;
    if (pending) {
      if (Math.abs(position - pending.top) > 3) return;
      cancelPending();
    }
    let category = 'all';
    // Section positions are measured only on layout changes; scrolling reads one number.
    for (const section of sections) {
      if (section.top > position + offset + 2) break;
      category = section.category;
    }
    if (position + offset < contentTop) category = 'all';
    activate(category);
  }

  function scheduleSpy() { if (!scrollFrame && mobile.matches) scrollFrame = requestAnimationFrame(spy); }

  function measure() {
    measureFrame = 0;
    if (!mobile.matches || !grid || !content) { sections = []; cancelPending(); return; }
    const railHeight = index?.getBoundingClientRect().height || 65;
    const headerHeight = header?.getBoundingClientRect().height || 72;
    offset = Math.ceil(headerHeight + railHeight + 12);
    document.documentElement.style.setProperty('--category-rail-height', `${Math.ceil(railHeight)}px`);
    contentTop = content.getBoundingClientRect().top + window.scrollY;
    sections = [...grid.querySelectorAll('[data-category-section]')].map((element) => ({
      category: element.dataset.categorySection,
      top: element.getBoundingClientRect().top + window.scrollY,
    }));
    scheduleSpy();
  }

  function scheduleMeasure() { if (!measureFrame) measureFrame = requestAnimationFrame(measure); }

  function scrollToCategory(category) {
    if (!mobile.matches || !content) return;
    // Refresh once before a deliberate navigation so late fonts or images cannot shift the target.
    measure();
    const section = sections.find((item) => item.category === category);
    if (category !== 'all' && !section) return;
    const destination = (category === 'all' ? contentTop : section.top) - offset;
    const maximum = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const top = Math.min(maximum, Math.max(0, Math.round(destination)));
    cancelPending();
    pending = { category, top };
    activate(category, true);
    // Immediate app-style jumps keep horizontal rail and page navigation from competing.
    pendingTimer = setTimeout(() => { cancelPending(); scheduleSpy(); }, 2200);
    window.scrollTo({ top, behavior: 'instant' });
    scheduleSpy();
  }

  document.addEventListener('cafe:state-change', (event) => update(event.detail || {}));
  document.addEventListener('cafe:category-request', (event) => scrollToCategory(event.detail?.category || 'all'));
  document.addEventListener('cafe:menu-rendered', () => { cancelPending(); active = ''; scheduleMeasure(); });
  document.addEventListener('cafe:menu-mode', scheduleMeasure);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleMeasure(); });
  window.addEventListener('scroll', scheduleSpy, { passive: true });
  window.addEventListener('resize', scheduleMeasure, { passive: true });
  // User input can interrupt a category jump instead of waiting for its timeout.
  for (const event of ['wheel', 'touchstart', 'pointerdown']) window.addEventListener(event, () => { if (pending) { cancelPending(); scheduleSpy(); } }, { passive: true });
  window.addEventListener('keydown', (event) => { if (pending && ['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) { cancelPending(); scheduleSpy(); } });
  mobile.addEventListener('change', () => { active = ''; cancelPending(); scheduleMeasure(); });
  if (typeof ResizeObserver === 'function') {
    const observer = new ResizeObserver(scheduleMeasure);
    for (const element of [grid, index, header].filter(Boolean)) observer.observe(element);
  }
  document.fonts?.ready.then(scheduleMeasure);
  update();
  scheduleMeasure();
})();
