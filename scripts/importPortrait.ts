#!/usr/bin/env node
/**
 * Turns a generated character image into a conversation portrait.
 *
 *   yarn import-portrait <file> --name=explorer
 *
 * An image model hands back a big figure standing on plain white; `Fez.tsx` wants 250x375 with alpha
 * where the white was and the feet on the bottom edge, because it draws the sprite 200px wide with the
 * bottom 60px past the screen edge. Doing that by hand is how the eighth ghost ends up at a different
 * scale from the first.
 *
 * Steps, in order: key the background out to alpha -> trim to the figure -> pad back to 2:3 with the feet
 * on the bottom edge -> resize to 250x375 -> write to src/assets/<name>-250.png.
 *
 * Flags:
 *   --key=#ffffff    background colour to make transparent (default white)
 *   --tolerance=20   how far from that colour still counts as background (0-441, default 20)
 *   --bust=0.55      keep only the top fraction of the figure — the waist-up cut the conversation
 *                    sprites wear, so a human head reads at the same size as Fez's. Omit for a full
 *                    figure (the journey card, the title, anything not standing beside him).
 *   --centre=840     where to frame a bust horizontally, in source pixels. Defaults to the head; give
 *                    it only for a pose whose point is off to one side (the raised finger).
 *   --behind=0.4     widen a bust's frame by this fraction on its LEFT, the side behind a figure that
 *                    faces right — his rope, her raised hand. The 250 wide face frame stays the right
 *                    part of the sprite, so `Fez.tsx` can let the extra hang off a phone's edge and
 *                    show it on a wider screen. 0.4 makes a 350x375 sprite.
 *   --holes=x,y;x,y  points inside enclosed background — the gap under an arm, between a held map and
 *                    a hand, behind a neck. The flood cannot reach these from the edge and no rule can
 *                    tell them from an eye, so they are named. Every import prints what it left.
 *   --whole          frame the whole canvas instead of the figure — for masters painted in the frame
 *                    their sprite uses (Fez's). Every pose of the character then stacks on the next.
 *   --crop-from=a,b  frame through the window that holds the figures of ALL these masters, not this
 *                    one's: a character's pose bases share it, so their heads land on the same pixels.
 *   --face-of=base   write a FACE LAYER: this master is an expression edit of `base`; what moved is cut
 *                    out with a feathered mask (faceLayer.ts), the rest is transparent, and it is framed
 *                    exactly as the base is (pass the base's own framing flags). `Fez.tsx` stacks it on
 *                    the pose. Tuned with --threshold=64 --erode=4 --grow=45 --feather=18.
 *
 * The key is flood-filled inward from the edges rather than matched everywhere, which is the whole
 * difference between this and `import-tile`: a prop on magenta has no magenta of its own, but a person on
 * white has white in their eyes, and a plain threshold punches both of them out.
 */
import sharp from "sharp"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { hexToRgb } from "./keyOut"
import { boxOf, diffMask, faceRegion } from "./faceLayer"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_ROOT = join(__dirname, "..", "src", "assets")

/** What every companion sprite measures, `fez-250.png` included. */
const WIDTH = 250
const HEIGHT = 375

/** How much of the finished canvas the figure stands in, leaving the rest as air above its head. */
const FILL = 0.98

const arg = (name: string, fallback?: string): string | undefined =>
  process.argv.find(a => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback

/**
 * Which pixels are background: the key colour REACHED FROM THE EDGE, plus the key colour reached from
 * any `holes` the caller names.
 *
 * Exported for the spec — the case worth holding onto is a white pixel enclosed by the figure, which is
 * an eye, and which a threshold on colour alone turns into a hole.
 *
 * **An eye and a gap under an elbow cannot be told apart by machine**, which is why `holes` exists and
 * is not a heuristic. Measured on `explorer.jpeg`: the gap where the map folds over the hand is 1232
 * pixels and the near eye is 1072, so no size threshold separates them; their mean colours are
 * (252.8, 253.0, 253.2) and (252.1, 251.4, 250.1), so no colour threshold does either. The operator
 * says where the holes are and looks at what comes out; `enclosedRegions` is what tells them to.
 */
export const edgeBackground = ({
  data,
  width,
  height,
  channels,
  key,
  tolerance,
  holes = [],
}: {
  data: Uint8Array | Buffer
  width: number
  height: number
  channels: number
  key: { r: number; g: number; b: number }
  tolerance: number
  /** Points inside enclosed background, in source pixels — each floods like a corner does. */
  holes?: readonly (readonly [number, number])[]
}): Uint8Array => {
  const background = new Uint8Array(width * height)
  const isKey = (i: number) =>
    Math.hypot(data[i * channels] - key.r, data[i * channels + 1] - key.g, data[i * channels + 2] - key.b) <= tolerance
  const stack: number[] = []
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x)
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1)
  for (const [x, y] of holes) if (x >= 0 && x < width && y >= 0 && y < height) stack.push(y * width + x)
  while (stack.length > 0) {
    const i = stack.pop()!
    if (background[i] === 1 || !isKey(i)) continue
    background[i] = 1
    const x = i % width
    const y = (i - x) / width
    if (x > 0) stack.push(i - 1)
    if (x < width - 1) stack.push(i + 1)
    if (y > 0) stack.push(i - width)
    if (y < height - 1) stack.push(i + width)
  }
  return background
}

