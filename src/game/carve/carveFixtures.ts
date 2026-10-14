import { expandFloorLocks } from "../floorLocks"
import { planLockFloor } from "../lockPlan"
import { mulberry32 } from "../random"
import type { FloorConfig, FloorGrid } from "../siteTypes"
import { carveFloor } from "./carveFloor"
import { firstRung } from "./ladder"
import { PASSES } from "./passes"
import { prepareFloor } from "./prepareFloor"
import type { StatefulControl } from "../obstacles"
import type { PlacedContainer } from "../regions"
import type { CarveState, Cell, FloorPrep } from "./state"

/** A plain floor's config, with what a test sets on it. */
export const plainFloor = (overrides: Partial<FloorConfig> = {}): FloorConfig => ({
  pathPuzzles: 1,
  difficulty: "starter",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [],
  ...overrides,
})

/** The prep of a floor, its locks expanded and planned as `assembleFloor` does; throws where it refuses. */
export const prepOf = (config: FloorConfig, seed = 1): FloorPrep => {
  const expanded = expandFloorLocks(config)
  if (!expanded.ok) throw new Error(JSON.stringify(expanded.reasons))
  const result = prepareFloor("site", expanded.config, seed, {}, planLockFloor(expanded))
  if (!result.ok) throw new Error(JSON.stringify(result.reasons))
  return result.prep
}

/** Attempt `attempt`'s state before any pass has run, on the first rung. */
export const freshState = (prep: FloorPrep, attempt = 0): CarveState => ({
  attempt,
  rung: firstRung(prep),
  rand: mulberry32(prep.input.seed + attempt * 7919),
})

/** hall → mid → vault along the route. */
export const hallMidVault: PlacedContainer = {
  regions: [
    { name: "hall", appetite: "free" },
    { name: "mid", appetite: "free" },
    { name: "vault", appetite: "free" },
  ],
  connections: [
    ["hall", "mid"],
    ["mid", "vault"],
  ],
  in: "hall",
  out: "vault",
}

/** A lever standing in `in` that opens every one of `opens`. */
export const leverOpening = (opens: string[], id = "lever", inRegion = "hall"): StatefulControl => ({
  id,
  in: inRegion,
  states: ["shut", "open"],
  initial: "shut",
  returnsToInitial: false,
  opens: { shut: [], open: opens },
})

/** A main path of `steps` nodes in a straight row, with no passage between them. */
export const straightWalk = (steps: number) => {
  const mainPath = Array.from({ length: steps }, (_, i): Cell => [0, i * 2])
  return { n: steps * 2 + 1, entrance: mainPath[0], exit: mainPath[steps - 1], mainPath, passages: new Set<string>() }
}

/** The state of the first attempt, climbing the ladder as the loop does, whose every pass holds. */
export const firstCarved = (prep: FloorPrep): CarveState => {
  let carved: CarveState | undefined
  carveFloor(prep, PASSES, (_, state) => {
    carved ??= state
    return { rows: 0, cols: 0 } as unknown as FloorGrid
  })
  if (!carved) throw new Error("no attempt got through every pass")
  return carved
}
