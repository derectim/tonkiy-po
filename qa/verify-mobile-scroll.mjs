import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// Run the actual motion controller. A refresh models ScrollTrigger's real
// zero-and-restore scroll writes, so a mobile resize regression is observable.
const source = fs.readFileSync(path.resolve(import.meta.dirname, '../dist/editorial-motion.js'), 'utf8');

function emitter() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (typeof callback !== 'function') return;
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    removeEventListener(type, callback) { listeners.get(type)?.delete(callback); },
    dispatch(type, detail = {}) {
      for (const callback of [...(listeners.get(type) || [])]) callback({ type, ...detail });
    },
    listenerCount(type) { return listeners.get(type)?.size || 0; },
  };
}

function environment({ width = 390, coarse = true, reduced = false } = {}) {
  const calls = { refresh: 0, scroll: [], enable: 0, disable: 0, intro: 0, triggers: 0, reverts: 0 };
  let nextTimer = 0;
  const timers = new Map(), microtasks = [], observers = [], lenisInstances = [], ticker = new Set();
  const media = new Map([
    ['(min-width: 901px)', { ...emitter(), matches: width >= 901 }],
    ['(pointer: coarse)', { ...emitter(), matches: coarse }],
    ['(prefers-reduced-motion: reduce)', { ...emitter(), matches: reduced }],
  ]);
  class Element {
    constructor(name = 'DIV') { this.tagName = name; this.dataset = {}; this.style = {}; this.parentElement = null; }
    closest() { return null; }
    contains(element) { return this === element; }
    hasAttribute() { return false; }
    remove() { this.removed = true; }
  }
  class HTMLImageElement extends Element { constructor() { super('IMG'); } }
  const hero = new Element(), reveal = new Element(), image = new HTMLImageElement();
  const fonts = { ...emitter(), ready: { then(callback) { microtasks.push(callback); } } };
  const document = {
    ...emitter(), hidden: false, fonts, openDialog: false,
    body: new Element('BODY'), documentElement: new Element('HTML'),
    head: { appendChild(element) { return element; } },
    createElement: name => new Element(name.toUpperCase()),
    querySelector: selector => selector === 'dialog[open]' && document.openDialog ? new Element('DIALOG') : null,
    querySelectorAll: selector => ({ '[data-hero-reveal]': [hero], '[data-reveal]': [reveal], '[data-hero-image]': [image] }[selector] || []),
  };
  const window = {
    ...emitter(), innerWidth: width, innerHeight: 844, scrollY: 2600,
    matchMedia: query => { assert.ok(media.has(query), `Unexpected media query ${query}`); return media.get(query); },
    scrollTo(x, y) {
      const top = typeof x === 'object' ? x.top : y;
      calls.scroll.push(top);
      this.scrollY = top;
    },
  };
  const ScrollTrigger = {
    refresh() {
      calls.refresh++;
      const saved = window.scrollY;
      window.scrollTo(0, 0);
      window.scrollTo(0, saved);
    },
    enable() { calls.enable++; },
    disable() { calls.disable++; },
    update() {}, config() {},
  };
  const tween = () => ({ progress() { return this; }, kill() {} });
  const gsap = {
    registerPlugin() {},
    context(callback) { callback(); return { add(fn) { fn(); }, revert() { calls.reverts++; } }; },
    fromTo(targets, from, to) {
      if (Array.isArray(targets) && targets.includes(hero)) calls.intro++;
      if (to.scrollTrigger) calls.triggers++;
      return tween();
    },
    to(target, options) { if (options.scrollTrigger) calls.triggers++; return tween(); },
    set() {},
    ticker: { add(fn) { ticker.add(fn); }, remove(fn) { ticker.delete(fn); }, lagSmoothing() {} },
  };
  class Lenis {
    constructor(options) { this.options = options; this.isStopped = false; this.destroyed = false; this.resizes = 0; this.unsubscribed = 0; lenisInstances.push(this); }
    on() { return () => { this.unsubscribed++; }; }
    raf() {}
    resize() { this.resizes++; }
    start() { this.isStopped = false; }
    stop() { this.isStopped = true; }
    destroy() { this.destroyed = true; }
  }
  class MutationObserver {
    constructor(callback) { this.callback = callback; this.connected = false; observers.push(this); }
    observe() { this.connected = true; }
    disconnect() { this.connected = false; }
  }
  Object.assign(window, { gsap, ScrollTrigger, Lenis });
  const context = {
    window, document, Element, HTMLImageElement, MutationObserver,
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  function flush() {
    let turns = 0;
    while (microtasks.length || timers.size) {
      assert.ok(++turns < 30, 'Motion controller must not create a refresh loop');
      for (const callback of microtasks.splice(0)) callback();
      const callbacks = [...timers.values()]; timers.clear();
      for (const callback of callbacks) callback();
    }
  }
  function changeMedia(query, matches) {
    const item = media.get(query);
    item.matches = matches;
    item.dispatch('change', { matches });
  }
  function mutation(records) {
    for (const observer of observers) if (observer.connected) observer.callback(records);
  }
  function resizeHeight(height) { window.innerHeight = height; window.dispatch('resize'); flush(); }
  function layoutEvents() {
    resizeHeight(760); resizeHeight(844);
    document.dispatch('load', { target: image }); flush();
    window.dispatch('load'); flush();
    fonts.dispatch('loadingdone'); flush();
    document.openDialog = true;
    mutation([{ type: 'attributes', target: new Element('DIALOG') }]); flush();
    document.openDialog = false;
    mutation([{ type: 'attributes', target: new Element('DIALOG') }]); flush();
    mutation([{ type: 'childList', target: { id: 'products-grid' } }]); flush();
    document.hidden = true; document.dispatch('visibilitychange'); flush();
    document.hidden = false; document.dispatch('visibilitychange'); flush();
    window.CAFE_EDITORIAL_MOTION.refresh(); flush();
  }
  vm.runInNewContext(source, context, { filename: 'editorial-motion.js' });
  assert.ok(window.CAFE_EDITORIAL_MOTION, 'Real controller must initialize its public API');
  flush();
  return { window, document, fonts, calls, lenisInstances, ticker, media, flush, changeMedia, layoutEvents, resizeHeight };
}

for (const options of [
  { width: 390, coarse: true, label: 'touch phone' },
  { width: 390, coarse: false, label: 'narrow fine-pointer preview' },
  { width: 1200, coarse: true, label: 'large touch screen' },
]) {
  const env = environment(options);
  assert.equal(env.calls.intro, 0, `${options.label}: native hero stays static while the user starts scrolling`);
  assert.equal(env.calls.reverts, 0, `${options.label}: no hidden initialization failure`);
  assert.equal(env.calls.disable, 1, `${options.label}: disable ScrollTrigger's own global refresh listeners`);
  assert.equal(env.document.documentElement.dataset.scrollMode, 'native');
  assert.equal(env.calls.refresh, 0, `${options.label}: no startup refresh writes`);
  assert.equal(env.calls.triggers, 0, `${options.label}: no scroll-triggered decoration`);
  assert.equal(env.lenisInstances.length, 0, `${options.label}: native scroll has no Lenis instance`);
  env.layoutEvents();
  assert.equal(env.calls.refresh, 0, `${options.label}: browser chrome, fonts, images and dialogs cannot refresh scrolling`);
  assert.deepEqual(env.calls.scroll, [], `${options.label}: no programmatic vertical scroll writes`);
  assert.equal(env.window.scrollY, 2600, `${options.label}: user's position survives layout events`);
  env.window.CAFE_EDITORIAL_MOTION.destroy();
  console.log(`PASS: ${options.label} preserves native scrolling through height resize, image/font loading, dialogs and visibility`);
}

{
  const env = environment({ width: 1200, coarse: false });
  assert.equal(env.calls.reverts, 0, 'Desktop runtime initialized without a swallowed mock error');
  assert.equal(env.document.documentElement.dataset.scrollMode, 'enhanced');
  assert.ok(env.calls.intro > 0, 'Fine-pointer desktop retains its hero intro');
  assert.ok(env.calls.triggers > 0, 'Fine-pointer desktop retains scroll-triggered decoration');
  assert.equal(env.lenisInstances.length, 1);
  assert.equal(env.ticker.size, 1);
  const before = env.calls.refresh;
  env.resizeHeight(760);
  assert.equal(env.calls.refresh, before + 1, 'Desktop layout changes still refresh measurements');
  env.layoutEvents();
  assert.ok(env.calls.refresh > before + 1);
  assert.ok(env.lenisInstances[0].resizes > 0);
  assert.equal(env.ticker.size, 1, 'Dialog and visibility pause/resume leave exactly one ticker');
  env.window.CAFE_EDITORIAL_MOTION.destroy();
  assert.equal(env.ticker.size, 0);
  assert.equal(env.lenisInstances[0].destroyed, true);
  console.log('PASS: fine-pointer desktop keeps ScrollTrigger, Lenis refresh and pause/resume behavior');
}

{
  const env = environment({ width: 1200, coarse: false });
  const firstLenis = env.lenisInstances[0];
  // Queue a refresh before crossing the breakpoint: cleanup must cancel it.
  env.window.dispatch('resize');
  env.window.innerWidth = 390;
  env.changeMedia('(min-width: 901px)', false);
  const nativeRefreshes = env.calls.refresh;
  env.flush(); env.layoutEvents();
  assert.equal(env.document.documentElement.dataset.scrollMode, 'native');
  assert.equal(env.calls.refresh, nativeRefreshes, 'Desktop-to-mobile transition cancels queued desktop refresh');
  assert.equal(firstLenis.destroyed, true);
  assert.equal(firstLenis.unsubscribed, 1);
  assert.equal(env.ticker.size, 0);
  assert.equal(env.window.listenerCount('resize'), 0, 'Native runtime has no scroll refresh resize listener');

  env.window.innerWidth = 1200;
  env.changeMedia('(min-width: 901px)', true); env.flush();
  assert.equal(env.lenisInstances.length, 2);
  assert.equal(env.ticker.size, 1);
  assert.equal(env.window.listenerCount('resize'), 1, 'Desktop reentry adds one resize listener');
  assert.equal(env.document.fonts.listenerCount('loadingdone'), 1);

  env.changeMedia('(pointer: coarse)', true); env.flush();
  const touchRefreshes = env.calls.refresh;
  env.layoutEvents();
  assert.equal(env.calls.refresh, touchRefreshes, 'Changing to touch input removes scroll refresh behavior');
  assert.equal(env.lenisInstances[1].destroyed, true);
  assert.equal(env.ticker.size, 0);

  env.changeMedia('(prefers-reduced-motion: reduce)', true); env.flush();
  env.window.CAFE_EDITORIAL_MOTION.destroy();
  for (const item of env.media.values()) assert.equal(item.listenerCount('change'), 0);
  assert.equal(env.window.listenerCount('pagehide'), 0);
  assert.equal(env.window.listenerCount('pageshow'), 0);
  assert.equal(env.document.listenerCount('focusin'), 0);
  assert.equal(env.document.listenerCount('load'), 0);
  assert.equal(env.fonts.listenerCount('loadingdone'), 0);
  console.log('PASS: breakpoint/input transitions cancel timers, destroy old Lenis and remove listeners without duplicate tickers');
}
