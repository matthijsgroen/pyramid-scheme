#!/usr/bin/env node
/**
 * Turns a generated image into a tile the renderer can use.
 *
 *   yarn import-tile <file> --tier=starter --name=jarRack --slot=prop
 *
 * An image model gives you a big square with an opaque background; the map wants an exact size, alpha
 * where the background was, and a prop standing on the bottom edge of its frame. Every one of those is
 * mechanical, and doing it by hand 29 times per rank is how a set ends up inconsistent.
 *
 * Steps, in order: key the background colour out to alpha → (props) trim to the object and re-seat it on
 * the floor line → resize to the slot's exact size → write to src/assets/tiles/<tier>/<name>.png.
 *
 * Flags:
 *   --key=#ff00ff    background colour to make transparent (default magenta). --key=none to skip.
 *   --tolerance=60   how far from that colour still counts as background (0-441, default 60)
 *   --filter=nearest keep hard pixel edges. --filter=smooth for painted art (default: nearest)
 *   --repeat=1.4     fit the art N times across the slot instead of once, for a megatile whose subject
 *                    came back too big. Fractional is the point — a whole number makes the repeat
 *                    visible. Run `make-seamless` on the SOURCE first, or the grid shows its own seams.
 *   --headroom=0.25  squeeze the art into the LOWER part of the slot and leave the rest clear. On a FACE
 *                    the cap is painted the wall's own top colour, because a face IS the wall; on any
 *                    other slot it is left transparent, so the wall behind a hanging thing still shows.
 *                    (face) The
 *                    renderer draws the wall's top surface over the top of a face, so that much of the
 *                    art is never seen — and a frieze drawn to the top of the picture comes out with its
 *                    figures' heads cut off by it.
 *   --mask=render.png cut the art to another image's alpha. For the render-and-repaint pipeline: the
 *                    Blender render's alpha is the true silhouette, and a repaint that softened an edge
 *                    into the magenta leaves a keyed halo the despill cannot reach. Masking to the
 *                    render throws that away and guarantees the shape the geometry actually had.
 *   --seat-opacity=0.55  how solid that shadow is laid down. Below 1 the floor's own paving shows
 *                    through it, which is what a shadow does; at 1 the footprint replaces the floor.
 *   --seat=shadow.png put a rendered shadow back UNDER the art. Pair it with a --mask of the object
 *                    alone: a prop's shadow is geometry, and asked for a shadow the generator paints an
 *                    invented floor over the footprint instead, so the tile arrives with nothing below
 *                    35 and does not sit on anything. `render-prop --only=shadow` draws it in the same
 *                    frame as the object, which is what makes the two line up.
 *   --scale=0.45     how much of the SLOT the object fills, still standing on the floor line. Without it
 *                    a prop grows until it touches an edge, so a lamp and a sarcophagus arrive the same
 *                    height — a shabti, which is a 20cm figurine, landed 84 units tall.
 *   --saturation=1.3 push colour further from grey. A repaint of a render comes back COOLER than the
 *                    hand-painted set — +14 warmth where the painted props sit at +22 to +25 — because a
 *                    generator desaturates toward grey when copying rather than inventing.
 *   --brightness=0.8 scale everything darker (or lighter above 1). The failure an OBJECT actually has is
 *                    chalky highlights — a prop comes back lit for a gallery rather than for a cellar —
 *                    and no wording has reliably prevented it. Uses a brightness modulation rather than a
 *                    linear scale so the alpha channel, and with it the object's silhouette, is untouched.
 *   --gamma=0.65     lift a whole generation onto another one's exposure. A sheet drawn in a later session
 *                    comes back at a different overall level — the explorer's side row arrived at HALF the
 *                    luminance of the front and back drawn earlier, and it is not a uniform factor: the
 *                    shadows were out by 2.2x where the highlights were out by 1.5x, so --brightness blows
 *                    the highlights out before the midtones arrive. A power curve on the colour channels
 *                    fits the whole range at once. Below 1 lifts, above 1 darkens; alpha is untouched.
 *   --contrast=1.25  push values away from mid-grey before anything else — the inverse of --flatten, for
 *                    a roll whose carving is too shallow to read. 1 leaves it alone; below 1 is not
 *                    allowed, as it would eat an object's transparency.
 *   --flatten=0.5    blend toward the material the slot is made of — the rank's slab for a floor, its wall
 *                    for a face — so a surface sits behind the props. Toward the palette, not toward grey.
 *   --trim           trim the keyed background away and scale the object to fill the slot, keeping its
 *                    aspect. For a WALL item, whose frame IS its placement: a return with air round the
 *                    object leaves that air in the band and reads as a sticker stuck on the wall.
 *   --no-trim        keep the frame as generated instead of re-seating the object on the floor line.
 *                    On an arch it skips the trim that discards everything around the timber.
 *   --flip           mirror horizontally. The renderer mirrors EAST into west, so a side view drawn
 *                    facing left has to come in facing right
 */

import { mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"
import { ARCH_H, ARCH_W, CELL, WALL_H } from "../src/app/SiteMap/mapScale"
import { keyOut } from "./keyOut"
import { tierPalette } from "../src/app/SiteMap/tileMaterials"
import type { Difficulty } from "../src/data/difficultyLevels"
import { pathToFileURL } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, "..", "src", "assets", "tiles")

/**
 * How many STORED pixels a tile carries per map unit.
 *
 * The renderer draws every tile as `<image width={CELL}>` in SVG user units, so a tile's stored
 * resolution is independent of its layout: nothing about placement, seating or the wall band moves when
 * this changes. What it buys is real pixels for the browser to use when the map is zoomed in or the
 * display is retina, where a 1:1 tile has none and goes soft. `ART_IMAGE_RENDERING` is already `auto`
 * (smooth), which is what a painted set wants, so no filter has to change either.
 *
 * The masters are 1686x2528 and 2000x2000 — far above 2x — so this costs nothing in the art, only in
 * the bundle, and it is the FLOORS that dominate there: a floor is eight cells square where a prop is
 * one.
 *
 * The one gap: the merchant's `floor`, `wall-face` and `threshold` have no master at all
 * (art/README.md), so those three cannot be re-made at any resolution and stay at 1x. They are the
 * tiles least hurt by it — a floor is a repeating pattern seen mostly at 1:1 — but it is a real seam
 * until those masters are identified or re-rolled.
 */
const SPRITE_SCALE = Number(process.env.SPRITE_SCALE ?? 2)
/** Map units to stored pixels. Every slot dimension goes through this, or the slots desynchronise. */
const px = (units: number): number => Math.round(units * SPRITE_SCALE)

const TILE = px(CELL)
const MEGA = px(CELL * 8)

// The slots, in map units — the same numbers docs/game-design/tile-art-brief.md hands to the artist. A
// prop is a cell PLUS a face band tall, and bottom-anchored, which is why it is the only one that gets
// re-seated.
const SLOTS = {
  floor: { w: MEGA, h: MEGA, seat: false },
  face: { w: MEGA, h: TILE, seat: false },
  // A sill fills the gap between two rows: a cell wide, a wall band deep. It was 56x12 here and in the
  // brief, a size the renderer never draws — the art came back a twelfth of a cell tall and was stretched
  // to fill a band nearly three times that.
  sill: { w: TILE, h: px(WALL_H), seat: false },
  arch: { w: px(ARCH_W), h: px(ARCH_H), seat: false },
  prop: { w: TILE, h: TILE + px(WALL_H), seat: true },
  wall: { w: TILE, h: px(WALL_H), seat: false },
  // A sand DRIFT: square and several cells across, because it is not a cell-sized thing. It takes no
  // seat — a drift lies ON the floor rather than standing on it — and its shape comes from `--mask`
  // (yarn drift-mask) rather than from the art, which is a full-bleed texture with no shape at all.
  drift: { w: TILE * 3, h: TILE * 3, seat: false },
  // A CONDITION's sprite — the tuft in a joint and the plant in a chamber. Small and square, and it
  // takes no seat: `MapGrowth` anchors each one itself, the tuft biased up its cell toward the band it
  // is coming out of and the plant bottom-anchored like a prop. The sizes are the dummy generator's,
  // which are the sizes the renderer draws them at.
  growth: { w: px(22), h: px(22), seat: false },
  // The same condition coming THROUGH the wall band, and taller than it is wide because the renderer
  // stretches it with `preserveAspectRatio="none"` from the band's top edge to past its bottom. A root
  // that stops inside the band reads as a stain painted on the wall.
  growthWall: { w: px(22), h: px(34), seat: false },
  explorer: { w: px(40), h: px(70), seat: true },
} as const

