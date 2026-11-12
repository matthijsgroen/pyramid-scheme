import { describe, expect, it } from "vitest"
import type { FloorGrid } from "@/game/siteTypes"
import { RELAID_FLOORS_VERSION } from "../SiteMap/relaidPyramids"
import { repairFloorExploration } from "../SiteMap/repairFloorExploration"
import { SAVE_EPOCH } from "../saveEpoch"
import { INITIAL_STORAGE_VERSIONS, MECHANISM_SLOT_VERSION } from "../state/useJourneys"
import { checkImport, expandSave, trimSave } from "./trimSave"

const journeyOf = (data: Record<string, unknown>) => (data.journeys as Record<string, unknown>[])[0]

const save = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  saveEpoch: SAVE_EPOCH,
  storageVersions: { ...INITIAL_STORAGE_VERSIONS },
  journeys: [
    {
      journeyId: "j1",
      exploredCells: {
        "1:a": ["0/~3", "0/p1", "0/~5", "0/~4", "0/xkey", "0/~9", "0/~2|3", "1/~4", "1/~5"],
        "2:b": ["0/~1"],
      },
      floorExploration: { "1:0": { open: true, keySets: [["k"]] }, "1:1": { open: false, keySets: [] } },
      floorExplorationVersion: 1,
      knownHiddenCorridors: ["0:a"],
      foundHiddenCorridors: ["0:b"],
      mechanismStates: { "0:m1": "on" },
      sequenceReads: { "0:m2": { steps: [1], read: true } },
      modState: { thing: { n: 1 } },
    },
  ],
  conversations: { hello: true },
  puzzleState: { board: [1, 2] },
  levelAnswers: { "0": [1] },
  ...extra,
})

const asSets = (cells: unknown) =>
  Object.fromEntries(
    Object.entries(cells as Record<string, string[]>).map(([section, keys]) => [section, new Set(keys)])
  )

describe("trimSave", () => {
  it("files a run of corridor cells as one range", () => {
    expect(new Set((journeyOf(trimSave(save())).exploredCells as Record<string, string[]>)["1:a"])).toEqual(
      new Set(["0/~3-5", "0/p1", "0/xkey", "0/~9", "0/~2|3", "1/~4-5"])
    )
  })

  it("gives back every walked cell once expanded", () => {
    const input = save()
    expect(asSets(journeyOf(expandSave(trimSave(input))).exploredCells)).toEqual(asSets(journeyOf(input).exploredCells))
  })

  it("asks the backfill to recompute floor summaries", () => {
    const journey = journeyOf(trimSave(save()))
    expect(Object.keys(journey.floorExploration as object)).toEqual(["1:0", "1:1"])
    expect(journey.floorExplorationVersion).toBe(0)
    expect(journey).not.toHaveProperty("knownHiddenCorridors")
  })

  it("gets one summary per floor back from the backfill", () => {
    const grid: FloorGrid = {
      cells: [
        [
          {
            type: "room",
            roomType: "portal",
            dirs: new Set(["e"]),
            state: "completed",
            sectionAddress: "a",
            ordinal: "0",
          },
          { type: "corridor", dirs: new Set(["w"]), state: "fogged", sectionAddress: "a", ordinal: "1" },
        ],
      ],
      rows: 1,
      cols: 2,
      entrancePos: [0, 0],
      exitPos: [0, 1],
      siteId: "made-up",
      staircases: {},
    }
    const journey = journeyOf(expandSave(trimSave(save())))
    const repaired = repairFloorExploration({ ...journey, levelNr: 1, completionCount: 0 }, () => grid)
    expect(Object.keys(repaired.floorExploration).sort()).toEqual(["1:0", "1:1"])
  })

  it("keeps what play cannot derive", () => {
    const input = save()
    const out = trimSave(input)
    const before = journeyOf(input)
    const after = journeyOf(out)
    for (const key of ["mechanismStates", "foundHiddenCorridors", "sequenceReads", "modState", "journeyId"])
      expect(after[key]).toEqual(before[key])
    expect(out.conversations).toEqual({ hello: true })
    expect(out.saveEpoch).toBe(SAVE_EPOCH)
  })

  it("drops the board in progress", () => {
    const out = trimSave(save())
    expect(out).not.toHaveProperty("puzzleState")
    expect(out).not.toHaveProperty("levelAnswers")
  })

  it("does not change its input", () => {
    const input = save()
    const copy = structuredClone(input)
    trimSave(input)
    expect(input).toEqual(copy)
  })
})

describe("checkImport", () => {
  it("refuses a save from another epoch", () => {
    expect(checkImport(save({ saveEpoch: SAVE_EPOCH + 1 }))).toEqual({ ok: false, reason: "otherEpoch" })
    expect(checkImport({})).toEqual({ ok: false, reason: "otherEpoch" })
  })

  it("refuses a save from a newer game", () => {
    const storageVersions = { ...INITIAL_STORAGE_VERSIONS, journeys: INITIAL_STORAGE_VERSIONS.journeys + 1 }
    expect(checkImport(save({ storageVersions }))).toEqual({ ok: false, reason: "newerGame" })
  })

  it.each([
    ["mechanismSlotVersion", MECHANISM_SLOT_VERSION + 1],
    ["relaidFloorsVersion", RELAID_FLOORS_VERSION + 1],
  ])("refuses a journey from a newer game: %s", (key, value) => {
    const data = save()
    journeyOf(data)[key] = value
    expect(checkImport(data)).toEqual({ ok: false, reason: "newerGame" })
  })

  it("accepts a journey from this game", () => {
    const data = save()
    Object.assign(journeyOf(data), {
      mechanismSlotVersion: MECHANISM_SLOT_VERSION,
      relaidFloorsVersion: RELAID_FLOORS_VERSION,
      floorExplorationVersion: 99,
    })
    expect(checkImport(data)).toEqual({ ok: true })
  })

  it("accepts an older storage version", () => {
    const storageVersions = { ...INITIAL_STORAGE_VERSIONS, journeys: INITIAL_STORAGE_VERSIONS.journeys - 1 }
    expect(checkImport(save({ storageVersions }))).toEqual({ ok: true })
  })
})
