import { chromium } from 'playwright';
const b = await chromium.launch();
const pages = [
  ['/platform/departments', 'en'],
  ['/fr/platform/departments', 'fr'],
  ['/kri/platform/fellowships', 'kri'],
  ['/tw/getting-started/video-tour', 'tw'],
];
let bad = 0;
for (const [path, lang] of pages) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await ctx.newPage();
  const failed = [];
  p.on('response', (r) => {
    const u = r.url();
    if ((u.includes('/clips/') || u.includes('/screenshots/')) && r.status() >= 400) {
      failed.push(`${r.status()} ${u.split('/').slice(-2).join('/')}`);
    }
  });
  await p.goto('http://localhost:5199' + path, { waitUntil: 'networkidle' });
  const info = await p.evaluate(async () => {
    const v = document.querySelector('video');
    if (!v) return { video: null };
    const src = v.querySelector('source')?.getAttribute('src');
    await new Promise((r) => { v.readyState >= 1 ? r() : v.addEventListener('loadedmetadata', r, { once: true }); setTimeout(r, 6000); });
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
}
await b.close();
console.log(bad ? `\n${bad} page(s) with problems` : '\nall sampled pages load their clip and images');
process.exit(bad ? 1 : 0);
