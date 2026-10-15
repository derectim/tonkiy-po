/*
 * Тонкий По — restrained editorial motion.
 * Local dependencies: GSAP / ScrollTrigger 3.15.0, Lenis 1.3.26.
 * Sources: https://gsap.com/docs/v3/Installation/
 *          https://github.com/darkroomengineering/lenis/tree/v1.3.26
 * Every element keeps its complete static layout if this file or a library fails.
 */
(() => {
  'use strict';

  if (window.CAFE_EDITORIAL_MOTION) return;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger || typeof window.matchMedia !== 'function') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const desktop = window.matchMedia('(min-width: 901px)');
  let runtime = null;
  let disposed = false;
  let suspended = false;
  let introPlayed = false;
  const revealedElements = new WeakSet();

  function destroyRuntime() {
    const current = runtime;
    if (!current) return;
    runtime = null;
    current.destroyed = true;
    clearTimeout(current.refreshTimer);
    current.observer?.disconnect();
    document.removeEventListener('visibilitychange', current.onVisibility);
    document.removeEventListener('focusin', current.onFocus);
    document.removeEventListener('load', current.onImageLoad, true);
    window.removeEventListener('resize', current.requestRefresh);
    window.removeEventListener('load', current.requestRefresh);
    document.fonts?.removeEventListener('loadingdone', current.requestRefresh);
    if (current.tickerAttached) gsap.ticker.remove(current.tick);
    if (typeof current.removeScrollListener === 'function') current.removeScrollListener();
    current.lenis?.destroy();
    current.context?.revert();
    current.style?.remove();
    if (current.changedLagSmoothing) gsap.ticker.lagSmoothing(500, 33);
  }

  function initialize() {
    destroyRuntime();
    if (disposed || suspended || reduceMotion.matches) return;

    const current = {
      destroyed: false, context: null, lenis: null, style: null, observer: null,
      tickerAttached: false, refreshTimer: 0, heroTween: null,
      revealTweens: new Map(), removeScrollListener: null, changedLagSmoothing: false,
    };
    runtime = current;
    const active = () => !current.destroyed && runtime === current;
    const hasOpenDialog = () => Boolean(document.querySelector('dialog[open]'));

    current.tick = (seconds) => {
      if (active() && !document.hidden && !hasOpenDialog()) current.lenis?.raf(seconds * 1000);
    };
    current.syncRunning = () => {
      if (!active() || !current.lenis) return;
      const shouldRun = !document.hidden && !hasOpenDialog();
      if (shouldRun) {
        if (current.lenis.isStopped) current.lenis.start();
        if (!current.tickerAttached) {
          gsap.ticker.add(current.tick);
          current.tickerAttached = true;
        }
      } else {
        if (!current.lenis.isStopped) current.lenis.stop();
        if (current.tickerAttached) {
          gsap.ticker.remove(current.tick);
          current.tickerAttached = false;
        }
      }
    };
    current.requestRefresh = () => {
      if (!active()) return;
      clearTimeout(current.refreshTimer);
      current.refreshTimer = setTimeout(() => {
        if (!active() || document.hidden) return;
        current.lenis?.resize();
        ScrollTrigger.refresh();
        current.syncRunning();
      }, 140);
    };
    current.onImageLoad = (event) => {
      if (event.target instanceof HTMLImageElement) current.requestRefresh();
    };
    current.onVisibility = () => {
      current.syncRunning();
      if (!document.hidden) current.requestRefresh();
    };
    current.onFocus = (event) => {
      // Keyboard users always receive a fully opaque focused control immediately.
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-hero-reveal]')) current.heroTween?.progress(1);
      for (const [element, tween] of current.revealTweens) {
        if (element.contains(target)) tween.progress(1);
      }
    };

    try {
      gsap.registerPlugin(ScrollTrigger);
      current.context = gsap.context(() => {}, document.body);
      current.context.add(() => {
        const heroTargets = [...document.querySelectorAll('[data-hero-reveal]')]
          .filter((element) => !element.parentElement?.closest('[data-hero-reveal]'));
        if (heroTargets.length && !introPlayed) {
          introPlayed = true;
          current.heroTween = gsap.fromTo(heroTargets, { opacity: 0.2, y: 24 }, {
            opacity: 1, y: 0, duration: 1.1, stagger: 0.11, ease: 'power3.out',
            clearProps: 'opacity,transform', overwrite: 'auto',
          });
        }

        const revealTargets = [...document.querySelectorAll('[data-reveal]')]
          .filter((element) => !element.closest('[data-hero-reveal]')
            && !element.parentElement?.closest('[data-reveal]') && !revealedElements.has(element));
        revealTargets.forEach((element) => {
          const tween = gsap.fromTo(element, { opacity: 0.2, y: 24 }, {
            opacity: 1, y: 0, duration: 0.95, ease: 'power3.out',
            clearProps: 'opacity,transform',
            onComplete: () => revealedElements.add(element),
            scrollTrigger: { trigger: element, start: 'top 88%', once: true },
          });
          current.revealTweens.set(element, tween);
        });

        if (desktop.matches && !coarsePointer.matches) {
          document.querySelectorAll('[data-hero-image]').forEach((image) => {
            // Put data-hero-reveal on the surrounding figure to avoid two y tweens.
            if (image.hasAttribute('data-hero-reveal')) return;
            gsap.to(image, {
              y: -45, ease: 'none',
              scrollTrigger: {
                trigger: image.closest('[data-hero]') || image.closest('section') || image,
                start: 'top top', end: 'bottom top', scrub: 1.1,
                invalidateOnRefresh: true,
              },
            });
          });
        }
      });

      if (desktop.matches && !coarsePointer.matches && typeof window.Lenis === 'function') {
        // Recommended Lenis foundation, added only while its instance is active.
        // No CSS selector hides or disables content while motion initializes.
        current.style = document.createElement('style');
        current.style.dataset.cafeMotion = 'lenis-foundation';
        current.style.textContent = `
          html.lenis, html.lenis body { height: auto; }
          html.lenis, html.lenis body { scroll-behavior: auto !important; }
          .lenis:not(.lenis-autoToggle).lenis-stopped { overflow: clip; }
          .lenis dialog { overscroll-behavior: contain; }
          .lenis [data-lenis-prevent], .lenis [data-lenis-prevent-wheel],
          .lenis [data-lenis-prevent-touch] { overscroll-behavior: contain; }
        `;
        document.head.appendChild(current.style);
        current.lenis = new window.Lenis({
          autoRaf: false, autoResize: true, smoothWheel: true, syncTouch: false,
          lerp: 0.08, wheelMultiplier: 0.9, anchors: true,
          prevent: (node) => Boolean(node instanceof Element && node.closest('dialog')),
        });
        current.removeScrollListener = current.lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.lagSmoothing(0);
        current.changedLagSmoothing = true;
      }

      current.observer = new MutationObserver((records) => {
        if (!active()) return;
        if (records.some((record) => record.type === 'attributes' && record.target.tagName === 'DIALOG')) {
          current.syncRunning();
          current.requestRefresh();
        }
        if (records.some((record) => record.type === 'childList' && record.target.id === 'products-grid')) {
          current.requestRefresh();
        }
      });
      current.observer.observe(document.body, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['open'],
      });
      document.addEventListener('visibilitychange', current.onVisibility);
      document.addEventListener('focusin', current.onFocus);
      document.addEventListener('load', current.onImageLoad, true);
      window.addEventListener('resize', current.requestRefresh, { passive: true });
      window.addEventListener('load', current.requestRefresh);
      document.fonts?.addEventListener('loadingdone', current.requestRefresh);
      document.fonts?.ready.then(() => { if (active()) current.requestRefresh(); });
      current.syncRunning();
      current.requestRefresh();
    } catch {
      // A decorative enhancement may fail; restore the complete static page.
      destroyRuntime();
    }
  }

  function onPageHide() {
    suspended = true;
    destroyRuntime();
  }
  function onPageShow(event) {
    if (!suspended && !event.persisted) return;
    suspended = false;
    initialize();
  }
  function destroy() {
    if (disposed) return;
    disposed = true;
    destroyRuntime();
    reduceMotion.removeEventListener('change', initialize);
    coarsePointer.removeEventListener('change', initialize);
    desktop.removeEventListener('change', initialize);
    window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow);
  }

  window.CAFE_EDITORIAL_MOTION = Object.freeze({
    destroy,
    refresh: () => runtime?.requestRefresh(),
  });
  reduceMotion.addEventListener('change', initialize);
  coarsePointer.addEventListener('change', initialize);
  desktop.addEventListener('change', initialize);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('pageshow', onPageShow);
  initialize();
})();
