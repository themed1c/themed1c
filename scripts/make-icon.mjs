/* Renders build/icon.png (512), build/icon.ico (16-256), and build/icon-32.png
 * from the official life.org WORDMARK (design/logo/README.md, Turn 2 "2a"):
 * Outfit 700, lowercase, styled green period, white rounded canvas. Text
 * cannot be drawn dependency-free, so this rasterizes the real font in
 * headless Chromium and the outputs are COMMITTED; `npm run dist` does not
 * regenerate them.
 *
 * To regenerate: npm i --no-save playwright-core, have a Chromium binary
 * (CHROMIUM_PATH, default /opt/pw-browsers/chromium), then: npm run icon
 *
 * Per-size specs below are copied verbatim from the design ramp. The user
 * accepted that the mark is illegible below 48 px; do not swap in a glyph. */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const INK = '#0B1512';
const GREEN = '#12B76A';
const BORDER = '#e5eae7';

/** [canvas, font-size, letter-spacing(em), dot(em), dot-margin(em), radius] */
const RAMP = [
  [512, 133, -0.02, 0.18, 0.07, 12],
  [256, 66, -0.02, 0.18, 0.07, 10],
  [128, 33, -0.02, 0.18, 0.07, 8],
  [64, 16, -0.02, 0.18, 0.07, 6],
  [48, 12, -0.02, 0.18, 0.06, 5],
  [32, 8, -0.01, 0.2, 0.06, 4],
  [24, 6, -0.01, 0.22, 0.055, 3.5], // between the ramp's 32 and 16 stops
  [16, 4, 0, 0.25, 0.05, 3],
];

const fontB64 = fs
  .readFileSync(path.join(process.cwd(), 'src', 'assets', 'fonts', 'outfit-latin-700.woff2'))
  .toString('base64');

function tile([size, font, ls, dot, margin, radius]) {
  return `<div class="tile" data-size="${size}" style="width:${size}px;height:${size}px;border-radius:${radius}px;">
    <span class="mark" style="font-size:${font}px;letter-spacing:${ls}em;">life<span class="dot" style="width:${dot}em;height:${dot}em;margin:0 ${margin}em;"></span>org</span>
  </div>`;
}

const page = `<!DOCTYPE html><html><head><style>
  @font-face {
    font-family: 'Outfit';
    font-style: normal;
    font-weight: 700;
    src: url(data:font/woff2;base64,${fontB64}) format('woff2');
  }
  body { margin: 0; background: transparent; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
  .tile { box-sizing: border-box; background: #ffffff; border: 1px solid ${BORDER};
          display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .mark { display: inline-flex; align-items: baseline; font-family: 'Outfit', sans-serif;
          font-weight: 700; color: ${INK}; line-height: 1; }
  .dot { display: inline-block; border-radius: 999px; background: ${GREEN}; }
</style></head><body>${RAMP.map(tile).join('\n')}</body></html>`;

/* ---- ICO wrapping PNG entries (supported since Vista) ---- */
function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(entries.length, 4);

  const dir = Buffer.alloc(16 * entries.length);
  let offset = header.length + dir.length;
  entries.forEach((e, i) => {
    const o = i * 16;
    dir[o] = e.size >= 256 ? 0 : e.size;
    dir[o + 1] = e.size >= 256 ? 0 : e.size;
    dir[o + 2] = 0; // palette
    dir[o + 3] = 0;
    dir.writeUInt16LE(1, o + 4); // colour planes
    dir.writeUInt16LE(32, o + 6); // bits per pixel
    dir.writeUInt32LE(e.png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([header, dir, ...entries.map((e) => e.png)]);
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
});
const tab = await browser.newPage({ viewport: { width: 600, height: 1200 } });
await tab.setContent(page);
await tab.evaluate(() => document.fonts.ready);

const shots = {};
for (const [size] of RAMP) {
  const el = tab.locator(`.tile[data-size="${size}"]`);
  shots[size] = await el.screenshot({ omitBackground: true });
}
await browser.close();

const out = path.join(process.cwd(), 'build');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.png'), shots[512]);
fs.writeFileSync(path.join(out, 'icon-32.png'), shots[32]);
fs.writeFileSync(
  path.join(out, 'icon.ico'),
  encodeICO([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, png: shots[size] }))),
);

console.log('wrote build/icon.png, build/icon-32.png, and build/icon.ico');
