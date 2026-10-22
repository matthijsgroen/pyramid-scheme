/**
 * The pure half of a face layer: which pixels of an expression master are its face.
 *
 * An expression is painted as an edit of its character's base master, and the face is what moved
 * (docs/game-design/story/character-art-prompts.md, "Composed expressions"). A regenerated edit also
 * redraws every outline a pixel over, so the raw difference is the face PLUS a hairline round the whole
 * figure; an opening removes the hairline and keeps the solid change, and the grow and the feather
 * (done by sharp, in `importPortrait`) turn it into a soft region the join fades across.
 */

/** 1 where the two pictures differ by more than `threshold` (RGB distance), 0 elsewhere. */
export const diffMask = ({
  a,
  b,
  width,
  height,
  channels,
  threshold,
}: {
  a: Uint8Array | Buffer
  b: Uint8Array | Buffer
  width: number
  height: number
  channels: number
  threshold: number
}): Uint8Array => {
  const out = new Uint8Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const p = i * channels
    if (Math.hypot(a[p] - b[p], a[p + 1] - b[p + 1], a[p + 2] - b[p + 2]) > threshold) out[i] = 1
  }
  return out
}

/** Squared distance from a column/row of sample values to their lower envelope (Felzenszwalb & Huttenlocher). */
const envelope = (f: Float64Array, n: number, out: Float64Array) => {
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  let k = -1
  for (let q = 0; q < n; q++) {
    if (f[q] === Infinity) continue
    let s = -Infinity
    while (k >= 0) {
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
      if (s > z[k]) break
      k--
    }
    k++
    v[k] = q
    z[k] = k === 0 ? -Infinity : s
    z[k + 1] = Infinity
  }
  if (k < 0) return out.fill(Infinity, 0, n)
  let j = 0
  for (let q = 0; q < n; q++) {
    while (z[j + 1] < q) j++
    out[q] = (q - v[j]) * (q - v[j]) + f[v[j]]
  }
  return out
}

/** Squared Euclidean distance from every pixel to the nearest set one — linear time, so a 1696x2528 master grows by 45px in a blink. */
export const squaredDistanceTo = (mask: Uint8Array, width: number, height: number): Float64Array => {
  const grid = new Float64Array(width * height)
  const column = new Float64Array(height)
  const columnOut = new Float64Array(height)
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) column[y] = mask[y * width + x] ? 0 : Infinity
    envelope(column, height, columnOut)
    for (let y = 0; y < height; y++) grid[y * width + x] = columnOut[y]
  }
  const row = new Float64Array(width)
  const rowOut = new Float64Array(width)
  for (let y = 0; y < height; y++) {
    row.set(grid.subarray(y * width, (y + 1) * width))
    envelope(row, width, rowOut)
    grid.set(rowOut, y * width)
  }
  return grid
}

/**
 * The face: the difference opened by `erode` (a stroke thinner than twice that is an outline redrawn,
 * not an expression) and then grown by `grow`, so the mask holds the brows to the chin with room for a
 * feather beyond them.
 */
export const faceRegion = (
  diff: Uint8Array,
  width: number,
  height: number,
  { erode, grow }: { erode: number; grow: number }
): Uint8Array => {
  const clear = diff.map(b => (b ? 0 : 1))
  const toClear = squaredDistanceTo(clear, width, height)
  const core = toClear.map(d => (d > erode * erode ? 1 : 0))
  const toCore = squaredDistanceTo(Uint8Array.from(core), width, height)
  const reach = (erode + grow) * (erode + grow)
  return Uint8Array.from(toCore, d => (d <= reach ? 1 : 0))
}

/** The bounding box of a mask's set pixels, or undefined when none are. */
export const boxOf = (mask: Uint8Array, width: number, height: number) => {
  let left = width
  let right = -1
  let top = height
  let bottom = -1
  for (let i = 0; i < width * height; i++) {
    if (!mask[i]) continue
    const x = i % width
    const y = (i - x) / width
    if (x < left) left = x
    if (x > right) right = x
    if (y < top) top = y
    if (y > bottom) bottom = y
  }
  return right < 0 ? undefined : { left, top, width: right - left + 1, height: bottom - top + 1 }
}