type Slot = keyof typeof SLOTS

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

const hexToRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/**
 * Fits an archway to the slot's own geometry: jamb, opening, jamb at exactly `SIDE_W` : `CELL` : `SIDE_W`.
 *
 * An arch is drawn as an OBJECT — two posts and a beam, magenta outside it and magenta through it — not as
 * a piece of wall with a hole. Asked for a doorway in a wall, a model draws a generous stretch of wall
 * around it and the way through comes out a third of the width instead of two thirds. Asked for the
 * gateway alone, the only thing in the picture is the thing the slot wants.
 *
 * Two things then have to be true, and neither can be asked for:
 *
 * - The bounding box must be the TIMBER. A single stray off-background pixel at the canvas edge defeats a
 *   naive trim, which is exactly what happened: one pixel in the last column kept the full 2000-wide
 *   canvas, the frame was squashed into the left six sevenths of the slot, and the arch sat off-centre
 *   with the wall showing through where its right post should have been. So a row or column counts as
 *   content only when a real share of it is opaque.
 * - The posts must land in the CORNER slots either side of the doorway, because that is where a jamb
 *   belongs and what keeps the way through a full cell wide. A model puts them wherever it likes, so the
 *   three vertical bands are measured and rescaled to the widths the slot defines.
 */
const fitToDoorway = async (img: sharp.Sharp, w: number, h: number, smooth: boolean): Promise<sharp.Sharp> => {
  const kernel = smooth ? "lanczos3" : "nearest"
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const opaque = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3] >= 128

  /** The range of rows or columns carrying a real share of the drawing, not one stray pixel. */
  const span = (count: number, across: number, at: (i: number, j: number) => boolean) => {
    const floor = Math.max(2, Math.round(across * 0.01))
    const filled: boolean[] = []
    for (let i = 0; i < count; i++) {
      let n = 0
      for (let j = 0; j < across; j++) if (at(i, j)) n++
      filled.push(n >= floor)
    }
    return [filled.indexOf(true), filled.lastIndexOf(true)] as const
  }

  const [left, right] = span(info.width, info.height, (x, y) => opaque(x, y))
  const [top, bottom] = span(info.height, info.width, (y, x) => opaque(x, y))
  if (right < 0 || bottom < 0) throw new Error("nothing to import: the whole frame keyed out")

  // The opening, measured on a row below the beam where only the two posts are left — scanning OUTWARD
  // from the middle, because a beam overhangs its posts and a scan inward from the edge finds the gap
  // under that overhang instead of the doorway.
  const probe = Math.round(bottom - (bottom - top) * 0.15)
  const middle = Math.round((left + right) / 2)
  let openFrom = middle
  while (openFrom > left && !opaque(openFrom - 1, probe)) openFrom--
  let openTo = middle
  while (openTo < right && !opaque(openTo + 1, probe)) openTo++

  const band = async (from: number, to: number, width: number) =>
    await img
      .clone()
      .extract({ left: from, top, width: to - from + 1, height: bottom - top + 1 })
      .resize(width, h, { fit: "fill", kernel })
      .png()
      .toBuffer()

  // The POSTS, not "everything either side of the opening": a beam overhangs its posts, and carrying that
  // overhang into the corner slot leaves the post too narrow to fill it — so the wall shows through beside
  // the doorway. The overhang is discarded and the beam ends flush with the posts, which is what the slot
  // is: the doorway plus exactly one corner each side.
  let postFrom = openFrom - 1
  while (postFrom > left && opaque(postFrom - 1, probe)) postFrom--
  let postTo = openTo + 1
  while (postTo < right && opaque(postTo + 1, probe)) postTo++

  const jamb = (w - px(CELL)) / 2
  return sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([
    { input: await band(postFrom, openFrom - 1, jamb), left: 0, top: 0 },
    { input: await band(openFrom, openTo, px(CELL)), left: jamb, top: 0 },
    { input: await band(openTo + 1, postTo, jamb), left: w - jamb, top: 0 },
  ])
}