/**
 * Key-coloured patches the flood never reached, biggest first — the eyes, and the holes nobody named.
 *
 * Printed after every import because the failure it catches is SILENT: an unnamed gap under an arm
 * ships as an opaque white blob, and the portrait looks fine at 250px in a file browser and wrong the
 * moment it is drawn over a dark room. The operator reads the list, decides which are eyes, and passes
 * the rest as `--holes`.
 */
export const enclosedRegions = ({
  data,
  width,
  height,
  channels,
  key,
  tolerance,
  background,
}: {
  data: Uint8Array | Buffer
  width: number
  height: number
  channels: number
  key: { r: number; g: number; b: number }
  tolerance: number
  background: Uint8Array
}): { pixels: number; at: [number, number] }[] => {
  const isKey = (i: number) =>
    Math.hypot(data[i * channels] - key.r, data[i * channels + 1] - key.g, data[i * channels + 2] - key.b) <= tolerance
  const seen = new Uint8Array(width * height)
  const regions: { pixels: number; at: [number, number] }[] = []
  for (let start = 0; start < width * height; start++) {
    if (seen[start] === 1 || background[start] === 1 || !isKey(start)) continue
    const stack = [start]
    seen[start] = 1
    let pixels = 0
    let sumX = 0
    let sumY = 0
    while (stack.length > 0) {
      const i = stack.pop()!
      const x = i % width
      const y = (i - x) / width
      pixels++
      sumX += x
      sumY += y
      const push = (j: number) => {
        if (j < 0 || j >= width * height || seen[j] === 1 || background[j] === 1 || !isKey(j)) return
        seen[j] = 1
        stack.push(j)
      }
      if (x > 0) push(i - 1)
      if (x < width - 1) push(i + 1)
      push(i - width)
      push(i + width)
    }
    regions.push({ pixels, at: [Math.round(sumX / pixels), Math.round(sumY / pixels)] })
  }
  return regions.sort((a, b) => b.pixels - a.pixels)
}

/**
 * The 2:3 canvas a trimmed subject is padded back out to, and where it sits in it.
 *
 * Sized off whichever side runs out first: a standing person is tall and narrow, so height fills and width
 * gets the air, but a camp lying on the ground is wider than it is tall and would not fit that canvas at
 * all. Fitting it by width instead leaves the air ABOVE it — which is where the speech bubble is, and is
 * what a thing on the ground should look like beside a character who is standing up. Either way it sits on
 * the bottom edge, because that edge is the floor.
 */
export const seat = (figure: { width: number; height: number }) => {
  const byHeight = Math.round(figure.height / FILL)
  const wide = figure.width > Math.round((byHeight * WIDTH) / HEIGHT)
  const canvasWidth = wide ? Math.round(figure.width / FILL) : Math.round((byHeight * WIDTH) / HEIGHT)
  return { wide, canvasWidth, canvasHeight: wide ? Math.round((canvasWidth * HEIGHT) / WIDTH) : byHeight }
}

