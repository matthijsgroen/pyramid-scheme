import { spreadContentIndices } from "./grid"
import { pass } from "./state"

/**
 * THE MAIN PATH'S CONTENT, before any control moves a piece of it. The exit stands at the main path's end.
 * Content nodes (puzzles/chests + the goal) are spread evenly across the whole main path instead of packed
 * against the entrance — packing them up front left a long bare corridor behind the goal with nothing to do
 * and nowhere to branch. Spreading keeps something to find along the whole walk, and puts the goal last
 * (closest to the exit) so there's no unused tail behind it either. A laid floor's content stands where the
 * lay placed it, with the route's own doors, junction and seats in view.
 *
 * A GATE ROOM AND A PUZZLE CANNOT BOTH STAND IN ONE CELL, and it is the content that moves: a seam is where
 * the regions actually change, while content is spread for rhythm and one node either way is the kind of
 * thing the carve already decides. Forward to the next free node, so one layout always places the same way.
 * `spreadContentIndices` deals in mainPath-array indices (one real node apart), the same space the seams are
 * built in, so the step here is 1, not 2.
 *
 * The seams, NOT the gates — every seam forwards content past it, gated or not, so the goal lands on the
 * identical node whether or not the topology mod (and so any obstacle) is in the build. Skipping only actual
 * gate cells would let the goal drift outward exactly by however many gates fall before it, which is
 * mod-owned by construction: two builds that agree on `regionLayout` but disagree on `obstacles` would then
 * disagree on where the main zone ends, which is the identity bug this avoids.
 *
 * NOT GROWN FOR A CONTROL. A control's room is carved out of a node this count already reserves for the
 * floor's own content rather than an extra one added here: the maze must carve the same way whether the
 * topology mod that owns `controls` is registered or not.
 *
 * A path with no free node left for every piece of content is retried rather than refused: the path
 * lengthens across the attempt budget.
 */
export const placeMainContent = pass("placeMainContent", ["maze", "regions", "lay"], ["content"], (prep, state) => {
  const { contentCount, leverOnMain } = prep.sizing
  const { mainPath } = state.maze
  const { seams } = state.regions
  if (mainPath.length < contentCount + 2) return { retry: [] } // need entrance + content + a distinct exit

  const placed: number[] = state.lay ? [...state.lay.mainSteps] : []
  for (const wanted of state.lay ? [] : spreadContentIndices(contentCount, 1, mainPath.length)) {
    let index = wanted
    while (index < mainPath.length - 1 && (seams.has(index) || placed.includes(index))) index += 1
    if (index >= mainPath.length - 1) break
    placed.push(index)
  }
  if (placed.length < contentCount) return { retry: [] }
  // A FLOOR WITH NO EXIT ENDS AT ITS GOAL CHEST: the main path's terminal is a dead end, and with no pillar to
  // stand there the chest takes it, so no empty stub runs on past the last thing the floor holds.
  const terminal = mainPath.length - 1
  if (!state.lay && prep.config.config.exitOrStaircase === "none" && !seams.has(terminal))
    placed[placed.length - 1] = terminal

  // EACH PUZZLE'S AUTHORED ORDINAL — 0-based, in path order — ASSIGNED ONCE, HERE, before a control gets
  // any chance to move one of these nodes. `k` indexes `config.rewards[k]`/`config.encountersByIndex[k]`, is
  // handed to `resolveKeyRequirements` as `pathIndex`, and the room built from it carries `pathIndex: k`
  // onward into its own save address (`p${k}`, cellSlot.ts). A puzzle keeps its ordinal wherever its node
  // ends up: a control that displaces it moves its entry rather than renumbering every puzzle after it.
  const puzzleRole = new Map<number, number>()
  placed.slice(leverOnMain ? 1 : 0, -1).forEach((idx, k) => puzzleRole.set(idx, k))

  state.content = {
    placed,
    goal: placed[placed.length - 1],
    // A lever the main path holds takes the first content node: it opens what lies further on, so the
    // walk has to reach it before the doors it owns are worth reaching.
    lever: leverOnMain ? placed[0] : -1,
    puzzleRole,
  }
})