/**
 * Squeezes a face into the lower part of its slot, capping the space above it with the wall's own top
 * colour.
 *
 * The renderer paints the wall's top surface over the top of every face — a quarter of it — so a quarter
 * of the art is never seen. A wall of plain brick does not care. A wall with a PROCESSION on it does: the
 * nobleman's figures were drawn to the top of the picture and came out with their heads cut off by the
 * band. This gives the art the headroom the renderer takes.
 */
const withHeadroom = async (
  laid: Buffer,
  w: number,
  h: number,
  headroom: number,
  palette: { wallTop: string; wall: string } | undefined,
  /** A FACE is the wall, so its cap is the wall's own top surface, painted. Anything else HANGS on a
   * wall — a niche, a stela, a sconce — and its cap has to be transparent or the rank's brick stops
   * showing through above it: the merchant's niche filled the band to the pixel and read as a block
   * breaking the wall's top line rather than as a hole cut into it. */
  opaqueCap: boolean
): Promise<Buffer> => {
  const capH = Math.round(h * headroom)
  const [r, g, b] = hexToRgb(palette?.wallTop ?? "#000000")
  const squeezed = await sharp(laid)
    .resize(w, h - capH, { fit: "fill", kernel: "lanczos3" })
    .png()
    .toBuffer()
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: opaqueCap ? { r, g, b, alpha: 1 } : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: squeezed, left: 0, top: capH }])
    .png()
    .toBuffer()
}

/** Re-seats a trimmed object on the bottom edge of its slot's aspect: what makes a prop stand on the floor
 * line rather than float in the middle of its cell. The object keeps its own proportions. */
/**
 * Replaces the art's alpha with another image's.
 *
 * The render-and-repaint pipeline has one thing the generator can never give: a true silhouette, from
 * the mesh the geometry was built from. A repaint that feathered a shadow out into the magenta leaves a
 * violet halo once keyed — the despill pulls red and blue down toward green, which cannot rescue a soft
 * edge spread over a hundred pixels. Cutting to the render's own alpha removes it by construction, and
 * pins the shape against any drift the repaint introduced.
 */
/** Below this, an added pixel is the repaint's SHADOW and not part of the object — see `cutToMask`'s
 * growth. 70 of 255: the merchant's darkest prop measures 42 at its fifth percentile, so this sits above
 * the paint a prop is made of and below the #3a342c the prompts ask a shadow to be. */
const SHADOW_FLOOR = 70

/**
 * A mask grown by `radius`, admitting what the repaint ADDED but never what it added as shadow.
 *
 * Separable — a max filter along x, then along y. The obvious nested-disc version is O(w*h*r*r), and at
 * r=100 that is seven billion operations on a 448x672 frame; two passes are O(w*h*r) and finish
 * instantly. The kernel comes out square rather than round, which no eye can tell on a mask about to be
 * scaled to 112 wide.
 *
 * Returns RGBA where alpha is the mask, which is what `dest-in` wants.
 */
