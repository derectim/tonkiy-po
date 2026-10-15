import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const dist = path.resolve(import.meta.dirname, '../dist');
const catalogContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(dist, 'catalog.js'), 'utf8'), catalogContext);
const products = catalogContext.window.CAFE_PRODUCTS;
const order = ['soups', 'wok', 'hot', 'snacks', 'sides', 'desserts', 'drinks'];
const classList = () => { const names = new Set(); return { add: name => names.add(name), remove: name => names.delete(name), contains: name => names.has(name), toggle(name, yes) { if (yes) names.add(name); else names.delete(name); } }; };
function emitter() { const handlers = {}; return { addEventListener(type, fn) { (handlers[type] ||= []).push(fn); }, dispatchEvent(event) { for (const fn of handlers[event.type] || []) fn(event); }, handlers }; }
const CustomEvent = class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } };
const node = () => ({ ...emitter(), textContent: '', innerHTML: '', value: '', dataset: {}, classList: classList(), setAttribute(name, value) { this[name] = value; }, querySelector() { return null; }, querySelectorAll() { return []; }, focus() {} });

// Exercise the application renderer and real category-click handler in both layout modes.
{
  const nodes = Object.fromEntries(['#products-grid', '#menu-title', '#menu-count', '#menu-search', '#category-tabs'].map(id => [id, node()]));
  const buttons = ['all', ...order].map(category => ({ ...node(), dataset: { category } }));
  nodes['#category-tabs'].contains = element => buttons.includes(element);
  const media = { matches: true, ...emitter() };
  const document = { ...emitter(), body: { classList: classList() }, documentElement: { style: { setProperty() {} } }, querySelector: selector => nodes[selector] || null, querySelectorAll: selector => selector === '#category-tabs [data-category]' ? buttons : [] };
  const context = { window: { CAFE_PRODUCTS: products, matchMedia: () => media, addEventListener() {} }, document, localStorage: { getItem: () => null, setItem() {} }, sessionStorage: { getItem: () => null }, CustomEvent, requestAnimationFrame: fn => fn(), setTimeout: () => 1, clearTimeout() {} };
  vm.runInNewContext(fs.readFileSync(path.join(dist, 'app.js'), 'utf8'), context);
  const html = () => nodes['#products-grid'].innerHTML;
  const groupNames = () => [...html().matchAll(/data-category-section="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(groupNames(), order);
  assert.equal([...html().matchAll(/<article class="product-card/g)].length, 29);
  assert.equal([...html().matchAll(/data-card-control="[^"]+"/g)].length, 29);
  assert.equal([...html().matchAll(/data-action="card-add"/g)].length, 29);
  assert.doesNotMatch(html(), /<span class="add-label">(?:Подробнее|Выбрать)/);
  for (const item of products.filter(item => item.variants?.length)) {
    const button = html().match(new RegExp(`<button[^>]*data-action="card-add"[^>]*data-id="${item.id}"[^>]*>`))?.[0];
    assert.ok(button?.includes('aria-label="Выбрать вариант:'), `${item.id} requires an explicit variant selection`);
  }
  let requested;
  document.addEventListener('cafe:category-request', event => { requested = event.detail.category; });
  const before = html();
  const categoryClick = category => document.dispatchEvent({ type: 'click', target: { closest: selector => selector === '[data-category]' ? buttons.find(button => button.dataset.category === category) : null } });
  categoryClick('drinks');
  assert.equal(requested, 'drinks');
  assert.equal(html(), before, 'category navigation keeps every mobile section and card');
  assert.equal(buttons.find(button => button.dataset.category === 'drinks')['aria-pressed'], 'true');
  console.log('PASS: complete grouped mobile menu, 29 quantity controls/add buttons, and explicit variant-selection labels');

  nodes['#menu-search'].value = 'Фо Бо';
  nodes['#menu-search'].dispatchEvent({ type: 'input', target: nodes['#menu-search'] });
  assert.ok(html().includes('Фо Бо'));
  assert.ok(!groupNames().includes('drinks'));
  assert.equal(buttons.find(button => button.dataset.category === 'drinks').disabled, true);
  assert.equal(nodes['#menu-title'].textContent, 'Результаты поиска');
  assert.equal(nodes['#menu-search'].value, 'Фо Бо', 'search input remains outside rendered cards');
  nodes['#menu-search'].value = '';
  nodes['#menu-search'].dispatchEvent({ type: 'input', target: nodes['#menu-search'] });
  assert.deepEqual(groupNames(), order);
  assert.equal(buttons.find(button => button.dataset.category === 'drinks').disabled, false);
  console.log('PASS: search spans the entire menu, removes empty groups, and keeps the input');

  media.matches = false; media.dispatchEvent({ type: 'change' });
  categoryClick('wok');
  assert.equal(groupNames().length, 0);
  assert.equal([...html().matchAll(/<article class="product-card/g)].length, products.filter(item => item.category === 'wok').length);
  assert.equal(nodes['#menu-title'].textContent, 'Вок');
  media.matches = true; media.dispatchEvent({ type: 'change' });
  assert.deepEqual(groupNames(), order);
  console.log('PASS: resizing restores desktop filtering and the complete mobile sections');
}

// Exercise the scroll controller with cached section positions and an asynchronous RAF queue.
{
  const window = { ...emitter(), scrollY: 0, innerHeight: 844, scrollTo(options) { this.lastScroll = options; } };
  const media = { matches: true, ...emitter() }, reduced = { matches: false, ...emitter() };
  window.matchMedia = query => query.includes('reduced') ? reduced : media;
  const rail = { ...node(), scrollLeft: 0, clientWidth: 390, getBoundingClientRect: () => ({ left: 0, height: 46 }), scrollTo(options) { this.lastScroll = options; this.scrollLeft = options.left; } };
  const buttons = ['all', ...order].map((category, index) => ({ ...node(), dataset: { category }, getBoundingClientRect: () => ({ left: 16 + index * 112 - rail.scrollLeft, width: 104 }) }));
  rail.querySelectorAll = () => buttons;
  const sectionNodes = order.map((category, index) => ({ dataset: { categorySection: category }, getBoundingClientRect: () => ({ top: 1040 + index * 800 - window.scrollY }) }));
  const grid = { ...node(), querySelectorAll: () => sectionNodes };
  const content = { getBoundingClientRect: () => ({ top: 1000 - window.scrollY }) };
  const index = { getBoundingClientRect: () => ({ height: 65 }) };
  const header = { getBoundingClientRect: () => ({ height: 72 }) };
  const nodes = { '#category-tabs': rail, '.menu-index': index, '.menu-content': content, '#products-grid': grid, '.site-header': header };
  const document = { ...emitter(), hidden: false, body: { classList: classList() }, documentElement: { scrollHeight: 8000, style: { setProperty() {} } }, querySelector: selector => nodes[selector] || null };
  let queue = [], rafId = 0;
  const requestAnimationFrame = fn => { queue.push(fn); return ++rafId; };
  const flush = () => { while (queue.length) { const current = queue; queue = []; for (const fn of current) fn(); } };
  const events = [];
  document.addEventListener('cafe:category-active', event => events.push(event.detail.category));
  vm.runInNewContext(fs.readFileSync(path.join(dist, 'mobile-nav.js'), 'utf8'), { window, document, CustomEvent, requestAnimationFrame, setTimeout: () => 1, clearTimeout() {} });
  flush();
  assert.equal(events.at(-1), 'all');
  document.dispatchEvent(new CustomEvent('cafe:category-request', { detail: { category: 'drinks' } })); flush();
  assert.equal(window.lastScroll.top, 1040 + 6 * 800 - 149);
  assert.equal(window.lastScroll.behavior, 'instant');
  assert.equal(events.at(-1), 'drinks');
  window.scrollY = 1200; window.dispatchEvent({ type: 'scroll' }); flush();
  assert.equal(events.at(-1), 'drinks', 'a delayed scroll event cannot override a deliberate jump before arrival');
  window.scrollY = window.lastScroll.top; window.dispatchEvent({ type: 'scroll' }); flush();
  assert.equal(events.at(-1), 'drinks');
  assert.ok(rail.scrollLeft > 0, 'active chip is brought into the horizontal viewport');
  assert.equal(rail.lastScroll.behavior, 'instant');
  console.log('PASS: immediate category jump accounts for header/rail and reveals the selected chip horizontally');

  window.scrollY = 1040 - 149; window.dispatchEvent({ type: 'scroll' }); flush();
  assert.equal(events.at(-1), 'soups');
  assert.equal(rail.scrollLeft, 112, 'scrollspy restores the earlier chip without any vertical scroll call');
  const lastJump = window.lastScroll;
  window.scrollY = 1040 + 3 * 800 - 149; window.dispatchEvent({ type: 'scroll' }); flush();
  assert.equal(events.at(-1), 'snacks');
  assert.equal(window.lastScroll, lastJump, 'scrollspy never commands vertical scroll');
  reduced.matches = true;
  document.dispatchEvent(new CustomEvent('cafe:category-request', { detail: { category: 'wok' } })); flush();
  assert.equal(window.lastScroll.behavior, 'instant');
  window.dispatchEvent({ type: 'touchstart' }); flush();
  window.scrollY = 0; window.dispatchEvent({ type: 'scroll' }); flush();
  assert.equal(events.at(-1), 'all');
  console.log('PASS: manual scrolling tracks categories, touch interrupts jumps, and immediate navigation also respects reduced motion');
}
