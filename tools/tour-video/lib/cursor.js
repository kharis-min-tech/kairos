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
 */
(() => {
  if (window.__kairosCursor) return;

  const dot = document.createElement('div');
  dot.id = 'kairos-tour-cursor';
  Object.assign(dot.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '22px',
    height: '22px',
    marginLeft: '-3px',
    marginTop: '-3px',
    borderRadius: '50% 50% 50% 2px',
    background: 'rgba(255,255,255,0.96)',
    border: '2px solid rgba(59,7,100,0.85)',
    boxShadow: '0 3px 14px rgba(0,0,0,0.45)',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transition: 'transform 90ms ease-out',
    willChange: 'left, top',
  });

  const ring = document.createElement('div');
  Object.assign(ring.style, {
    position: 'fixed',
    width: '42px',
    height: '42px',
    marginLeft: '-21px',
    marginTop: '-21px',
    borderRadius: '50%',
    border: '2px solid #f8b537',
    opacity: '0',
    zIndex: '2147483646',
    pointerEvents: 'none',
    transition: 'opacity 140ms ease-out, transform 240ms ease-out',
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
        dot.style.transform = 'scale(0.78)';
        ring.style.opacity = '1';
        ring.style.transform = 'scale(0.4)';
        requestAnimationFrame(() => {
          ring.style.transform = 'scale(1.25)';
          ring.style.opacity = '0';
        });
        setTimeout(() => {
          dot.style.transform = 'scale(1)';
          resolve();
        }, 180);
      });
    },
    hide() {
      dot.style.display = 'none';
      ring.style.display = 'none';
    },
  };
})();