export const growMask = ({
  mask,
  maskChannels,
  art,
  artChannels,
  width,
  height,
  radius,
}: {
  mask: Buffer | Uint8Array
  maskChannels: number
  art: Buffer | Uint8Array
  artChannels: number
  width: number
  height: number
  radius: number
}): Buffer => {
  const inside = (i: number) => mask[i * maskChannels + maskChannels - 1] > 128
  const rowPass = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0
      for (let dx = -radius; dx <= radius; dx++) {
        const xx = x + dx
        if (xx >= 0 && xx < width && inside(y * width + xx)) {
          hit = 1
          break
        }
      }
      rowPass[y * width + x] = hit
    }
  }
  const near = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let hit = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy
        if (yy >= 0 && yy < height && rowPass[yy * width + x]) {
          hit = 1
          break
        }
      }
      near[y * width + x] = hit
    }
  }
  const out = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    let keep = inside(i)
    if (!keep && near[i]) {
      const a = art[i * artChannels + artChannels - 1]
      const lum = 0.299 * art[i * artChannels] + 0.587 * art[i * artChannels + 1] + 0.114 * art[i * artChannels + 2]
      keep = a > 128 && lum >= SHADOW_FLOOR
    }
    out[i * 4] = 255
    out[i * 4 + 1] = 255
    out[i * 4 + 2] = 255
    out[i * 4 + 3] = keep ? 255 : 0
  }
  return out
}

const cutToMask = async (img: sharp.Sharp, maskPath: string, grow = 0): Promise<sharp.Sharp> => {
  const art = await img.ensureAlpha().png().toBuffer({ resolveWithObject: true })
  const { width, height } = art.info
  // `dest-in` keeps the art only where the mask is opaque, which is the same idiom make-seamless uses.
  // `joinChannel` looks like the direct way to do it and does not work here: the joined band never
  // becomes alpha and every pixel comes out opaque.
  const base = sharp(maskPath).ensureAlpha().resize(width, height, { fit: "fill" })
  let maskBuf = await base.png().toBuffer()
  if (grow > 0) {
    // GROWN, for the repaint that drew the object FULLER than the model rather than merely different.
    //
    // The nobleman's palm capital is the case that wanted it. The model gives it five fronds; the
    // generator painted a rosette of fourteen, twice and unprompted, which is what a palm capital
    // actually looks like. Cut to the model, nine of them are thrown away and the tile is sparse. Keyed
    // instead of masked, they all survive — and so does the repaint's own opaque shadow, which is the
    // thing `--seat` exists to replace.
    //
    // AND THE GROWTH REFUSES SHADOW, which had to be measured rather than assumed: the first attempt
    // argued the painted shadow sat far enough below the column's foot to fall outside any dilation, and
    // rendered, 30 pixels of growth admitted its top edge as a hard dark ellipse round the base. So an
    // added pixel is kept only if the repaint painted it LIGHT. Inside the original mask nothing is
    // filtered, so an object's own dark parts are never at risk.
    //
    // Done in RAW PIXELS on purpose. The same rule written as sharp blends — negate, multiply, screen
    // over one-channel buffers — produced a mask identical to the ungrown one, and comparing renders was
    // the only way to notice. A loop over 448x672 costs nothing and can be asserted.
    const maskRaw = await base.raw().toBuffer({ resolveWithObject: true })
    const artRaw = await img.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = growMask({
      mask: maskRaw.data,
      maskChannels: maskRaw.info.channels,
      art: artRaw.data,
      artChannels: artRaw.info.channels,
      width,
      height,
      radius: Math.round(grow),
    })
    maskBuf = await sharp(out, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer()
  }
  // Rendered out before it goes back into the pipeline. sharp resizes BEFORE it composites, so a lazy
  // composite handed downstream is applied at the wrong size — the same trap make-seamless documents.
  const cut = await sharp(art.data)
    .composite([{ input: maskBuf, blend: "dest-in" }])
    .png()
    .toBuffer()
  return sharp(cut)
}

/**
 * Lays the rendered footprint under the art, TRANSLUCENT, so the floor is shaded rather than replaced.
 *
 * `make_shadow` paints an opaque patch — the rank's floor colour darkened — and opaque was right while
 * the shadow was being composited against the magenta backdrop, where any alpha came back magenta-tinted
 * and the keyer either ate it or fringed it. The seat render has no backdrop (`--background=none`), so
 * that reason is gone and the cost is left: an opaque patch throws the floor's own paving, joints and
 * grit away and drops a flat slab of dark in their place. On the merchant's near-black floor nobody saw
 * it; on the nobleman's, which is 62 luminance lighter, every prop sat in a hole.
 *
 * At `opacity` the tile darkens what is behind it instead: floor*(1-a) + shade*a, which keeps the
 * paving legible through the shadow and makes the seat's own colour a nudge rather than a claim.
 */
const underlayShadow = async (img: sharp.Sharp, shadowPath: string, opacity: number): Promise<sharp.Sharp> => {
  const art = await img.ensureAlpha().png().toBuffer({ resolveWithObject: true })
  const { width, height } = art.info
  // Rendered out first for the same reason cutToMask does it: sharp resizes before it composites.
  const fitted = await sharp(shadowPath).ensureAlpha().resize(width, height, { fit: "fill" }).png().toBuffer()
  const shadow = opacity >= 1 ? fitted : await fadeAlpha(fitted, opacity)
  const seated = await sharp(shadow)
    .composite([{ input: art.data }])
    .png()
    .toBuffer()
  return sharp(seated)
}

/** Scales an image's alpha channel, leaving its colours alone. */
const fadeAlpha = async (input: Buffer, factor: number): Promise<Buffer> => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  for (let i = info.channels - 1; i < data.length; i += info.channels) data[i] = Math.round(data[i] * factor)
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer()
}

