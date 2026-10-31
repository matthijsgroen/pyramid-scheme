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

// Counts stop at this, so nothing past MAX_FILLS is ever built.
const CAP = MAX_FILLS + 1

/** C(n, k), or CAP when it is larger. */
const binomial = (n: number, k: number): number => {
  let count = 1
  for (let i = 1; i <= k && count < CAP; i++) count = (count * (n - k + i)) / i
  return Math.min(count, CAP)
}

const combinations = <T>(items: readonly T[], size: number): T[][] => {
  if (size === 0) return [[]]
  if (items.length < size) return []
  const [head, ...tail] = items
  return [...combinations(tail, size - 1).map(rest => [head, ...rest]), ...combinations(tail, size)]
}

const TOO_MANY = "too many fills to check"
type Choices = { sets: string[][] } | { fault: string }

/** The ways one place can be filled: the sets of its blob keys that are filled, or why it cannot be. */
const choicesOf = (place: PlaceDef, blobs: PlacedObject[], all: PlacedObject[]): Choices => {
  const keys = blobs.map(keyOf)
  const { group } = place
  if (group?.per) {
    const { take, per } = group
    const owners = all.filter(blob => blob.letter === per)
    // Each owner takes `take` of the blobs touching it; a blob touching two is decided once, for both.
    let partial: Map<string, boolean>[] = [new Map()]
    for (const owner of owners) {
      const near = blobs.filter(blob => touching(blob, owner)).map(keyOf)
      if (near.length < take)
        return { fault: `${place.letter} cannot fill ${take} of ${near.length} per ${per}@${keyOf(owner)}` }
      const next: Map<string, boolean>[] = []
      for (const decided of partial) {
        const filled = near.filter(key => decided.get(key) === true).length
        const open = near.filter(key => !decided.has(key))
        if (take < filled || take - filled > open.length) continue
        if (binomial(open.length, take - filled) + next.length > CAP) return { fault: TOO_MANY }
        for (const picked of combinations(open, take - filled)) {
          const grown = new Map(decided)
          for (const key of open) grown.set(key, picked.includes(key))
          next.push(grown)
        }
      }
      partial = next
    }
    if (partial.length === 0) return { fault: `${place.letter} cannot fill ${take} per ${per}` }
    return { sets: partial.map(decided => keys.filter(key => decided.get(key) === true)) }
  }
  if (group) {
    if (keys.length < group.take) return { fault: `${place.letter} cannot fill ${group.take} of ${keys.length}` }
    return binomial(keys.length, group.take) > MAX_FILLS
      ? { fault: TOO_MANY }
      : { sets: combinations(keys, group.take) }
  }
  if (!place.optional) return { sets: [keys] }
  if (2 ** keys.length > MAX_FILLS) return { fault: TOO_MANY }
  return { sets: keys.reduce<string[][]>((sets, key) => sets.flatMap(set => [set, [...set, key]]), [[]]) }
}

const labelOf = (variant: Variant, prefab: Prefab): string =>
  `layout ${prefab.layouts[variant.layout].name || `#${variant.layout}`}${variant.mirrored ? " mirrored" : ""}`

/** Every legal fill of a variant, or the one fault that stops them being listed. */
const planFills = (variant: Variant, prefab: Prefab): { fills: Fill[] } | { fault: string } => {
  const all = placeBlobs(variant, prefab)
  let fills: string[][] = [[]]
  for (const place of Object.values(prefab.places)) {
    const choices = choicesOf(
      place,
      all.filter(blob => blob.letter === place.letter),
      all
    )
    if ("fault" in choices) return { fault: `${labelOf(variant, prefab)}: ${choices.fault}` }
    if (fills.length * choices.sets.length > MAX_FILLS) return { fault: `${labelOf(variant, prefab)}: ${TOO_MANY}` }
    fills = fills.flatMap(fill => choices.sets.map(choice => [...fill, ...choice]))
  }
  return { fills: fills.map(fill => new Map(fill.map(key => [key, true as const]))) }
}

/** Every legal fill; none when the places cannot be filled or the fills pass MAX_FILLS (prefabFaults says which). */
export const fillsOf = (variant: Variant, prefab: Prefab): Fill[] => {
  const plan = planFills(variant, prefab)
  return "fills" in plan ? plan.fills : []
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

type Doors = [number, number][]

const faultsOf = (variant: Variant, prefab: Prefab, fill: Fill, doors: Doors, label: string): string[] => {
  const blocked = blockedCells(variant, prefab, fill)
  const where = `${label}, filled ${filledNames(variant, prefab, fill)}`
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

/** Every way the places cannot be filled or the doors, the stop or a blocking special are cut off; empty when the prefab always walks. */
export const prefabFaults = (prefab: Prefab): string[] => [
  ...[...Object.keys(prefab.places), ...Object.keys(prefab.specials)]
    .filter(letter => !prefab.layouts.some(layout => layout.cells.some(row => row.includes(letter))))
    .map(letter => `"${letter}" is declared but never drawn`),
  ...variantsOf(prefab).flatMap(variant => {
    const plan = planFills(variant, prefab)
    if ("fault" in plan) return [plan.fault]
    const doors: Doors = []
    variant.cells.forEach((row, r) => [...row].forEach((ch, c) => ch === "d" && doors.push([r, c])))
    if (doors.length === 0) return []
    const label = labelOf(variant, prefab)
    return plan.fills.flatMap(fill => faultsOf(variant, prefab, fill, doors, label))
  }),
]
