import QRCode from "qrcode";
import sharp from "sharp";
import { createRequire } from "node:module";
import crypto from "node:crypto";
const require = createRequire(import.meta.url);
const jsQRmod = require("jsqr-es6");
export const jsQR = jsQRmod.default ?? jsQRmod;

export const HDR = 4; // per code: 'P' | id(2) | (i<<4|n)
export const QUIET = 4;

const capCache = new Map();
export function capacity(version, ec) {
  const k = `${version}${ec}`;
  if (capCache.has(k)) return capCache.get(k);
  let lo = 1, hi = 3000;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    try {
      QRCode.create([{ data: Buffer.alloc(mid, 0xa5), mode: "byte" }], { version, errorCorrectionLevel: ec });
      lo = mid;
    } catch { hi = mid - 1; }
  }
  capCache.set(k, lo);
  return lo;
}

export function payload(size, seed = 1) {
  // compressed+encrypted bytes look random
  return crypto.createHash("sha512").update(String(seed)).digest().length && Buffer.from(
    Array.from({ length: size }, (_, i) => crypto.createHash("md5").update(`${seed}:${i}`).digest()[0]),
  );
}

/** Split payload into n codes at the smallest version that fits. */
export function plan(bytes, n, ec) {
  const per = Math.ceil(bytes.length / n);
  let version = 1;
  while (version <= 40 && (capacity(version, ec) < per + HDR || (version === 23 && ec === "L"))) version++; // jsqr-es6 cannot read v23-L
  if (version > 40) return null;
  const chunks = [];
  for (let i = 0; i < n; i++) {
    const body = bytes.subarray(i * per, (i + 1) * per);
    chunks.push(Buffer.concat([Buffer.from([0x50, 0x12, 0x34, (i << 4) | n]), body]));
  }
  const codes = chunks.map((c) => QRCode.create([{ data: c, mode: "byte" }], { version, errorCorrectionLevel: ec }));
  return { version, ec, n, chunks, codes, size: codes[0].modules.size };
}

export function gridFor(n) {
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  return { cols, rows };
}

/**
 * Card geometry in modules. Codes sit in a grid with a quiet-zone gap; a header band on top
 * and a footer band below (branding), and a dark frame border the codes are measured from.
 */
export function layout(p, { headerFrac = 0.16, footerFrac = 0.06, border = 6 } = {}) {
  const { cols, rows } = gridFor(p.n);
  const cell = p.size + 2 * QUIET; // each code with its own quiet zone
  const gridW = cols * cell, gridH = rows * cell;
  const innerW = gridW;
  const header = Math.round(innerW * headerFrac), footer = Math.round(innerW * footerFrac);
  const W = innerW + 2 * border, H = gridH + header + footer + 2 * border;
  const cells = [];
  for (let i = 0; i < p.n; i++) {
    const c = i % cols, r = Math.floor(i / cols);
    // centre the last row if short
    const inRow = r === rows - 1 ? p.n - cols * (rows - 1) : cols;
    const off = ((cols - inRow) * cell) / 2;
    cells.push({ x: border + off + c * cell, y: border + header + r * cell, w: cell, h: cell });
  }
  return { W, H, cells, cell, border, header, footer };
}

/** Plain (unbranded) card rendering for the sweep: sandstone background, dark frame, white code tiles. */
export async function renderPlain(p, L, mpx) {
  const W = L.W * mpx, H = L.H * mpx;
  const buf = Buffer.alloc(W * H * 3);
  const fill = (x0, y0, w, h, rgb) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const o = (y * W + x) * 3; buf[o] = rgb[0]; buf[o + 1] = rgb[1]; buf[o + 2] = rgb[2];
    }
  };
  fill(0, 0, W, H, [0x3a, 0x2e, 0x22]); // frame ink
  const b = L.border * mpx;
  fill(b, b, W - 2 * b, H - 2 * b, [0xe9, 0xdc, 0xbf]); // parchment
  // fake header texture: stripes
  for (let i = 0; i < 6; i++) fill(b + i * 40 * mpx, b + 4 * mpx, 20 * mpx, Math.max(1, L.header - 8) * mpx, [0xc2, 0x5e, 0x30]);
  p.codes.forEach((code, i) => {
    const c = L.cells[i];
    fill(c.x * mpx, c.y * mpx, c.w * mpx, c.h * mpx, [0xff, 0xf8, 0xea]);
    const s = code.modules.size, d = code.modules.data;
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if (d[y * s + x])
      fill((c.x + QUIET + x) * mpx, (c.y + QUIET + y) * mpx, mpx, mpx, [0x2b, 0x21, 0x18]);
  });
  return sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}

/** Simulate a chat app: downscale long side to `long`, JPEG at quality q (4:2:0). */
export async function chatify(png, long, q, kernel = "lanczos3") {
  const img = sharp(png);
  const m = await img.metadata();
  const scale = Math.min(1, long / Math.max(m.width, m.height));
  return sharp(png)
    .resize(Math.round(m.width * scale), Math.round(m.height * scale), { kernel })
    .flatten({ background: "#fff" })
    .jpeg({ quality: q, chromaSubsampling: "4:2:0", mozjpeg: false })
    .toBuffer();
}

async function rgba(img) {
  const { data, info } = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width: info.width, height: info.height };
}

/**
 * Reader A: fixed grid. Cell positions are fractions of the card, so the reader only needs the
 * card's outer size (frame = image bounds). Crop each cell with a margin, jsQR it.
 */
export async function readGrid(img, L, p, marginMods = 2) {
  const m = await sharp(img).metadata();
  const sx = m.width / L.W, sy = m.height / L.H;
  const got = [];
  for (const c of L.cells) {
    const mx = marginMods;
    const left = Math.max(0, Math.floor((c.x - mx) * sx)), top = Math.max(0, Math.floor((c.y - mx) * sy));
    const width = Math.min(m.width - left, Math.ceil((c.w + 2 * mx) * sx)), height = Math.min(m.height - top, Math.ceil((c.h + 2 * mx) * sy));
    const crop = await sharp(img).extract({ left, top, width, height }).toBuffer();
    const { data, width: w, height: h } = await rgba(crop);
    const r = jsQR(data, w, h, { inversionAttempts: "dontInvert" });
    got.push(r ? Buffer.from(r.binaryData) : null);
  }
  return got.filter((g, i) => g && g.equals(p.chunks[i])).length;
}

/** Reader B: jsQR on the whole image (finds at most one code). */
export async function readWhole(img, p) {
  const { data, width, height } = await rgba(img);
  const r = jsQR(data, width, height, { inversionAttempts: "dontInvert" });
  return r && p.chunks.some((c) => c.equals(Buffer.from(r.binaryData))) ? 1 : 0;
}

/** Reader C: zxing-wasm multi-symbol on the whole image. */
let zx;
export async function readZxing(img, p) {
  zx ??= await import("zxing-wasm/reader");
  const { data, width, height } = await rgba(img);
  const res = await zx.readBarcodes({ data, width, height, colorSpace: "srgb" }, { formats: ["QRCode"], maxNumberOfSymbols: 32, tryHarder: true });
  let ok = 0;
  for (const c of p.chunks) if (res.some((r) => r.bytes && Buffer.from(r.bytes).equals(c))) ok++;
  return ok;
}
