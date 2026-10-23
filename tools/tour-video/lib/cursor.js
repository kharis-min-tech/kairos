/**
 * A cursor the recording can see.
 *
 * Playwright's mouse is synthetic: it moves, elements react, and nothing is
 * drawn. A screen recording of it therefore shows menus opening and fields
 * filling with no visible cause, which reads as a glitch rather than as
 * somebody using the software.
 *
 * This injects a pointer into the page and animates it between targets. It
 * has to live inside the recorded page — an overlay drawn outside the browser
 * would not be in the capture.
 *
 * ## Why it is this big
 *
 * The first version was a 22-pixel dot. On a 1920-wide frame, scaled into the
 * handbook's content column, that is about nine pixels — small enough that
 * the clicks genuinely could not be seen, which is what it was there to show.
 * It is now a proper arrow at 36 pixels with a high-contrast outline, and the
 * composition zooms in on each click as well.
 */
(() => {
  if (window.__kairosCursor) return;

  const PURPLE = '#3b0764';
  const GOLD = '#f8b537';

  // A real pointer shape rather than a blob: a viewer reads the arrow as a
  // mouse immediately, and its tip marks the exact pixel being acted on.
  const arrow =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">' +
    `<path d="M4 2 L4 20 L9.2 15.2 L12.4 22.4 L15.8 20.8 L12.6 13.8 L19.5 13.4 Z" fill="#fff" stroke="${PURPLE}" stroke-width="1.4" stroke-linejoin="round"/>` +
    '</svg>';

  const dot = document.createElement('div');
  dot.id = 'kairos-tour-cursor';
  Object.assign(dot.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '36px',
    height: '36px',
    // The arrow's tip is at its top-left, so the box hangs off the point.
    marginLeft: '-2px',
    marginTop: '-2px',
    backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(arrow)}")`,
    backgroundRepeat: 'no-repeat',
    filter: 'drop-shadow(0 3px 7px rgba(0,0,0,0.55))',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transformOrigin: '2px 2px',
    transition: 'transform 90ms ease-out',
    willChange: 'left, top',
  });

  const ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'fixed',
    width: '64px',
    height: '64px',
    marginLeft: '-32px',
    marginTop: '-32px',
    borderRadius: '50%',
    border: `3px solid ${GOLD}`,
    boxShadow: `0 0 18px ${GOLD}`,
    opacity: '0',
    zIndex: '2147483646',
    pointerEvents: 'none',
    transition: 'opacity 150ms ease-out, transform 260ms ease-out',
  });

  document.documentElement.append(dot, ring);

  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  const place = () => {
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
  };
  place();

  window.__kairosCursor = {
    /** Glide to a point over `ms`, so the eye can follow it. */
    moveTo(tx, ty, ms = 420) {
      return new Promise((resolve) => {
        const fromX = x;
        const fromY = y;
        const start = performance.now();
        const step = (now) => {
          const t = Math.min(1, (now - start) / ms);
          // ease-in-out, so it sets off and arrives gently
          const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
          x = fromX + (tx - fromX) * e;
          y = fromY + (ty - fromY) * e;
          place();
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      });
    },
    /** A visible press: the pointer dips and a ring pulses out. */
    click() {
      return new Promise((resolve) => {
        dot.style.transform = 'scale(0.82)';
        ring.style.opacity = '1';
        ring.style.transform = 'scale(0.35)';
        requestAnimationFrame(() => {
          ring.style.transform = 'scale(1.35)';
          ring.style.opacity = '0';
        });
        setTimeout(() => {
          dot.style.transform = 'scale(1)';
          resolve();
        }, 190);
      });
    },
    hide() {
      dot.style.display = 'none';
      ring.style.display = 'none';
    },
  };
})();
