import { describe, expect, it } from "vitest"
import { assembleFloor } from "../game/siteAssembler"
import type { FloorConfig as GameFloorConfig, FloorGrid } from "../game/siteTypes"
import { potKey, resolveWeb, roomNode } from "../game/webLine"
import { parseWeb } from "../game/webNotation"
import { walkWeb } from "../game/webWalk"
import { resolveEncounterMeta } from "../mods/allFamilyMeta"
import { webActivatorReward } from "../mods/topology/game/web/activator"
import type { SiteConfig } from "./types"
import { placeWeb, readCarvedWorld } from "./webPlacement"
import { carvedVisit } from "./webVisit"
import { mainFloors } from "./webWorld"

const floorOf = (extra: Partial<GameFloorConfig> = {}): GameFloorConfig => ({
  pathPuzzles: 4,
  difficulty: "wizard",
  end: "treasure",
  exitOrStaircase: "exit",
  mainEndReward: { type: "fragmentSlot" },
  sideSections: [{ pathPuzzles: 1, difficulty: "wizard", end: "treasure", endReward: { type: "fragmentSlot" } }],
  ...extra,
})

const carve = (journeyId: string, levelNr: number, floorIndex: number, config: GameFloorConfig): FloorGrid => {
  const result = assembleFloor(journeyId, config, 1, resolveEncounterMeta, {
    floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex },
  })
  if (!result.success) throw new Error(`${journeyId} will not carve`)
  return result.grid
}

const pinned = (journeyId: string, levelNr: number): GameFloorConfig => {
  for (let n = 1; n <= 20; n++) {
    const config = floorOf({ seed: n * 7919 })
    if (
      assembleFloor(journeyId, config, 1, resolveEncounterMeta, {
        floorRef: { journeyId, levelIndex: levelNr - 1, floorIndex: 0 },
      }).success
    )
      return config
  }
  throw new Error("no seed carves the made-up floor")
}

const TEXT = "[w2p1]\nsand from 30%: 100% by sun\n[w1p1]\nlever sun @end"

describe("a visit read off the carved floors", () => {
  it("walks the floors with the web's doors laid, only the held keys arriving", () => {
    const configs: Record<string, SiteConfig[]> = {
      wizard_1: [[pinned("wizard_1", 1)]],
      wizard_2: [[pinned("wizard_2", 1)]],
    }
    placeWeb(parseWeb(TEXT), configs, carve, webActivatorReward)
    const read = readCarvedWorld(configs, carve)
    const resolved = resolveWeb(parseWeb(TEXT), read.world)
    const visit = carvedVisit(read, resolved, new Set([1, 2]))
    const W2 = { journey: 2, pyramid: 1 }

    const buried = visit(W2, new Set())!
    expect(buried.exit).toBe(false)
    expect(buried.reach.has(roomNode(0, 1))).toBe(true)
    expect(buried.reach.has(roomNode(0, 2))).toBe(false)
    expect([...buried.waitsOn]).toEqual([potKey("w2p1", 1)])
    expect([...buried.seen.values()]).toEqual([potKey("w2p1", 1)])

    const cleared = visit(W2, new Set([potKey("w2p1", 1)]))!
    expect(cleared.exit).toBe(true)
    expect(cleared.reach.has(roomNode(0, 4))).toBe(true)
    expect([...cleared.waitsOn]).toEqual([])

    const walked = walkWeb(resolved, { visit })
    expect(walked.refusals).toEqual([])
    expect(walked.closure).toMatchObject({ activators: ["sun"], finished: true })
  })
})

describe("the line of a pyramid", () => {
  it("climbs the floors up to the one its main path leaves by, never a wing", () => {
    const wing = floorOf({ entrance: { stairId: "p:wing" } })
    expect(
      mainFloors([
        floorOf({ exitOrStaircase: { stairId: "p:main" } }),
        floorOf({ entrance: { stairId: "p:main" } }),
        wing,
      ])
    ).toBe(2)
    expect(mainFloors([floorOf(), wing])).toBe(1)
  })
})
