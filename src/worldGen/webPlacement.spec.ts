import { describe, expect, it } from "vitest"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { potKey, webKey } from "../game/webLine"
import { parseWeb } from "../game/webNotation"
import { resolveEncounterMeta } from "../mods/allFamilyMeta"
import { WEB_REACHABILITY, webActivatorReward } from "../mods/topology/game/web/activator"
import { computeReachability } from "./reachability"
import type { SiteConfig } from "./types"
import { placeWeb } from "./webPlacement"
import { solveWeb, webAgreement } from "./webSolver"

// A made-up wizard tier: wizard_1 one pyramid, wizard_2 two, each pyramid one floor with a side section.
const floorOf = (extra: Partial<GameFloorConfig> = {}): GameFloorConfig => ({
  pathPuzzles: 4,
  difficulty: "wizard",
  end: "treasure",
  exitOrStaircase: "exit",
  mainEndReward: { type: "fragmentSlot" },
  sideSections: [{ pathPuzzles: 1, difficulty: "wizard", end: "treasure", endReward: { type: "fragmentSlot" } }],
  ...extra,
})

const SEEDS = Array.from({ length: 20 }, (_, n) => (n + 1) * 7919)

/** A floor pinned at the first seed it carves at, as the bake pins every floor. */
const pinned = (journeyId: string, levelNr: number, floor: GameFloorConfig): GameFloorConfig => {
  for (const seed of SEEDS) if (carve(journeyId, levelNr, 0, { ...floor, seed }, false)) return { ...floor, seed }
  throw new Error("no seed carves the made-up floor")
}

function carve(journeyId: string, levelNr: number, floorIndex: number, config: GameFloorConfig): FloorGrid
function carve(
  journeyId: string,
  levelNr: number,
  floorIndex: number,
  config: GameFloorConfig,
  must: false
): FloorGrid | undefined
function carve(journeyId: string, levelNr: number, floorIndex: number, config: GameFloorConfig, must = true) {
  const result = assembleFloor(journeyId, config, 1, resolveEncounterMeta, {
    floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex },
  })
  if (result.success) return result.grid
  if (must) throw new Error(`${journeyId} ${levelNr} will not carve: ${JSON.stringify(result.reasons)}`)
  return undefined
}

const madeUpWorld = (): Record<string, SiteConfig[]> => ({
  wizard_1: [[pinned("wizard_1", 1, floorOf())]],
  wizard_2: [[pinned("wizard_2", 1, floorOf())], [pinned("wizard_2", 2, floorOf())]],
})

const placed = (text: string) => {
  const configs = madeUpWorld()
  const placement = placeWeb(parseWeb(text, "made.web"), configs, carve, webActivatorReward)
  return { configs, placement }
}

const META = { wizard_1: { tier: "wizard" as const }, wizard_2: { tier: "wizard" as const } }
const reachOf = (configs: Record<string, SiteConfig[]>, owned: Record<string, number>) =>
  computeReachability(
    configs,
    META,
    new Map(Object.entries(owned)),
    undefined,
    undefined,
    WEB_REACHABILITY,
    resolveEncounterMeta,
    true
  )

describe("a web placed on a world", () => {
  it("writes a stop as a web door asking for web:<pot>#1 and the activator into its reward slot", () => {
    const { configs, placement } = placed("[w2p1]\nsand from 30%: 100% by sun\n[w1p1]\nlever sun @end")
    expect(configs.wizard_2[0][0].webDoors).toEqual([{ key: potKey("w2p1", 1), at: { seam: 1 } }])
    expect(configs.wizard_1[0][0].mainEndReward).toEqual({
      type: "webActivator",
      name: "sun",
      look: "lever",
      pots: ["w2p1"],
    })
    expect(placement.placement).toContain("web:w2p1#1 w2p1 f0 seam 1|2")
  })

  it("refuses an activator in a slot that already holds a reward of its own", () => {
    const configs = madeUpWorld()
    configs.wizard_1[0][0].mainEndReward = { type: "mapPiece", tombId: "t" }
    expect(() =>
      placeWeb(parseWeb("[w2p1]\nsand by sun\n[w1p1]\nlever sun @end"), configs, carve, webActivatorReward)
    ).toThrow(/sun \(line 4\): w1p1 f0 main end holds a mapPiece/)
  })
})

