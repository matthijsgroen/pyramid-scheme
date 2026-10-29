// THE PREFAB CHECK: every variant of a room prefab (each layout, plus its mirror) in every legal fill of its
// places must keep the doors joined and the stop and every blocking special reachable. Pure; the notation is
// read by prefabNotation.ts.
import type { PlaceDef, Prefab } from "./prefabTypes"

export type PlacedObject = { letter: string; top: number; left: number; rows: number; cols: number }
export type Variant = { layout: number; mirrored: boolean; cells: readonly string[] }
/** The filled blobs, each keyed "top,left". */
export type Fill = ReadonlyMap<string, true>

export const MAX_FILLS = 4096

const STEPS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const
const BLOCKING_SPECIALS = new Set(["actor", "chest", "portal", "mechanism"])

const reversed = (row: string): string => [...row].reverse().join("")

export const variantsOf = (prefab: Prefab): Variant[] =>
  prefab.layouts.flatMap((layout, index) => [
    { layout: index, mirrored: false, cells: layout.cells },
    ...(prefab.mirror ? [{ layout: index, mirrored: true, cells: layout.cells.map(reversed) }] : []),
  ])

/** The connected groups of one letter, as cell lists. */
const groupsOf = (cells: readonly string[], letter: string): [number, number][][] => {
  const seen = new Set<string>()
  const groups: [number, number][][] = []
  cells.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch !== letter || seen.has(`${r},${c}`)) return
      const group: [number, number][] = []
      const stack: [number, number][] = [[r, c]]
      seen.add(`${r},${c}`)
      while (stack.length > 0) {
        const [y, x] = stack.pop() as [number, number]
        group.push([y, x])
        for (const [dy, dx] of STEPS) {
          const key = `${y + dy},${x + dx}`
          if (cells[y + dy]?.[x + dx] === letter && !seen.has(key)) {
            seen.add(key)
            stack.push([y + dy, x + dx])
          }
        }
      }
      groups.push(group)
    })
  )
  return groups
}

export const placeBlobs = (variant: Variant, prefab: Prefab): PlacedObject[] =>
  Object.keys(prefab.places).flatMap(letter =>
    groupsOf(variant.cells, letter).map(group => {
      const ys = group.map(([y]) => y)
      const xs = group.map(([, x]) => x)
      const top = Math.min(...ys)
      const left = Math.min(...xs)
      return { letter, top, left, rows: Math.max(...ys) - top + 1, cols: Math.max(...xs) - left + 1 }
    })
  )

const keyOf = (blob: PlacedObject): string => `${blob.top},${blob.left}`

const touching = (a: PlacedObject, b: PlacedObject): boolean => {
  const apartX = Math.max(a.left - (b.left + b.cols), b.left - (a.left + a.cols)) // 0 edge to edge, below 0 overlapping
  const apartY = Math.max(a.top - (b.top + b.rows), b.top - (a.top + a.rows))
  return (apartX === 0 && apartY < 0) || (apartY === 0 && apartX < 0)
}

const combinations = <T>(items: readonly T[], size: number): T[][] => {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [head, ...tail] = items
  return [...combinations(tail, size - 1).map(rest => [head, ...rest]), ...combinations(tail, size)]
}

/** The ways one place can be filled: the sets of its blob keys that are filled. */
const choicesOf = (place: PlaceDef, blobs: PlacedObject[], all: PlacedObject[]): string[][] => {
  const keys = blobs.map(keyOf)
  const { group } = place
  if (group?.per) {
    const owners = all.filter(blob => blob.letter === group.per)
    // Each owner takes `take` of the blobs touching it; a blob touching two is decided once, for both.
    let partial: Map<string, boolean>[] = [new Map()]
    for (const owner of owners) {
      const near = blobs.filter(blob => touching(blob, owner)).map(keyOf)
      partial = partial.flatMap(decided => {
        const filled = near.filter(key => decided.get(key) === true).length
        const open = near.filter(key => !decided.has(key))
        return combinations(open, group.take - filled).map(picked => {
          const next = new Map(decided)
          for (const key of open) next.set(key, picked.includes(key))
          return next
        })
      })
    }
    return partial.map(decided => keys.filter(key => decided.get(key) === true))
  }
  if (group) return combinations(keys, group.take)
  if (!place.optional) return [keys]
  return keys.reduce<string[][]>((sets, key) => sets.flatMap(set => [set, [...set, key]]), [[]])
}

