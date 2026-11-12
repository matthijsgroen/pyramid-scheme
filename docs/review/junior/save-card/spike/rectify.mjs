import sharp from "sharp";
import { jsQR, QUIET, layout as layoutOf } from "./lib.mjs";

export async function gray(img) {
  const { data, info } = await sharp(img).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { g: data, w: info.width, h: info.height };
}

/**
 * Reader R: the card is its own reference frame. Module centres are known fractions of the card
 * (layout in modules), so sample each module centre (bilinear), threshold at the cell's mean,
 * redraw a clean 4 px/module code and hand that to jsQR (which then only has to decode).
 * `bbox` = where the card sits in the image (default: the whole image).
 */
/**
 * Cheap check that a candidate (layout, size) is right: row 6 and column 6 between the finders
 * are the timing pattern, strictly alternating dark/light. Only the true module grid gives that.
 */
export function timingScore({ g, w, h }, L, size, bbox) {
  const sx = bbox.w / L.W, sy = bbox.h / L.H, c = L.cells[0];
  const at = (x, y) => g[Math.min(h - 1, Math.round(bbox.y + (c.y + QUIET + y + 0.5) * sy - 0.5)) * w + Math.min(w - 1, Math.round(bbox.x + (c.x + QUIET + x + 0.5) * sx - 0.5))];
  let sum = 0;
  for (let i = 8; i < size - 8; i++) sum += at(i, 6) + at(6, i);
  const thr = sum / (2 * (size - 16));
  let ok = 0, n = 0;
  for (let i = 8; i < size - 8; i++) {
    const want = i % 2 === 0; // even = dark
    ok += (at(i, 6) < thr) === want ? 1 : 0; ok += (at(6, i) < thr) === want ? 1 : 0; n += 2;
  }
  // top-right and bottom-left finder centres must be dark
  if (at(size - 4, 3) >= thr || at(3, size - 4) >= thr) return 0;
  return ok / n;
}

export function readRectifiedGray({ g, w, h }, L, size, bbox = { x: 0, y: 0, w, h }) {
  const sx = bbox.w / L.W, sy = bbox.h / L.H;
  const at = (x, y) => {
    const x0 = Math.max(0, Math.min(w - 2, Math.floor(x))), y0 = Math.max(0, Math.min(h - 2, Math.floor(y)));
    const fx = x - x0, fy = y - y0;
    return g[y0 * w + x0] * (1 - fx) * (1 - fy) + g[y0 * w + x0 + 1] * fx * (1 - fy)
      + g[(y0 + 1) * w + x0] * (1 - fx) * fy + g[(y0 + 1) * w + x0 + 1] * fx * fy;
  };
  const out = [];
  for (const c of L.cells) {
    const vals = new Float32Array(size * size);
    let sum = 0;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = bbox.x + (c.x + QUIET + x + 0.5) * sx - 0.5, py = bbox.y + (c.y + QUIET + y + 0.5) * sy - 0.5;
      const v = at(px, py);
      vals[y * size + x] = v; sum += v;
    }
    const thr = sum / vals.length;
    const P = 4, N = (size + 8) * P;
    const im = new Uint8ClampedArray(N * N * 4).fill(255);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (vals[y * size + x] < thr)
      for (let yy = 0; yy < P; yy++) for (let xx = 0; xx < P; xx++) {
        const o = (((y + 4) * P + yy) * N + (x + 4) * P + xx) * 4; im[o] = im[o + 1] = im[o + 2] = 0;
      }
    const r = jsQR(im, N, N, { inversionAttempts: "dontInvert" });
    out.push(r ? Buffer.from(r.binaryData) : null);
  }
  return out;
}

/**
 * Find the card in an image: the frame is a dark border. Scan from each edge inwards along the
 * middle rows/cols for the first dark run; good enough for an image that is the card plus bars
 * (screenshot letterbox), not for a photo.
 */
export function findFrame({ g, w, h }, dark = 90) {
  const rowDark = (y) => { let n = 0; for (let x = 0; x < w; x++) if (g[y * w + x] < dark) n++; return n / w; };
  const colDark = (x) => { let n = 0; for (let y = 0; y < h; y++) if (g[y * w + x] < dark) n++; return n / h; };
  let top = 0; while (top < h && rowDark(top) < 0.5) top++;
  let bot = h - 1; while (bot > top && rowDark(bot) < 0.5) bot--;
  let left = 0; while (left < w && colDark(left) < 0.5) left++;
  let right = w - 1; while (right > left && colDark(right) < 0.5) right--;
  return { x: left, y: top, w: right - left + 1, h: bot - top + 1 };
}

/**
 * Blind reader: the image alone. Try every card layout (n codes, QR size) whose aspect ratio
 * matches the frame; the first one whose first code decodes with a matching n wins. Layouts are
 * deterministic, so writer and reader share `layout()` and no geometry travels in the image.
 */
export function readBlind(gr, cardOpts, maxN = 9) {
  const bbox = findFrame(gr);
  const aspect = bbox.h / bbox.w;
  let tries = 0;
  for (let n = 1; n <= maxN; n++) for (let v = 1; v <= 40; v++) {
    const size = 17 + 4 * v;
    const L = layoutOf({ n, size }, cardOpts);
    if (Math.abs(L.H / L.W - aspect) > 0.01 * aspect) continue;
    if (timingScore(gr, L, size, bbox) < 0.85) continue;
    tries++;
    const got = readRectifiedGray(gr, { ...L, cells: L.cells.slice(0, 1) }, size, bbox);
    if (!got[0] || (got[0][3] & 15) !== n) continue;
    return { n, v, tries, chunks: readRectifiedGray(gr, L, size, bbox) };
  }
  return { tries, chunks: [] };
}