/** A power curve on the colour channels, leaving alpha alone: `out = 255 * (in/255) ** exponent`. Below 1
 * lifts the shadows further than the highlights, which is the shape of an exposure difference between two
 * generation sessions — see `--gamma` above. */
const applyGamma = async (input: Buffer, exponent: number): Promise<Buffer> => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const curve = new Uint8Array(256)
  for (let v = 0; v < 256; v++) curve[v] = Math.round(255 * Math.pow(v / 255, exponent))
  for (let i = 0; i < data.length; i += info.channels) for (let c = 0; c < 3; c++) data[i + c] = curve[data[i + c]]
  return sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toBuffer()
}

const seatOnFloorLine = async (img: sharp.Sharp, aspect: number, scale: number): Promise<sharp.Sharp> => {
  // Encoded, not raw: `composite` needs an image it can parse, and a sharp instance built from a raw
  // buffer has no format of its own to fall back on.
  const trimmed = await img.trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true })
  const { width, height } = trimmed.info
  // A frame of the slot's shape, at least as big as the object, with the object centred on its bottom edge.
  // `scale` is how much of the slot the object may fill. At 1 it grows until it touches an edge, which
  // is why every prop otherwise arrives the same height whatever the real thing is.
  const frameH = Math.max(Math.round(height / scale), Math.round(width / aspect / scale))
  const frameW = Math.max(width, Math.round(frameH * aspect))
  // Rendered out before it goes back into the pipeline, because sharp resizes BEFORE it composites: left
  // lazy, the frame would be shrunk to the slot first and then asked to take a full-size object onto it.
  const seated = await sharp({
    create: { width: frameW, height: frameH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed.data, left: Math.round((frameW - width) / 2), top: frameH - height }])
    .png()
    .toBuffer()
  return sharp(seated)
}

