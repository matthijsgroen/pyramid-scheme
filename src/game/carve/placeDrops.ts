import { oneWayReach } from "../carveConstants"
import { keyOf, standsBehind } from "./derive"
import { CONNECTOR_DIRS, NODE_STEP } from "./grid"
import type { OneWayEdge, Pass } from "./state"

/**
 * ONE-WAY DROPS. Each authored passage needs a node of `from` and a node of `to` on one axis with exactly
 * 2 + oneWayRunCells(dir) cells between them (a launch, the obstacle, a landing), every one of them uncarved —
 * not a node, not a connector some chain walked, not a cell another drop already holds. The reservation is made
 * whole or not at all: a drop is never placed shorter, and never placed anywhere but between the two ends it
 * names. Picked off the same node set the grid is built from, and sorted by position so the same seed always
 * drops the same pair. A demand with no such pair is this carve's own shortfall, not the authoring's: another
 * seed may still place it, so the attempt is re-carved rather than refused.
 *
 * TWO AUTHORING SURFACES, ONE CARVE: `config.oneWays` names two section addresses, a one-way obstacle names two
 * regions — `doubleBack`'s own drops join the far end of one side chain to another, which section addresses
 * cannot reach at all (regions-and-containers.md). Both resolve to the identical question, "which cells carry
 * this label", just answered off a different map, so one demand list carries both and the search runs once
 * regardless of which vocabulary asked. The drops a seam carries come first, and a drop a lock laid is one.
 *
 * ONE RUN CARRIES ONE DROP. Two drops sharing a cell would write it twice and leave a passage the author asked
 * for gone with nothing reported, so the second takes the next free run — or, with none left, is this carve's
 * shortfall like any other.
 */
export const placeDrops: Pass<"branches" | "labels" | "doors" | "switchDoors" | "maze" | "lay", "drops"> = (
  prep,
  state
) => {
  const { n: N, exit } = state.maze
  const { used, seamDrops } = state.branches
  const { address, region, hidden } = state.labels
  const behind = standsBehind(state.doors, state.switchDoors)
  const laidDropIds = new Set((state.lay?.laid.drops ?? []).map(drop => drop.id))
  const exitKey = keyOf(exit)
  const drops: OneWayEdge[] = [...seamDrops]
  const takenRunCells = new Set<string>(seamDrops.flatMap(edge => [edge.launch, ...edge.run, edge.landing]))
  for (const demand of prep.obstacles.oneWayDemands) {
    if (demand.id !== undefined && laidDropIds.has(demand.id)) continue
    // `sectioned` marks which vocabulary asked, because the landing-doors check below reads it: the two forms
    // carry different authorship and so different exemptions from it.
    const labelOf = demand.sectioned ? address : region
    const candidates: OneWayEdge[] = []
    for (const fromKey of used) {
      if (labelOf.get(fromKey) !== demand.from) continue
      // The exit is a true dead end (every passage off it dropped but the one to its predecessor) precisely so
      // nothing reads as continuing past it. A drop hanging off it would add exactly the direction that was
      // deleted to guarantee that.
      if (fromKey === exitKey) continue
      const fromDoors = behind(fromKey)
      const [r, c] = fromKey.split(",").map(Number)
      for (const [dr, dc, d] of CONNECTOR_DIRS) {
        // The reservation is the cells strictly between the two nodes, one unit step at a time.
        const ur = dr / NODE_STEP,
          uc = dc / NODE_STEP
        const reach = oneWayReach(d)
        const nr = r + ur * reach,
          nc = c + uc * reach
        if (nr < 0 || nr >= N || nc < 0 || nc >= N) continue
        const toKey = `${nr},${nc}`
        if (toKey === exitKey) continue
        if (labelOf.get(toKey) !== demand.to) continue
        const between = Array.from({ length: reach - 1 }, (_, k) => `${r + ur * (k + 1)},${c + uc * (k + 1)}`)
        if (between.some(cellKey => used.has(cellKey) || takenRunCells.has(cellKey))) continue
        // A SECTION-ADDRESSED DROP MAY RUN INSIDE WHAT A DOOR SHUTS OFF, OR OUT OF IT, NEVER INTO GROUND SHUT BY
        // A DOOR THE PLAYER HAS NOT EARNED BY STANDING WHERE THEY FALL FROM. A switch's doors count here exactly
        // as an authored gate's do. This is the carve's own anti-spoiler check — the carve, not the author,
        // picked which cells span a section boundary, so an accidental shortcut past a gate is a real hazard.
        //
        // A REGION-ADDRESSED DROP IS EXEMPT. Its two ends are regions the author named outright, so the author
        // has already stated the intent this check exists to infer — it cannot tell a deliberate double-back
        // from a mistake, and for this form there is no mistake to catch: `deadRegions` and `walkLock` answer,
        // over the compiled lock, whether a region-to-region drop leaves the floor unsound or strands the player.
        if (demand.sectioned && [...behind(toKey)].some(door => !fromDoors.has(door))) continue
        // A hidden section is the statement that nothing is there until the player finds otherwise, and the
        // runtime empties its cells — so a visible drop into one leaves the source pointing at a stub, which is
        // the spoiler `freeWaysOut` refuses for a gate. Out of one stays legal.
        if (hidden.has(toKey)) continue
        candidates.push({
          ...(demand.id !== undefined ? { obstacleId: demand.id } : {}),
          realisation: demand.realisation,
          from: fromKey,
          to: toKey,
          dir: d,
          launch: between[0],
          run: between.slice(1, -1),
          landing: between[between.length - 1],
        })
      }
    }
    candidates.sort((a, b) => {
      const [ar, ac] = a.from.split(",").map(Number)
      const [br, bc] = b.from.split(",").map(Number)
      const [atr, atc] = a.to.split(",").map(Number)
      const [btr, btc] = b.to.split(",").map(Number)
      return ar - br || ac - bc || atr - btr || atc - btc
    })
    const picked = candidates[0]
    if (!picked) return { retry: [{ type: "oneWayUnsatisfied", from: demand.from, to: demand.to }] }
    for (const cellKey of [picked.launch, ...picked.run, picked.landing]) takenRunCells.add(cellKey)
    drops.push(picked)
  }
  state.drops = drops
}
