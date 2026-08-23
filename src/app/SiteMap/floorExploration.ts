import type { Direction, FloorGrid, GridCell } from "@/game/siteTypes"
import { getFamilyPlugin } from "@/app/families/familyRegistry"

// The per-floor "still stuff to find here" summary that drives the Travel marker. Computed from an
// assembled floor grid (cheap, done while the player is inside the site) and persisted so the travel
// screen reads it without re-assembling. Knowledge is only "keys and gates", no mod names.
//
// Content the player would come back for is either a LOOT-BEARING node (its family draws from the
// reward pool — FamilyMeta.rewardPriority > 0, so treasure/puzzle count and gate/trap/shop/tableau
// don't) or a KEY-GATED node (it exposes its own requiredKeyIds — e.g. a tableau's hieroglyphs),
// plus a still-fogged corridor (a branch never entered). A node counts even with an empty slot (the
// player can't tell from outside) and only while unvisited (state !== "completed"). Hidden corridors
// are excluded — the 👁 marker owns them.
//
// **Each content node's keys also include everything standing in the way of it.** A chest behind an
// unsolved tableau is no more available than the tableau is, and a bundle that names only the chest's
// own section lights the moment the player holds those keys — even though a tableau further up the
// corridor still wants hieroglyphs they have not found. That is a tester walking a tomb out to its
// end, every door that opens open, with the marker still promising something: 39 of the 40 tomb
// floors that carry a blocked node advertised a bundle smaller than the way in really costs.
//
// So requirements are inherited along the route from the entrance, and a node is `open` only when
// SOME route to it asks for nothing.
//
// Each content node's keys = the tomb-key ward key(s) gating its section + its own requiredKeyIds +
// whatever the route in still asks for. A node with no keys is `open` (always lights). One with keys
// becomes a keySet the travel screen
// re-checks against the live held-keys set (ward keys + completed hieroglyphs + whatever future mods
// provide); ALL keys in a bundle must be held. Floor-key gates aren't external keys (found in-floor),
// so their content stays `open`.
export type FloorExploration = { open: boolean; keySets: string[][] }

const DIR_MOVES: Record<Direction, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }

// What an unsolved node still asks of the player before they can pass it: a tableau's hieroglyphs, a
// ward door's key. A puzzle or a trap asks for nothing — the player can just do it — and a completed
// room is a doorway like any other.
const blockingKeys = (cell: GridCell): readonly string[] => {
  if (cell.type !== "room" || cell.state === "completed") return []
  const own = cell.requiredKeyIds ?? []
  const gate = cell.gateVariant === "tomb-key" && cell.requiredKeyId ? [cell.requiredKeyId] : []
  return [...own, ...gate]
}

// The cheapest set of keys each cell can be stood in with, walking out from the entrance. "Cheapest"
// is by subset rather than by count: two routes can ask for different things and neither be the
// lesser, so a cell is re-expanded whenever a route arrives that is not already covered.
const routeRequirements = (grid: FloorGrid): Map<string, ReadonlySet<string>> => {
  const best = new Map<string, ReadonlySet<string>>()
  const work: Array<[number, number, ReadonlySet<string>]> = [[grid.entrancePos[0], grid.entrancePos[1], new Set()]]
  while (work.length > 0) {
    const [r, c, req] = work.pop()!
    const cell = grid.cells[r]?.[c]
    if (!cell || cell.type === "empty" || cell.hidden) continue
    const k = `${r},${c}`
    const known = best.get(k)
    // Already reachable asking for no more than this: nothing to learn from this route.
    if (known && [...known].every(key => req.has(key))) continue
    best.set(k, req)
    const onward = new Set([...req, ...blockingKeys(cell)])
    for (const dir of cell.dirs) {
      const [dr, dc] = DIR_MOVES[dir]
      work.push([r + dr, c + dc, onward])
    }
  }
  return best
}

export const computeFloorExploration = (grid: FloorGrid): FloorExploration => {
  const sectionGateKeys = new Map<string, Set<string>>()
  for (const row of grid.cells)
    for (const cell of row)
      if (cell.type === "room" && !cell.hidden && cell.gateVariant === "tomb-key" && cell.requiredKeyId) {
        const h = cell.sectionHash ?? ""
        ;(sectionGateKeys.get(h) ?? sectionGateKeys.set(h, new Set()).get(h)!).add(cell.requiredKeyId)
      }

  const routeKeys = routeRequirements(grid)

  let open = false
  const keySets: string[][] = []
  const seen = new Set<string>()
  const addContent = (sectionHash: string, route: ReadonlySet<string>, ownKeys: readonly string[] = []) => {
    const keys = new Set([...(sectionGateKeys.get(sectionHash) ?? []), ...ownKeys, ...route])
    if (keys.size === 0) {
      open = true
      return
    }
    const sig = [...keys].sort().join(",")
    if (!seen.has(sig)) {
      seen.add(sig)
      keySets.push(sig.split(","))
    }
  }

  grid.cells.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell.type === "empty" || cell.hidden) return
      // Not reachable from the entrance at all on this grid — behind a hidden corridor nobody has
      // found. Those belong to the 👁 marker, not to this one.
      const route = routeKeys.get(`${r},${c}`)
      if (!route) return
      const h = cell.sectionHash ?? ""
      if (cell.type === "corridor") {
        if (cell.state === "fogged") addContent(h, route)
        return
      }
      if (cell.state === "completed") return
      const priority = cell.family ? (getFamilyPlugin(cell.family)?.meta.rewardPriority ?? 0) : 0
      const ownKeys = cell.requiredKeyIds ?? []
      if (priority > 0 || ownKeys.length > 0) addContent(h, route, ownKeys)
    })
  )

  return { open, keySets }
}
