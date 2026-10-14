import { DIRS2 } from "./grid"
import { pass } from "./state"
import type { Cell } from "./state"

/**
 * WHERE EACH `{ in }` FORK'S JUNCTION STANDS, settled before anything mod-owned seats on the main path so no
 * control, displaced puzzle or branch can take the cell: a node of the named region that is no seam, holds
 * no content and is neither the entrance nor the exit, with a free node beside it for every seam, or no
 * chain could ever hang off it. Drawn from the region's own nodes and `regionLayout` alone, so the mod being
 * off cannot move it. A laid junction is the cell the lock laid for it, already on the route.
 */
export const placeJunctions = pass(
  "placeJunctions",
  ["maze", "regions", "content", "lay", "rand"],
  ["junctions"],
  (prep, state) => {
    const { forkIns } = prep.forks
    const { n: N, mainPath } = state.maze
    const { stepRegion, seams } = state.regions
    const { placed } = state.content
    const laid = state.lay?.laid
    const steps = new Set<number>()
    const order: number[] = []
    for (const junction of laid?.junctions ?? []) {
      steps.add(junction.step)
      order.push(junction.step)
    }
    for (const fork of laid ? [] : forkIns) {
      const mainKeys = new Set(mainPath.map(([r, c]) => `${r},${c}`))
      const sideRoom = ([r, c]: Cell) =>
        DIRS2.filter(([dr, dc]) => {
          const [nr, nc] = [r + dr, c + dc]
          return nr >= 0 && nr < N && nc >= 0 && nc < N && !mainKeys.has(`${nr},${nc}`)
        }).length
      const nodes: number[] = []
      for (let mi = 1; mi < mainPath.length - 1; mi++)
        if (
          stepRegion[mi] === fork.region &&
          !seams.has(mi) &&
          !placed.includes(mi) &&
          sideRoom(mainPath[mi]) >= fork.seams.length
        )
          nodes.push(mi)
      if (nodes.length === 0 || fork.sectionIdxs.length < fork.seams.length) break
      const mi = nodes[Math.floor(state.rand() * nodes.length)]
      steps.add(mi)
      order.push(mi)
    }
    if (order.length < forkIns.length) return { retry: [{ type: "forkSeamsNotLaid", fork: forkIns[order.length] }] }
    state.junctions = { steps, order }
  }
)