describe("the world solver on a placed web", () => {
  it("does not reach pyramid N+1 while pyramid N's exit is shut", () => {
    const { configs } = placed("[w2p1]\nsand from 30%: 100% by sun\n[w1p1]\nlever sun @end")
    const before = reachOf(configs, {})
    expect(before.reachableFloors.has("wizard_2#1#0")).toBe(false)
    expect(before.exitsReached.has("wizard_2#0")).toBe(false)
    expect(before.harvestedCounts.get(webKey("sun"))).toBe(1)
    const after = reachOf(configs, Object.fromEntries(before.harvestedCounts))
    expect(after.reachableFloors.has("wizard_2#1#0")).toBe(true)
  })

  it("reaches a stop with n of its pot's activators and not with n-1", () => {
    const { configs } = placed("[w2p1]\nsand from 20%: 60% 100% by sun moon\n[w1p1]\nlever sun @end\nlever moon @25%")
    expect(configs.wizard_2[0][0].webDoors?.map(d => d.key)).toEqual([potKey("w2p1", 1), potKey("w2p1", 2)])
    expect(reachOf(configs, { "web:w2p1#": 1 }).exitsReached.has("wizard_2#0")).toBe(false)
    expect(reachOf(configs, { "web:w2p1#": 2 }).exitsReached.has("wizard_2#0")).toBe(true)
  })

  it("agrees with the web walk on a sound web", () => {
    const { configs, placement } = placed("[w2p1]\nsand from 30%: 100% by sun\n[w1p1]\nlever sun @end")
    const solved = solveWeb(configs, ["sun"], WEB_REACHABILITY, undefined, resolveEncounterMeta)
    expect(webAgreement(placement.walked.closure, solved, ["sun"], ["w1p1", "w2p1", "w2p2"])).toEqual([])
  })

  it("reports a world where the web walk and the solver disagree", () => {
    const { configs, placement } = placed("[w2p1]\nsand from 30%: 100% by sun\n[w1p1]\nlever sun @end")
    // The activator taken off the floor the player walks: the walk still takes it, the solver cannot.
    configs.wizard_1[0][0].mainEndReward = undefined
    const solved = solveWeb(configs, ["sun"], WEB_REACHABILITY, undefined, resolveEncounterMeta)
    expect(webAgreement(placement.walked.closure, solved, ["sun"], ["w1p1", "w2p1", "w2p2"])).toEqual([
      "sun: the web walk takes it, the solver never reaches it on the carved floors",
      "w2p1: the web walk finishes it, the solver never reaches its way out",
      "w2p2: the web walk finishes it, the solver never reaches its way out",
    ])
  })

  it("refuses an activator behind a ward gate on the carved floors", () => {
    const { configs, placement } = placed("[w2p1]\nsand from 30%: 100% by sun\n[w1p1]\nlever sun @end")
    // The activator moved behind a ward the web never holds: the solver holds no key from outside the web.
    configs.wizard_1[0][0].mainEndReward = undefined
    configs.wizard_1[0][0].sideSections[0] = {
      ...configs.wizard_1[0][0].sideSections[0],
      gate: { type: "tomb-key", wardKeyId: "wizard_b_1" },
      endReward: webActivatorReward({ name: "sun", look: "lever", pots: ["w2p1"] }),
    }
    const solved = solveWeb(configs, ["sun"], WEB_REACHABILITY, undefined, resolveEncounterMeta)
    expect(solved.activators.has("sun")).toBe(false)
    expect(webAgreement(placement.walked.closure, solved, ["sun"], ["w1p1", "w2p1", "w2p2"])).toContain(
      "sun: the web walk takes it, the solver never reaches it on the carved floors"
    )
  })
})