/**
 * The top `fraction` of a figure, with its own left and right — the waist-up cut.
 *
 * **Why these sprites are cut at all.** Fez is a cartoon lizard whose head is most of him; a human
 * drawn full-length in the same frame has a head a third the size, and the two of them talking read
 * as two scales rather than as two characters. Cropping the humans is what brings the faces level,
 * and it is a cut rather than a redraw because the expressive part is already in the file.
 *
 * **Waist-up rather than head-and-shoulders**, because the props do the characterising: Ipi is the
 * bookkeeper by way of the reed pen and tablet he is holding, Henut is mid-gesture, and the pointing
 * pose exists for a raised finger that a tighter cut removes. 0.55 brings the heads level and keeps
 * all of it; 0.38 overshoots Fez and throws the hands away.
 *
 * The band takes its OWN width, not the whole figure's: a standing figure is widest at the feet or
 * the stance, and keeping that width would seat the crop in a frame half full of air.
 */
export const topBand = (
  background: Uint8Array,
  width: number,
  figure: { left: number; right: number; top: number; bottom: number },
  fraction: number
) => {
  const bottom = Math.min(figure.bottom, figure.top + Math.round((figure.bottom - figure.top + 1) * fraction) - 1)
  let left = width
  let right = -1
  for (let y = figure.top; y <= bottom; y++)
    for (let x = 0; x < width; x++)
      if (background[y * width + x] === 0) {
        if (x < left) left = x
        if (x > right) right = x
      }
  return { left, right, top: figure.top, bottom }
}

/**
 * Where the head is: the middle of the figure's topmost slice.
 *
 * A bust is framed on the face, not on the bounding box. The explorer holds a map out at arm's
 * length, so his band is half again as wide as the ghosts' and its centre is somewhere over the
 * map — framing on that put his head off to one side and, worse, made `seat` fit the whole width
 * into the frame and shrink him below everybody else.
 */
export const headCentre = (
  background: Uint8Array,
  width: number,
  figure: { top: number; bottom: number },
  slice = 0.15
) => {
  const to = figure.top + Math.max(1, Math.round((figure.bottom - figure.top + 1) * slice))
  let left = width
  let right = -1
  for (let y = figure.top; y <= to; y++)
    for (let x = 0; x < width; x++)
      if (background[y * width + x] === 0) {
        if (x < left) left = x
        if (x > right) right = x
      }
  return Math.round((left + right) / 2)
}

/**
 * The 2:3 window a bust is cut from: tall enough for the band plus a little air, centred on the head.
 *
 * **Sized by height and allowed to lose the sides**, which is the opposite of what `seat` does for a
 * full figure. A bust's job is to put every face at the same size, and a band fitted by its width
 * scales by how far the arms happen to reach — so the one character holding something at arm's
 * length comes out smaller than everyone else. Clipping an outstretched map costs less than that.
 *
 * Returned in source pixels and allowed to fall outside the image; the caller clamps and pads,
 * because a head near an edge is a real case and a window that refuses to leave the canvas would
 * slide the face off centre instead.
 */
export const bustWindow = (band: { top: number; bottom: number }, centreX: number) => {
  const height = Math.round((band.bottom - band.top + 1) / FILL)
  const width = Math.round((height * WIDTH) / HEIGHT)
  return {
    left: centreX - Math.round(width / 2),
    top: band.bottom + 1 - height,
    width,
    height,
  }
}

const bounds = (background: Uint8Array, width: number, height: number) => {
  let left = width
  let right = -1
  let top = height
  let bottom = -1
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (background[y * width + x] === 0) {
        if (x < left) left = x
        if (x > right) right = x
        if (y < top) top = y
        if (y > bottom) bottom = y
      }
  return { left, right, top, bottom }
}

/**
 * The figure of several masters at once: background only where EVERY one of them is background.
 *
 * What makes a character's pose bases and face layers stack. Each is cut through the window this
 * mask gives, not through its own, so a pointing pose whose finger reaches past the base does not
 * get a frame of its own — and its head, which the edit kept where the base had it, lands on the
 * same sprite pixels as the base's head and every face layer's.
 */
export const sharedBackground = (backgrounds: readonly Uint8Array[]): Uint8Array =>
  backgrounds.reduce((shared, next) => shared.map((b, i) => b & next[i]))

/**
 * The window a portrait is cut from, in source pixels, and the sprite width it is resized to.
 *
 * A bust frames on the face and keeps every head the same size (see bustWindow); a full figure is
 * seated in a canvas that holds all of it (see seat). The two want opposite things from a wide
 * subject, which is why this is a branch and not a parameter.
 * The head is the right place to frame on for everybody except a pose built around a gesture:
 * the pointing explorer holds a finger up at arm’s length, and a window centred on his face
 * clips it off — removing the one thing that pose is for. Named per sprite for the same reason
 * the holes are: it is a property of that drawing, not a rule.
 */
