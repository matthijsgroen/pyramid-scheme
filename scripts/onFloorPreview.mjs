// Composites a prop tile onto its rank's floor at CELL size, then blows the result up with nearest —
// because a prop is judged at 56 units and never at the size it was drawn.
//
// The Bes statue came back with a plinth drawn in perspective against every rule in the prompt, and at
// slot size that plinth is twelve pixels; the pit's shaft, mid-grey in a 448-wide scaffold, measured the
// same value as the floor behind it once it was 45 pixels across, and no hole read at all. Neither was
// visible in the render. What shows at this size is VALUE and silhouette, so this is the picture to
// judge a scaffold and a repaint against.
//
//   node scripts/onFloorPreview.mjs src/assets/tiles/starter/pit.png starter /tmp/pit.png
import sharp from "sharp"

const CELL = 56
const [prop, tier = "starter", out = "/tmp/on-floor.png"] = process.argv.slice(2)
const floor = await sharp(`src/assets/tiles/${tier}/floor.png`)
  .resize(CELL * 3, CELL * 3, { fit: "cover" })
  .toBuffer()
const sprite = sharp(prop)
const { width, height } = await sprite.metadata()
// Bottom-aligned on the middle cell's floor line, the way SiteMapView draws a prop.
const composed = await sharp(floor)
  .composite([
    {
      input: await sprite.toBuffer(),
      left: Math.round((CELL * 3 - width) / 2),
      top: CELL * 2 - height + Math.round(CELL * 0.15),
    },
  ])
  .toBuffer()
await sharp(composed)
  .resize(CELL * 18, CELL * 18, { kernel: "nearest" })
  .toFile(out)
console.log(`${out} — ${prop} at ${width}x${height} on the ${tier} floor`)
