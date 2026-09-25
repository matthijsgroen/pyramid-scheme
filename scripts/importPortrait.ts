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
 *
 * The key is flood-filled inward from the edges rather than matched everywhere, which is the whole
 * difference between this and `import-tile`: a prop on magenta has no magenta of its own, but a person on
 * white has white in their eyes, and a plain threshold punches both of them out.
 */
import sharp from "sharp"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { hexToRgb } from "./keyOut"

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
 * Which pixels are background: the key colour REACHED FROM THE EDGE.
 *
 * Exported for the spec — the case worth holding onto is a white pixel enclosed by the figure, which is
 * an eye, and which a threshold on colour alone turns into a hole.
 */
export const edgeBackground = ({
  data,
  width,
  height,
  channels,
  key,
  tolerance,
}: {
  data: Uint8Array | Buffer
  width: number
  height: number
  channels: number
  key: { r: number; g: number; b: number }
  tolerance: number
}): Uint8Array => {
  const background = new Uint8Array(width * height)
  const isKey = (i: number) =>
    Math.hypot(data[i * channels] - key.r, data[i * channels + 1] - key.g, data[i * channels + 2] - key.b) <= tolerance
  const stack: number[] = []
  for (let x = 0; x < width; x++) stack.push(x, (height - 1) * width + x)
  for (let y = 0; y < height; y++) stack.push(y * width, y * width + width - 1)
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

const main = async (): Promise<void> => {
  const file = process.argv[2]
  const name = arg("name")
  if (!file || file.startsWith("--") || !name) {
    console.error("usage: yarn import-portrait <file> --name=explorer")
    process.exit(1)
  }
  const key = hexToRgb(arg("key", "#ffffff")!)
  const tolerance = Number(arg("tolerance", "20"))

  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const background = edgeBackground({
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
    key,
    tolerance,
  })
  for (let i = 0; i < background.length; i++) if (background[i] === 1) data[i * info.channels + 3] = 0

  const { left, right, top, bottom } = bounds(background, info.width, info.height)
  if (right < left) {
    console.error(`nothing but background in ${file} — is it on ${arg("key", "#ffffff")}?`)
    process.exit(1)
  }
  const figure = { width: right - left + 1, height: bottom - top + 1 }
  const { wide: tooWide, canvasWidth, canvasHeight } = seat(figure)
  const sides = canvasWidth - figure.width

  // Two passes, because sharp always extends AFTER it resizes: padding and resizing in one chain pads
  // the finished 250x375 and hands back a canvas the size of neither.
  const padded = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .extract({ left, top, width: figure.width, height: figure.height })
    .extend({
      top: canvasHeight - figure.height,
      bottom: 0,
      left: Math.floor(sides / 2),
      right: Math.ceil(sides / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer()

  const out = join(OUT_ROOT, name + "-250.png")
  await sharp(padded).resize(WIDTH, HEIGHT).png().toFile(out)

  console.log(`${out}  figure ${figure.width}x${figure.height} of ${info.width}x${info.height}`)
  console.log(
    `fills ${Math.round((figure.width / canvasWidth) * 100)}% of the width and ` +
      `${Math.round((figure.height / canvasHeight) * 100)}% of the height it ends up in` +
      (tooWide ? " (seated by width: wider than it is tall)" : "")
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
