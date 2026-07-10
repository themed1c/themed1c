/* Generates build/icon.png (512) and build/icon.ico (multi-size) with no image
 * dependencies: draws analytically anti-aliased shapes into an RGBA buffer and
 * encodes PNG by hand. Run: node scripts/make-icon.mjs */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Brighter, warmer orange than the original muted gold (#B07F2C).
const GOLD = [0xe0, 0x8a, 0x33];
const CREAM = [0xfd, 0xfc, 0xf9];

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Signed distance to a rounded square centred on the origin. */
function sdRoundRect(x, y, half, r) {
  return sdRoundRectWH(x, y, half, half, r);
}

/** Signed distance to a rounded rectangle with half-extents hx/hy. */
function sdRoundRectWH(x, y, hx, hy, r) {
  const qx = Math.abs(x) - hx + r;
  const qy = Math.abs(y) - hy + r;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Coverage from a signed distance, anti-aliased across one pixel. */
const cov = (d) => clamp01(0.5 - d);

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const half = size / 2;
  const radius = size * 0.22;

  const ringMid = size * 0.245;
  const ringHalf = size * 0.055;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5 - half;
      const cy = y + 0.5 - half;

      const bg = cov(sdRoundRect(cx, cy, half, radius));
      const ring = cov(Math.abs(Math.hypot(cx, cy) - ringMid) - ringHalf);

      // Cream ring composited over the gold plate.
      const a = bg;
      const t = Math.min(ring, bg);
      const r = GOLD[0] * (1 - t) + CREAM[0] * t;
      const g = GOLD[1] * (1 - t) + CREAM[1] * t;
      const b = GOLD[2] * (1 - t) + CREAM[2] * t;

      const i = (y * size + x) * 4;
      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
      px[i + 3] = Math.round(a * 255);
    }
  }
  return px;
}

/* ---- minimal PNG encoder ---- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePNG(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  // Each scanline is prefixed with filter type 0 (none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

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

const out = path.join(process.cwd(), 'build');
fs.mkdirSync(out, { recursive: true });

fs.writeFileSync(path.join(out, 'icon.png'), encodePNG(render(512), 512));

const sizes = [16, 24, 32, 48, 64, 128, 256];
fs.writeFileSync(
  path.join(out, 'icon.ico'),
  encodeICO(sizes.map((size) => ({ size, png: encodePNG(render(size), size) }))),
);

console.log('wrote build/icon.png and build/icon.ico');
