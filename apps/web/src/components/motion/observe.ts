/**
 * Shared plumbing for the Canvas motion layer.
 *
 * One IntersectionObserver serves every reveal on the page, and reduced-motion
 * is read in one place. Both are safe where the browser API is missing (SSR,
 * jsdom): in that case content is shown immediately rather than left hidden.
 */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

type Entry = { cb: () => void };

const watchers = new Map<Element, Entry>();
let shared: IntersectionObserver | null = null;

function observer(): IntersectionObserver | null {
  if (typeof IntersectionObserver === 'undefined') return null;
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const w = watchers.get(e.target);
          if (!w) continue;
          watchers.delete(e.target);
          shared?.unobserve(e.target);
          w.cb();
        }
      },
      { threshold: 0.18 },
    );
  }
  return shared;
}

/** Call `cb` once, the first time `el` is 18% in view. Returns a disposer. */
export function onceInView(el: Element, cb: () => void): () => void {
  const io = observer();
  if (!io) {
    cb();
    return () => {};
  }
  watchers.set(el, { cb });
  io.observe(el);
  return () => {
    watchers.delete(el);
    io.unobserve(el);
  };
}

/**
 * Sets `data-paused` on `el` while it is off-screen or the tab is hidden, so
 * the CSS can pause infinite animations. Returns a disposer.
 */
export function pauseWhenIdle(el: HTMLElement): () => void {
  let visible = true;
  let tabVisible = true;
  const apply = () => {
    el.dataset.paused = String(!(visible && tabVisible));
  };
  const onVis = () => {
    tabVisible = !document.hidden;
    apply();
  };
  let io: IntersectionObserver | null = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((es) => {
      visible = es[es.length - 1]?.isIntersecting ?? true;
      apply();
    });
    io.observe(el);
  }
  document.addEventListener('visibilitychange', onVis);
  return () => {
    io?.disconnect();
    document.removeEventListener('visibilitychange', onVis);
  };
}
