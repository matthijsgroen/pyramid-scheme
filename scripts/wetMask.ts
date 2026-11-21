/**
 * The WATERLINE of a prop standing in water, cut from its scaffold's height pass (`render-prop --pass=height`).
 *
 * A prop on a flooded cell shows only what stands higher than the water above the floor it stands on. The height
 * pass says how high every pixel of the object is; the seat render says where its shadow lies, which is on the
 * floor and so always under. Everything else (paint the repaint added past the model's silhouette) goes with the
 * nearest pixel the renders do know. Paint farther out is kept, unless something known to be under lies above it
 * in its column: what a repaint adds far out is a lid or a frond, and the foot it adds lies below the water.
 */

/** Alpha 255 where the pixel shows above the water, 0 where it is under. */
export const waterline = ({
  heights,
  object,
  shadow,
  width,
  height,
  depth,
  reach,
}: {
  /** Each pixel's height above the floor, in the same pixels as the image. */
  heights: Float32Array
  /** Where the object itself is (its height pass's alpha). */
  object: Uint8Array
  /** Where its shadow lies on the floor (the seat render's alpha); empty when there is none. */
  shadow: Uint8Array
  width: number
  height: number
  /** How deep it stands, in the same pixels. */
  depth: number
  /** How far, in pixels, a pixel the renders do not know takes after its nearest known one. */
  reach: number
}): Uint8Array => {
  const n = width * height
  const UNKNOWN = 2
  const label = new Uint8Array(n).fill(UNKNOWN)
  let frontier: number[] = []
  for (let i = 0; i < n; i++) {
    if (object[i] > 127) label[i] = heights[i] > depth ? 1 : 0
    else if (shadow[i] > 16) label[i] = 0
    else continue
    frontier.push(i)
  }
  for (let step = 0; step < reach && frontier.length > 0; step++) {
    const next: number[] = []
    for (const i of frontier) {
      const x = i % width
      const y = (i - x) / width
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx
          const yy = y + dy
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue
          const j = yy * width + xx
          if (label[j] !== UNKNOWN) continue
          label[j] = label[i]
          next.push(j)
        }
    }
    frontier = next
  }
  // Paint out of reach goes under where something known to be under lies above it in its column: the water is a
  // surface, and below one drowned pixel nothing can be dry.
  const firstUnder = new Int32Array(width).fill(height)
  for (let i = 0; i < n; i++) {
    const x = i % width
    if ((object[i] > 127 || shadow[i] > 16) && label[i] === 0) firstUnder[x] = Math.min(firstUnder[x], (i - x) / width)
  }
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) {
    const x = i % width
    const under = label[i] === 0 || (label[i] === UNKNOWN && (i - x) / width > firstUnder[x])
    out[i] = under ? 0 : 255
  }
  return out
}