export const portraitWindow = ({
  background,
  width,
  height,
  bust,
  centre,
  behind = 0,
  whole = false,
}: {
  background: Uint8Array
  width: number
  height: number
  /**
   * Frame the whole canvas rather than the figure: for a character whose masters are painted in the
   * frame their sprite already uses (Fez's are his shipped sprite redrawn at full size), so every pose
   * and face of him is cut through one window that no figure moves.
   */
  whole?: boolean
  bust?: number
  centre?: number
  behind?: number
}) => {
  const extent = bounds(background, width, height)
  const { left, right, top, bottom } = bust ? topBand(background, width, extent, bust) : extent
  if (right < left && !whole) return undefined
  const figure = { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 }
  const window = whole
    ? (() => {
        const canvasWidth = Math.max(width, Math.ceil((height * WIDTH) / HEIGHT))
        const canvasHeight = Math.round((canvasWidth * HEIGHT) / WIDTH)
        return {
          left: Math.floor((width - canvasWidth) / 2),
          top: height - canvasHeight,
          width: canvasWidth,
          height: canvasHeight,
        }
      })()
    : bust
      ? bustWindow({ top, bottom }, centre ?? headCentre(background, width, { top, bottom }))
      : (() => {
          const { canvasWidth, canvasHeight } = seat(figure)
          const sides = canvasWidth - figure.width
          return {
            left: left - Math.floor(sides / 2),
            top: bottom + 1 - canvasHeight,
            width: canvasWidth,
            height: canvasHeight,
          }
        })()
  const extra = bust ? Math.round(window.width * behind) : 0
  return {
    figure,
    window: { ...window, left: window.left - extra, width: window.width + extra },
    spriteWidth: Math.round(WIDTH * (1 + (bust ? behind : 0))),
  }
}

/**
 * How to take a window out of an image with sharp: extract the part that lies inside it, then pad
 * back out with transparency. A window may reach past an edge (a head near the top, a bust wider
 * than the source), and sharp's extract cannot.
 */
export const cutBox = (
  window: { left: number; top: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
) => {
  const left = Math.max(0, window.left)
  const top = Math.max(0, window.top)
  const width = Math.min(imageWidth, window.left + window.width) - left
  const height = Math.min(imageHeight, window.top + window.height) - top
  return {
    extract: { left, top, width, height },
    extend: {
      top: top - window.top,
      bottom: window.top + window.height - (top + height),
      left: left - window.left,
      right: window.left + window.width - (left + width),
    },
  }
}

const keyed = async (file: string, key: { r: number; g: number; b: number }, tolerance: number) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, info, background: edgeBackground({ data, ...info, key, tolerance }) }
}

/**
 * Turns an expression master into its face layer, in place: alpha is the feathered face region (see
 * faceLayer.ts) times the master's own keyed alpha, so the soft edge never paints the white it was
 * generated on over the room.
 */
