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

/** Each 8-connected run of set pixels: a label per pixel (0 for clear), and the size of each label from 1. */
const components = (mask: Uint8Array, width: number, height: number) => {
  const label = new Int32Array(width * height)
  const sizes: number[] = []
  for (let start = 0; start < label.length; start++) {
    if (!mask[start] || label[start]) continue
    const id = sizes.length + 1
    let size = 0
    const stack = [start]
    label[start] = id
    while (stack.length > 0) {
      const i = stack.pop()!
      size++
      const x = i % width
      const y = (i - x) / width
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
          const j = ny * width + nx
          if (mask[j] && !label[j]) {
            label[j] = id
            stack.push(j)
          }
        }
    }
    sizes.push(size)
  }
  return { label, sizes }
}

/**
 * Which parts of an opened difference are the face: the largest, and every other part linked to it — a
 * part of `speck` pixels or more within `near` (a floating brow, a sweat drop), a smaller one only within
 * `touch` (where the two would meet once grown). Linked parts link further, so the face is gathered until
 * nothing more joins; what is left is a sub-pixel shift redrawn at a boot or a hat brim.
 */
const faceParts = (
  core: Uint8Array,
  width: number,
  height: number,
  { near, speck, touch }: { near: number; speck: number; touch: number }
): Uint8Array => {
  const { label, sizes } = components(core, width, height)
  if (sizes.length === 0) return core
  const kept = new Uint8Array(sizes.length + 1)
  kept[sizes.indexOf(Math.max(...sizes)) + 1] = 1
  for (;;) {
    const toFace = squaredDistanceTo(
      Uint8Array.from(label, l => kept[l]),
      width,
      height
    )
    const closest = new Float64Array(sizes.length + 1).fill(Infinity)
    for (let i = 0; i < label.length; i++) if (label[i] && toFace[i] < closest[label[i]]) closest[label[i]] = toFace[i]
    let joined = false
    sizes.forEach((size, k) => {
      const reach = size >= speck ? near : touch
      if (kept[k + 1] || closest[k + 1] > reach * reach) return
      kept[k + 1] = 1
      joined = true
    })
    if (!joined) return Uint8Array.from(label, l => kept[l])
  }
}

/**
 * The face: the difference opened by `erode` (a stroke thinner than twice that is an outline redrawn,
 * not an expression), cut to its parts (see faceParts) and then grown by `grow`, so the mask holds the
 * brows to the chin with room for a feather beyond them.
 */
export const faceRegion = (
  diff: Uint8Array,
  width: number,
  height: number,
  { erode, grow, near, speck }: { erode: number; grow: number; near: number; speck: number }
): Uint8Array => {
  const clear = diff.map(b => (b ? 0 : 1))
  const toClear = squaredDistanceTo(clear, width, height)
  const opened = Uint8Array.from(toClear, d => (d > erode * erode ? 1 : 0))
  const core = faceParts(opened, width, height, { near, speck, touch: 2 * (erode + grow) })
  const toCore = squaredDistanceTo(core, width, height)
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

/** 1 where the mask reaches within `radius` of a set pixel. */
const dilate = (mask: Uint8Array, width: number, height: number, radius: number) =>
  Uint8Array.from(squaredDistanceTo(mask, width, height), d => (d <= radius * radius ? 1 : 0))

/** 1 where the mask holds every pixel within `radius`. */
const erode = (mask: Uint8Array, width: number, height: number, radius: number) =>
  Uint8Array.from(
    squaredDistanceTo(
      Uint8Array.from(mask, b => (b ? 0 : 1)),
      width,
      height
    ),
    d => (d > radius * radius ? 1 : 0)
  )

/**
 * A pose's FOREGROUND: what the pose edit added in front of the head — a straw, an umbrella — where a
 * face layer would paint over it. The difference from the master opened by `erode` (outlines redrawn a
 * pixel over are not an object), closed by `close` (where the object's outline crosses the head's own, the
 * pixels did not change), grown by `grow` for its anti-aliased edge, and kept only inside `reach`, the
 * pixels any face layer paints. Outside the reach the base already shows the object.
 */
export const frontRegion = (
  diff: Uint8Array,
  reach: Uint8Array,
  width: number,
  height: number,
  options: { erode: number; close: number; grow: number }
): Uint8Array => {
  const opened = dilate(erode(diff, width, height, options.erode), width, height, options.erode)
  const closed =
    options.close > 0 ? erode(dilate(opened, width, height, options.close), width, height, options.close) : opened
  const grown = options.grow > 0 ? dilate(closed, width, height, options.grow) : closed
  return grown.map((b, i) => b & reach[i])
}
