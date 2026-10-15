import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

// Exercise the shipped controller against browser-bar, keyboard and rotation
// events. Style writes and layout reads are observable: a height-only event
// must leave both the visible hero geometry and its composition untouched.
const source = fs.readFileSync(path.resolve(import.meta.dirname, '../dist/mobile-hero.js'), 'utf8');

function emitter() {
  const listeners = new Map();
  return {
    addEventListener(type, callback) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(callback);
    },
    dispatch(type) { for (const callback of [...(listeners.get(type) || [])]) callback({ type }); },
  };
}

function environment({ width = 390, height = 660 } = {}) {
  const headerHeight = 72, navHeight = 74;
  const css = new Map(), timers = new Map();
  const calls = { geometry: 0, styles: 0, modes: 0, scroll: 0, layoutEvents: 0 };
  let nextTimer = 0;
  const mobile = { ...emitter(), matches: width <= 600 };
  const window = {
    ...emitter(), innerWidth: width, innerHeight: height, scrollY: 400,
    matchMedia(query) { assert.equal(query, '(max-width: 600px)'); return mobile; },
    scrollTo() { calls.scroll++; throw new Error('Hero sizing must never write the scroll position'); },
  };
  const hero = {
    dataset: new Proxy({}, {
      set(target, key, value) { calls.modes++; target[key] = value; return true; },
      deleteProperty(target, key) { calls.modes++; delete target[key]; return true; },
    }),
    style: {
      setProperty(key, value) { calls.styles++; css.set(key, value); },
      removeProperty(key) { calls.styles++; css.delete(key); },
    },
    getBoundingClientRect() {
      calls.geometry++;
      return { height: css.has('--mobile-hero-height') ? Number.parseFloat(css.get('--mobile-hero-height')) : window.innerHeight - headerHeight - navHeight };
    },
  };
  const header = { getBoundingClientRect: () => ({ height: headerHeight }) };
  const nav = {};
  class CustomEvent { constructor(type) { this.type = type; } }
  const document = {
    querySelector: selector => ({ '.table-hero': hero, '.site-header': header, '.mobile-app-nav': nav }[selector] || null),
    dispatchEvent(event) { assert.equal(event.type, 'cafe:hero-layout'); calls.layoutEvents++; return true; },
  };
  vm.runInNewContext(source, {
    window, document, CustomEvent,
    getComputedStyle(element) { assert.equal(element, nav); return { height: `${navHeight}px` }; },
    setTimeout(callback, delay) { const id = ++nextTimer; timers.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  }, { filename: 'mobile-hero.js' });

  function viewport(nextWidth, nextHeight) {
    window.innerWidth = nextWidth;
    window.innerHeight = nextHeight;
    const changed = mobile.matches !== (nextWidth <= 600);
    mobile.matches = nextWidth <= 600;
    if (changed) mobile.dispatch('change');
    window.dispatch('resize');
  }
  function flush() {
    const queued = [...timers.values()];
    timers.clear();
    for (const timer of queued) timer.callback();
  }
  return { window, hero, css, timers, calls, viewport, flush };
}

{
  const env = environment();
  assert.equal(env.css.get('--mobile-hero-height'), '514px');
  assert.equal(env.hero.dataset.heroSize, 'compact');
  assert.equal(env.calls.layoutEvents, 1, 'Initial mobile geometry notifies the menu measurements');
  const before = { ...env.calls };
  // Collapsing the browser toolbar crosses the old 690px media breakpoint.
  // Opening/closing the keyboard must also leave the hero undisturbed.
  for (const height of [740, 350, 660, 844]) {
    env.viewport(390, height);
    env.window.dispatch('pageshow');
    env.flush();
    assert.equal(env.css.get('--mobile-hero-height'), '514px');
    assert.equal(env.hero.dataset.heroSize, 'compact');
    assert.equal(env.timers.size, 0);
    assert.deepEqual(env.calls, before, 'Height-only changes must not read layout, write styles or change composition');
    assert.equal(env.calls.layoutEvents, 1, 'Toolbar and keyboard changes do not notify a hero layout change');
    assert.equal(env.window.scrollY, 400);
  }
  console.log('PASS: browser toolbar and keyboard height changes preserve hero geometry, composition and scroll position');
}

{
  const env = environment();
  const before = { ...env.calls };
  env.viewport(400, 740);
  env.viewport(430, 844);
  assert.equal(env.css.get('--mobile-hero-height'), '514px', 'Rotation waits for its settled dimensions');
  assert.deepEqual(env.calls, before);
  assert.equal(env.timers.size, 1, 'Successive width changes share one pending measurement');
  assert.equal([...env.timers.values()][0].delay, 160);
  env.flush();
  assert.equal(env.css.get('--mobile-hero-height'), '698px');
  assert.equal(env.hero.dataset.heroSize, 'regular');
  assert.equal(env.calls.geometry, before.geometry + 1, 'The settled width is measured once');
  assert.equal(env.calls.layoutEvents, before.layoutEvents + 1, 'A settled width change notifies the menu once');

  env.viewport(568, 375); env.flush();
  assert.equal(env.css.get('--mobile-hero-height'), '229px');
  assert.equal(env.hero.dataset.heroSize, 'short', 'Landscape recomputes the compact composition');
  assert.equal(env.calls.layoutEvents, before.layoutEvents + 2);
  env.viewport(390, 660); env.flush();
  assert.equal(env.css.get('--mobile-hero-height'), '514px');
  assert.equal(env.hero.dataset.heroSize, 'compact', 'Portrait rotation restores the appropriate composition');
  assert.equal(env.calls.layoutEvents, before.layoutEvents + 3);
  assert.equal(env.calls.scroll, 0);
  console.log('PASS: width changes and rotation debounce to the final dimensions and recompute the correct hero size');
}

{
  const env = environment();
  env.viewport(430, 844);
  assert.equal(env.timers.size, 1);
  env.viewport(1024, 768);
  assert.equal(env.timers.size, 0, 'Desktop transition cancels the queued mobile measurement');
  assert.equal(env.css.has('--mobile-hero-height'), false);
  assert.equal(Object.hasOwn(env.hero.dataset, 'heroSize'), false);
  assert.equal(env.calls.layoutEvents, 2, 'Clearing the mobile geometry emits one layout notification');
  env.flush();
  assert.equal(env.css.has('--mobile-hero-height'), false);
  const desktopCalls = { ...env.calls };
  env.viewport(1200, 900); env.window.dispatch('pageshow'); env.flush();
  assert.deepEqual(env.calls, desktopCalls, 'Further desktop events leave an already cleared mobile geometry untouched');
  env.viewport(390, 844); env.flush();
  assert.equal(env.css.get('--mobile-hero-height'), '698px', 'Returning to mobile establishes fresh geometry');
  assert.equal(env.hero.dataset.heroSize, 'regular');
  assert.equal(env.calls.layoutEvents, 3, 'Mobile reentry notifies fresh geometry');
  console.log('PASS: desktop transition removes the mobile lock and mobile reentry measures fresh geometry');
}

{
  const env = environment();
  env.viewport(430, 844);
  const before = { ...env.calls };
  assert.equal(env.timers.size, 1);
  env.window.dispatch('pagehide');
  assert.equal(env.timers.size, 0, 'Leaving the page cancels a queued rotation measurement');
  env.flush();
  assert.deepEqual(env.calls, before, 'A hidden page does not receive the cancelled style write');
  env.window.dispatch('pageshow'); env.flush();
  assert.equal(env.css.get('--mobile-hero-height'), '698px');
  assert.equal(env.hero.dataset.heroSize, 'regular');
  assert.equal(env.calls.layoutEvents, before.layoutEvents + 1, 'Only the restored width measurement emits a layout event');
  console.log('PASS: pagehide cancels queued measurements and pageshow rechecks a changed width');
}