const toFaceLayer = async (
  expression: { data: Buffer; info: sharp.OutputInfo; background: Uint8Array },
  baseFile: string,
  options: { threshold: number; erode: number; grow: number; feather: number }
) => {
  const { data, info, background } = expression
  const base = await sharp(baseFile).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  if (base.info.width !== info.width || base.info.height !== info.height)
    throw new Error(
      `the expression is ${info.width}x${info.height} and its base ${base.info.width}x${base.info.height}`
    )
  const diff = diffMask({ a: base.data, b: data, ...info, threshold: options.threshold })
  const region = faceRegion(diff, info.width, info.height, options)
  const box = boxOf(region, info.width, info.height)
  if (!box) throw new Error(`${baseFile} and its expression do not differ — nothing to cut`)
  const feathered = await sharp(Buffer.from(region.map(b => b * 255)), {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .blur(options.feather)
    .extractChannel(0)
    .raw()
    .toBuffer()
  for (let i = 0; i < info.width * info.height; i++)
    data[i * info.channels + 3] = background[i] === 1 ? 0 : feathered[i]
  return box
}

const main = async (): Promise<void> => {
  const file = process.argv[2]
  const name = arg("name")
  if (!file || file.startsWith("--") || !name) {
    console.error("usage: yarn import-portrait <file> --name=explorer")
    process.exit(1)
  }
  const key = hexToRgb(arg("key", "#ffffff")!)
  const tolerance = Number(arg("tolerance", "20"))
  const holes = (arg("holes", "") || "")
    .split(";")
    .filter(Boolean)
    .map(pair => pair.split(",").map(Number) as [number, number])

  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const background = edgeBackground({
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
    key,
    tolerance,
    holes,
  })
  for (let i = 0; i < background.length; i++) if (background[i] === 1) data[i * info.channels + 3] = 0

  const faceOf = arg("face-of")
  const faceBox = faceOf
    ? await toFaceLayer({ data, info, background }, faceOf, {
        threshold: Number(arg("threshold", "64")),
        erode: Number(arg("erode", "4")),
        grow: Number(arg("grow", "45")),
        feather: Number(arg("feather", "18")),
      })
    : undefined

  // A face layer is always cut through its base's frame; a pose base names the character's masters
  // so every one of them shares it.
  const cropFrom = (arg("crop-from") ?? faceOf)?.split(",").filter(Boolean)
  const framing = cropFrom
    ? await (async () => {
        const masters = await Promise.all(cropFrom.map(master => keyed(master, key, tolerance)))
        for (const { info: other } of masters)
          if (other.width !== info.width || other.height !== info.height)
            throw new Error(`--crop-from masters must be ${info.width}x${info.height}, the size of ${file}`)
        return sharedBackground(masters.map(m => m.background))
      })()
    : background

  const bust = arg("bust")
  const whole = process.argv.includes("--whole")
  const centre = arg("centre")
  const behind = bust ? Number(arg("behind", "0")) : 0
  const framed = portraitWindow({
    background: framing,
    width: info.width,
    height: info.height,
    bust: bust ? Number(bust) : undefined,
    centre: centre ? Number(centre) : undefined,
    behind,
    whole,
  })
  if (!framed) {
    console.error(`nothing but background in ${file} — is it on ${arg("key", "#ffffff")}?`)
    process.exit(1)
  }
  const { figure, window, spriteWidth } = framed
  const { wide: tooWide } = seat(figure)
  const { extract, extend } = cutBox(window, info.width, info.height)

  // Two passes, because sharp always extends AFTER it resizes: padding and resizing in one chain pads
  // the finished 250x375 and hands back a canvas the size of neither.
  const padded = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract(extract)
    .extend({ ...extend, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const out = join(OUT_ROOT, name + "-250.png")
  await sharp(padded).resize(spriteWidth, HEIGHT).png().toFile(out)

  if (faceBox) {
    console.log(
      `${out}  face layer of ${faceOf}, face ${faceBox.width}x${faceBox.height}+${faceBox.left}+${faceBox.top}`
    )
    return
  }

  const left_over = enclosedRegions({
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
    key,
    tolerance,
    background,
  })

  console.log(
    `${out}  figure ${figure.width}x${figure.height} of ${info.width}x${info.height}, x ${figure.left}..${figure.right}` +
      (cropFrom ? `  (shared crop of ${cropFrom.join(", ")})` : "")
  )
  console.log(
    `fills ${Math.round((figure.width / window.width) * 100)}% of the width and ` +
      `${Math.round((figure.height / window.height) * 100)}% of the height it ends up in` +
      // Over 100% in bust mode means the sides were clipped, which is the point — what must match
      // across the cast is the head, and a wide subject fitted by its width comes out small.
      (whole
        ? " (the whole canvas, as painted)"
        : bust
          ? " (bust: framed on the head, sides clipped)"
          : tooWide
            ? " (seated by width: wider than it is tall)"
            : "")
  )
  // Every patch of background the flood could not reach and no --holes named. The eyes belong here;
  // anything else is an opaque white blob that will only show up once the sprite is over a dark room.
  if (left_over.length > 0) {
    console.log(`left opaque: ${left_over.length} enclosed patch(es) — eyes, or holes you have not named yet`)
    for (const { pixels, at } of left_over.slice(0, 8))
      console.log(`  ${String(pixels).padStart(7)} px at ${at[0]},${at[1]}`)
    console.log(
      `  pass the ones that are not eyes as --holes=${left_over
        .slice(0, 3)
        .map(r => r.at.join(","))
        .join(";")}`
    )
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