/** Every legal fill; with a `limit`, stops once one more than that many are found. */
export const fillsOf = (variant: Variant, prefab: Prefab, limit = Infinity): Fill[] => {
  const all = placeBlobs(variant, prefab)
  let fills: string[][] = [[]]
  for (const place of Object.values(prefab.places)) {
    const choices = choicesOf(
      place,
      all.filter(blob => blob.letter === place.letter),
      all
    )
    fills = fills.flatMap(fill => choices.map(choice => [...fill, ...choice])).slice(0, limit + 1)
  }
  return fills.map(fill => new Map(fill.map(key => [key, true as const])))
}

export const blockedCells = (variant: Variant, prefab: Prefab, fill: Fill): ReadonlySet<string> => {
  const blocked = new Set<string>()
  variant.cells.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch === "#" || BLOCKING_SPECIALS.has(prefab.specials[ch])) blocked.add(`${r},${c}`)
    })
  )
  for (const blob of placeBlobs(variant, prefab)) {
    const layer = prefab.places[blob.letter].layer
    if ((layer !== "floor" && layer !== "wall") || !fill.has(keyOf(blob))) continue
    for (let r = blob.top; r < blob.top + blob.rows; r++)
      for (let c = blob.left; c < blob.left + blob.cols; c++) blocked.add(`${r},${c}`)
  }
  return blocked
}

const reachFrom = (variant: Variant, blocked: ReadonlySet<string>, start: [number, number]): Set<string> => {
  const rows = variant.cells.length
  const cols = variant.cells[0].length
  const walkable = (r: number, c: number): boolean => {
    if (r < 0 || c < 0 || r >= rows || c >= cols || blocked.has(`${r},${c}`)) return false
    const ring = r === 0 || c === 0 || r === rows - 1 || c === cols - 1
    return !ring || variant.cells[r][c] === "d"
  }
  const reached = new Set([`${start[0]},${start[1]}`])
  const stack = [start]
  while (stack.length > 0) {
    const [y, x] = stack.pop() as [number, number]
    for (const [dy, dx] of STEPS) {
      const key = `${y + dy},${x + dx}`
      if (walkable(y + dy, x + dx) && !reached.has(key)) {
        reached.add(key)
        stack.push([y + dy, x + dx])
      }
    }
  }
  return reached
}

const filledNames = (variant: Variant, prefab: Prefab, fill: Fill): string => {
  const names = placeBlobs(variant, prefab)
    .filter(blob => fill.has(keyOf(blob)))
    .map(blob => `${blob.letter}@${keyOf(blob)}`)
  return names.length > 0 ? names.join(" ") : "nothing"
}

const faultsOf = (variant: Variant, prefab: Prefab, fill: Fill): string[] => {
  const blocked = blockedCells(variant, prefab, fill)
  const doors: [number, number][] = []
  variant.cells.forEach((row, r) => [...row].forEach((ch, c) => ch === "d" && doors.push([r, c])))
  if (doors.length === 0) return []
  const layout = prefab.layouts[variant.layout].name || `#${variant.layout}`
  const where = `layout ${layout}${variant.mirrored ? " mirrored" : ""}, filled ${filledNames(variant, prefab, fill)}`
  const faults: string[] = []
  const reached = reachFrom(variant, blocked, doors[0])
  const door = ([r, c]: [number, number]) => `door ${r},${c}`
  for (const other of doors.slice(1))
    if (!reached.has(`${other[0]},${other[1]}`))
      faults.push(`${where}: ${door(doors[0])} and ${door(other)} are cut apart`)
  variant.cells.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (prefab.specials[ch] === "stop" && !reached.has(`${r},${c}`))
        faults.push(`${where}: the stop at ${r},${c} cannot be reached from ${door(doors[0])}`)
    })
  )
  for (const [letter, special] of Object.entries(prefab.specials)) {
    if (!BLOCKING_SPECIALS.has(special)) continue
    for (const group of groupsOf(variant.cells, letter)) {
      const own = new Set(group.map(([y, x]) => `${y},${x}`))
      const open = group.some(([y, x]) =>
        STEPS.some(([dy, dx]) => !own.has(`${y + dy},${x + dx}`) && reached.has(`${y + dy},${x + dx}`))
      )
      if (!open) faults.push(`${where}: ${special} "${letter}" at ${group[0][0]},${group[0][1]} cannot be reached`)
    }
  }
  return faults
}

/** Every way the doors, the stop or a blocking special are cut off; empty when the prefab always walks. */
export const prefabFaults = (prefab: Prefab): string[] =>
  variantsOf(prefab).flatMap(variant => {
    const fills = fillsOf(variant, prefab, MAX_FILLS)
    if (fills.length > MAX_FILLS) {
      const layout = prefab.layouts[variant.layout].name || `#${variant.layout}`
      return [`layout ${layout}${variant.mirrored ? " mirrored" : ""}: too many fills to check`]
    }
    return fills.flatMap(fill => faultsOf(variant, prefab, fill))
  })
