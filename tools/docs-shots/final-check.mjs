import { chromium } from 'playwright';

// The port the built site is being served on. Hardcoding it meant the check
// failed with a navigation error the first time the preview moved ports,
// which reads like a broken site rather than a broken script.
const PORT = process.argv.includes('--port')
  ? process.argv[process.argv.indexOf('--port') + 1]
  : (process.env.DOCS_PORT ?? '5174');
const BASE = `http://localhost:${PORT}`;
const b = await chromium.launch();
const pages = [
  ['/platform/departments', 'en'],
  ['/fr/platform/departments', 'fr'],
  ['/kri/platform/fellowships', 'kri'],
  ['/tw/getting-started/video-tour', 'tw'],
];
let bad = 0;
for (const [path, lang] of pages) {
  try {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const failed = [];
  p.on('response', (r) => {
    const u = r.url();
    if ((u.includes('/clips/') || u.includes('/screenshots/')) && r.status() >= 400) {
      failed.push(`${r.status()} ${u.split('/').slice(-2).join('/')}`);
    }
  });
  // `networkidle` never settles once the page starts streaming a video, so
  // wait for the document and then give the assets a moment of their own.
  await p.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const info = await p.evaluate(async () => {
    const v = document.querySelector('video');
    if (!v) return { video: null };
    const src = v.querySelector('source')?.getAttribute('src');
    // Ask for the metadata rather than hoping it arrives: with preload
    //="metadata" and a 1.5MB file, six seconds of waiting reported NaN for a
    // clip that was perfectly fine.
    if (v.readyState < 1) {
      v.preload = 'metadata';
      v.load();
      await new Promise((r) => {
        v.addEventListener('loadedmetadata', r, { once: true });
        v.addEventListener('error', r, { once: true });
        setTimeout(r, 25000);
      });
    }
    const imgs = [...document.querySelectorAll('img')];
    return {
      video: src,
      duration: Number(v.duration?.toFixed(2)),
      images: imgs.length,
      brokenImages: imgs.filter((i) => i.complete && i.naturalWidth === 0).length,
    };
  });
  const ok = info.video && info.duration > 0 && !info.brokenImages && !failed.length;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${lang.padEnd(4)} ${path}`);
  console.log(`       clip ${info.video} (${info.duration}s), ${info.images} images, ${info.brokenImages} broken`);
  if (failed.length) console.log('       failed requests:', failed.slice(0, 4));
  await ctx.close();
  } catch (err) {
    bad++;
    console.log(`FAIL ${lang.padEnd(4)} ${path}`);
    console.log(`       ${String(err.message).split('\n')[0]}`);
  }
}
await b.close();
console.log(bad ? `\n${bad} page(s) with problems` : '\nall sampled pages load their clip and images');
process.exit(bad ? 1 : 0);
