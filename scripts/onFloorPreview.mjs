// Composites a tile onto its rank's floor at CELL size, WITH the rank's wall band above it, then blows
// the result up with nearest — because a prop is judged at 56 units and never at the size it was drawn.
//
// The Bes statue came back with a plinth drawn in perspective against every rule in the prompt, and at
// slot size that plinth is twelve pixels; the pit's shaft, mid-grey in a 448-wide scaffold, measured the
// same value as the floor behind it once it was 45 pixels across, and no hole read at all. Neither was
// visible in the render.
//
// THE WALL IS IN THE PICTURE because a prop is not only judged against the floor. The pit's spoil went
// out at +75 warmth against a wall that sits at +29, and it took someone looking at the map to say so —
// every number reported on the way there was a whole-sprite mean, and the sprite is 43% black shaft.
// The band is drawn at HALF the stored height, which is what the renderer does with a face.
//
//   yarn on-floor src/assets/tiles/starter/pit.png starter /tmp/pit.png
import sharp from "sharp"

const CELL = 56
const BAND = 28
const [tile, tier = "starter", out = "/tmp/on-floor.png"] = process.argv.slice(2)
const W = CELL * 3
const H = BAND + CELL * 2
const face = await sharp(`src/assets/tiles/${tier}/wall-face.png`).resize(W, BAND, { fit: "fill" }).toBuffer()
const floor = await sharp(`src/assets/tiles/${tier}/floor.png`)
  .resize(W, CELL * 2, { fit: "cover" })
  .toBuffer()
const sprite = sharp(tile)
const { width, height } = await sprite.metadata()
// Bottom-aligned on the middle cell's floor line, the way SiteMapView draws a prop.
const composed = await sharp({
  create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
})
  .composite([
    { input: floor, top: BAND, left: 0 },
    { input: face, top: 0, left: 0 },
    // A WALL ITEM goes in the band; a prop stands on the floor line below it. Told apart by height,
    // because the wall slot is the only one shorter than the band.
    height <= BAND
      ? { input: await sprite.toBuffer(), top: BAND - height, left: CELL }
      : { input: await sprite.toBuffer(), top: BAND + CELL - height + 14, left: Math.round((W - width) / 2) },
  ])
  .png()
  .toBuffer()
await sharp(composed)
  .resize(W * 6, H * 6, { kernel: "nearest" })
  .toFile(out)
console.log(`${out} — ${tile} at ${width}x${height} on the ${tier} floor, under its own wall`)