const main = async (): Promise<void> => {
  const file = process.argv[2]
  const tier = arg("tier")
  const name = arg("name")
  const slot = arg("slot") as Slot | undefined
  if (!file || file.startsWith("--") || !tier || !name || !slot || !(slot in SLOTS)) {
    console.error(`usage: yarn import-tile <file> --tier=starter --name=jarRack --slot=${Object.keys(SLOTS).join("|")}`)
    process.exit(1)
  }
  const { w, h, seat } = SLOTS[slot]
  const key = arg("key", "#ff00ff")!
  const tolerance = Number(arg("tolerance", "60"))
  const smooth = arg("filter", "nearest") === "smooth"

  let img = sharp(file)
  if (process.argv.includes("--flip")) img = sharp(await img.flop().png().toBuffer())
  if (key !== "none") img = await keyOut(img, key, tolerance)
  // After the key: an arch is an object with magenta on both sides, so one pass finds its timber and
  // seats its posts in the corner slots. It is already at the slot size when it comes back.
  const archFitted = slot === "arch" && !process.argv.includes("--no-trim")
  if (archFitted) img = await fitToDoorway(img, w, h, smooth)
  const maskPath = arg("mask")
  if (maskPath) img = await cutToMask(img, maskPath, Number(arg("mask-grow", "0")))
  // After the mask, so the shadow is laid under the object's true silhouette and not under a repaint's
  // invented floor; before the seat, so the trim treats object and shadow as one sprite.
  const shadowPath = arg("seat")
  if (shadowPath) img = await underlayShadow(img, shadowPath, Number(arg("seat-opacity", "0.55")))
  if (seat && !process.argv.includes("--no-trim")) img = await seatOnFloorLine(img, w / h, Number(arg("scale", "1")))
  // `--trim` is the positive of `--no-trim`, for the slots that never trim at all.
  //
  // A prop's frame is thrown away and its object re-seated; a WALL item's frame IS its placement, so a
  // return that leaves air round the object leaves that air in the band, and the tile reads as a sticker
  // stuck on the wall rather than as something set into it. The nobleman's three stelae measure the
  // problem exactly: the two that read fill 96% and 97% of the frame's width, and the one that does not
  // fills 74%.
  //
  // The fix belongs here rather than in the prompt when the art is otherwise good — the prompt is fixed
  // too, but a re-roll is a paste and this is a flag. Aspect is preserved: the object is scaled until it
  // touches the band top and bottom and centred, so a shape narrower than the slot keeps air at its
  // SIDES, where air is harmless, instead of at its top and bottom, where it is the whole complaint.
  if (!seat && process.argv.includes("--trim")) {
    const trimmed = await img.trim({ threshold: 1 }).png().toBuffer()
    img = sharp(
      await sharp(trimmed)
        .resize(w, h, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()
    )
  }

  const dir = join(OUT_ROOT, tier)
  mkdirSync(dir, { recursive: true })
  const out = join(dir, `${name}.png`)
  const repeat = Number(arg("repeat", "1"))
  const tileW = Math.round(w / repeat)
  // A face repeats HORIZONTALLY only, the same axis `make-seamless --axis=x` works on: its bands are
  // registered top to bottom and stacking a second copy under them would draw two walls. It is also the
  // one slot whose art is not shown at the shape it is stored in — the renderer draws a 448x56 face into
  // a 448x28 band — so a face drawn at 8:1 arrives on screen at 16:1 and reads stretched. `--repeat=2`
  // on a face is the correction: half as wide per copy, which is the aspect it is SEEN at.
  const tileH = slot === "face" ? h : Math.round(h / repeat)
  const resized = await img
    // `fill`: the slot's size is not negotiable, and the prompts ask for the slot's aspect, so any
    // squashing here is the generation's own aspect being wrong — better visible than silently cropped.
    .resize(tileW, tileH, { fit: "fill", kernel: smooth ? "lanczos3" : "nearest" })
    .png()
    .toBuffer()

  // One tile, or a grid of a smaller copy. A generator draws a floor's subject at whatever scale it likes
  // and cannot be talked down reliably; shrinking and repeating is the one lever that needs no re-roll.
  //
  // `repeat` is fractional on purpose. A whole number is what makes a repeat VISIBLE — at 2 the megatile
  // is four identical quarters and the eye finds them at once. At 1.4 the copies run off the edge and are
  // cropped, so no two are the same, and because the source is already seamless (run `make-seamless` on
  // it first) the crop still tiles.
  const across = Math.ceil(w / tileW)
  const down = Math.ceil(h / tileH)
  const tiles =
    repeat === 1
      ? sharp(resized)
      : sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(
          Array.from({ length: across * down }, (_, i) => ({
            input: resized,
            left: (i % across) * tileW,
            top: Math.floor(i / across) * tileH,
          }))
        )

  // Blends the art toward the material it is supposed to BE: a flat wash of that colour, laid over at
  // `flatten` opacity. A generator overshoots contrast far more often than it undershoots, and a surface is
  // background — it has to sit behind the props and the explorer rather than compete. 0 leaves it alone.
  //
  // Toward the palette, not toward the image's own mean. Flattening toward a mean is flattening toward grey
  // and the hue goes with it (measured: -4 warmth at a strength that only halved the spread). Toward the
  // palette, calming down and staying in the palette are the same move.
  //
  // Which colour depends on the slot, and getting this wrong is worse than not flattening: the map's depth
  // comes from a wall face being DARKER than the floor in front of it, so a wall washed toward the floor's
  // slab colour is a wall that stops being a wall.
  const palette = tierPalette[tier as Difficulty]
  const flatten = Number(arg("flatten", "0"))
  const headroom = Number(arg("headroom", "0"))
  // Contrast first, so it acts on the ART: the headroom cap is a flat band of the wall's own top colour
  // and must stay exactly that, and the flatten wash is a correction in the other direction.
  const contrast = Number(arg("contrast", "1"))
  if (contrast < 1) throw new Error("--contrast below 1 would eat the alpha channel; use --flatten instead")
  const brightness = Number(arg("brightness", "1"))
  const saturation = Number(arg("saturation", "1"))
  const modulated =
    brightness === 1 && saturation === 1
      ? await tiles.png().toBuffer()
      : await sharp(await tiles.png().toBuffer())
          .modulate({ brightness, saturation })
          .png()
          .toBuffer()
  const gamma = Number(arg("gamma", "1"))
  const lit = gamma === 1 ? modulated : await applyGamma(modulated, gamma)
  const stretched =
    contrast === 1
      ? lit
      : await sharp(lit)
          .linear(contrast, 128 * (1 - contrast))
          .png()
          .toBuffer()
  const laid = headroom > 0 ? await withHeadroom(stretched, w, h, headroom, palette, slot === "face") : stretched
  const washColour = ["face", "wall", "arch"].includes(slot) ? palette?.wall : palette?.slab
  const [wr, wg, wb] = hexToRgb(washColour ?? "#000000")
  const wash = {
    input: {
      create: { width: w, height: h, channels: 4 as const, background: { r: wr, g: wg, b: wb, alpha: flatten } },
    },
  }
  await sharp(laid)
    // `atop` keeps the destination's alpha, so the wash lands on the art and NOT on the hole through it.
    // An arch is the first slot with real transparency, and a plain overlay filled its doorway with stone.
    .composite(flatten > 0 ? [{ ...wash, blend: "atop" as const }] : [])
    .png({ compressionLevel: 9 })
    .toFile(out)

  const meta = await sharp(out).metadata()
  console.log(`${out} — ${meta.width}x${meta.height}, ${slot} slot${key === "none" ? "" : `, keyed ${key}`}`)
}

// Only when RUN, not when imported. `growMask` has a spec beside this file, and importing the module to
// reach it used to execute the CLI — which exits 1 for want of arguments and reports as an unhandled
// rejection in the middle of a passing test run.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
