import { seatBarrierRun } from "../obstacles"
import { pass } from "./state"

/**
 * THE REST OF EACH CONNECTION'S GATES, in the order stated, on the nodes nothing else claims — read off the
 * finished content and junctions so no puzzle or junction is moved for them: content may end up between two
 * gates, which is the carve's to distribute, and mod-off carves the same walls because a gate only ever
 * takes a node the path already has. A run the far region cannot seat fails the attempt, since a longer
 * path may; the last attempt names the connection. A laid floor's gates all stand where the lock laid them.
 */
export const seatGateRuns = pass(
  "seatGateRuns",
  ["maze", "regions", "content", "junctions", "seamGates", "lay"],
  ["runGates"],
  (prep, state) => {
    const { mainPath } = state.maze
    const { stepRegion } = state.regions
    const { placed } = state.content
    const runGates = new Map<string, number>()
    // A run never stands a gate where an earlier one, or any seam's, already stands.
    const taken = new Set(state.seamGates.values())
    for (const run of state.lay ? [] : prep.obstacles.mainPathRuns) {
      if (run.gates.length < 2) continue
      const steps = seatBarrierRun(
        stepRegion,
        run.between,
        run.gates.length,
        step =>
          step > 0 &&
          step < mainPath.length - 1 &&
          !placed.includes(step) &&
          !state.junctions.steps.has(step) &&
          !taken.has(step)
      )
      if (!steps)
        return {
          retry: [
            {
              type: "barriersNotSeated",
              between: [run.between[0], run.between[1]],
              barriers: run.gates.map(gate => gate.id),
            },
          ],
        }
      run.gates.forEach((gate, i) => {
        runGates.set(gate.id, steps[i])
        taken.add(steps[i])
      })
    }
    state.runGates = runGates
  }
)
