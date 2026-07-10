/* Generates build/icon.png (512) and build/icon.ico (multi-size) with no image
 * dependencies: draws analytically anti-aliased shapes into an RGBA buffer and
 * encodes PNG by hand. Run: node scripts/make-icon.mjs
 *
 * The mark is the user's brand icon from design/logo/icon-book-dark-squircle.svg
 * (see design/logo/README.md): an ink squircle carrying a green open-book
 * glyph, reproduced here exactly so every size renders crisp. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const INK = [0x0b, 0x15, 0x12]; // near-black, green-tinted
const GREEN = [0x12, 0xb7, 0x6a]; // brand green

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Signed distance to a rounded square centred on the origin. */
function sdRoundRect(x, y, half, r) {
  const qx = Math.abs(x) - half + r;
  const qy = Math.abs(y) - half + r;
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Coverage from a signed distance, anti-aliased across one pixel. */
const cov = (d) => clamp01(0.5 - d);

/* ---- the glyph: the SVG's two stroked paths, flattened to polylines ----
 * Path 1: M50 36 C44 29 33 28 25 31 L25 62 C33 59 44 60 50 67
 *         C56 60 67 59 75 62 L75 31 C67 28 56 29 50 36
 * Path 2: M50 36 L50 67
 * Round caps and joins fall out of polyline distance for free. */

function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/** Flattens the book outline into one polyline in the SVG's 100-unit space. */
function glyphPolylines() {
  const STEPS = 48;
  const outline = [];
  const curveTo = (p0, p1, p2, p3) => {
    for (let i = 1; i <= STEPS; i++) outline.push(cubic(p0, p1, p2, p3, i / STEPS));
  };
  outline.push([50, 36]);
  curveTo([50, 36], [44, 29], [33, 28], [25, 31]);
  outline.push([25, 62]);
  curveTo([25, 62], [33, 59], [44, 60], [50, 67]);
  curveTo([50, 67], [56, 60], [67, 59], [75, 62]);
  outline.push([75, 31]);
  curveTo([75, 31], [67, 28], [56, 29], [50, 36]);
  const spine = [
    [50, 36],
    [50, 67],
  ];
  return [outline, spine];
}

/** Distance from a point to a polyline (min over its segments). */
function distToPolyline(px, py, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq ? clamp01(((px - x1) * dx + (py - y1) * dy) / lenSq) : 0;
    const ex = px - (x1 + t * dx);
    const ey = py - (y1 + t * dy);
    const d = ex * ex + ey * ey;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const half = size / 2;
  const radius = size * 0.24; // squircle rx: 24/100 of the icon, per the handoff
  const scale = size / 100;
  const strokeHalf = (6 / 2) * scale; // stroke-width 6 in the 100-unit viewBox

  const polys = glyphPolylines().map((pts) =>
    pts.map(([x, y]) => [x * scale, y * scale]),
  );
  // Glyph bounding box (plus stroke) to skip distance math on empty pixels.
  const margin = strokeHalf + 1.5;
  const minX = 25 * scale - margin;
  const maxX = 75 * scale + margin;
  const minY = 28 * scale - margin;
  const maxY = 67 * scale + margin;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = x + 0.5;
      const fy = y + 0.5;

      const bg = cov(sdRoundRect(fx - half, fy - half, half, radius));
      let glyph = 0;
      if (fx >= minX && fx <= maxX && fy >= minY && fy <= maxY) {
        for (const pts of polys) {
          glyph = Math.max(glyph, cov(distToPolyline(fx, fy, pts) - strokeHalf));
          if (glyph >= 1) break;
        }
      }

      // Green book stroked over the ink plate.
      const a = bg;
      const t = Math.min(glyph, bg);
      const r = INK[0] * (1 - t) + GREEN[0] * t;
      const g = INK[1] * (1 - t) + GREEN[1] * t;
      const b = INK[2] * (1 - t) + GREEN[2] * t;

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
