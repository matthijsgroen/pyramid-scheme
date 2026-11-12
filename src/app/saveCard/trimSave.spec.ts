import { describe, expect, it } from "vitest"
import { SAVE_EPOCH } from "../saveEpoch"
import { INITIAL_STORAGE_VERSIONS } from "../state/useJourneys"
import { checkImport, trimSave } from "./trimSave"

const journeyOf = (data: Record<string, unknown>) => (data.journeys as Record<string, unknown>[])[0]

const save = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  saveEpoch: SAVE_EPOCH,
  storageVersions: { ...INITIAL_STORAGE_VERSIONS },
  journeys: [
    {
      journeyId: "j1",
      exploredCells: { "0:a": ["~3", "p1", "~4", "xkey"] },
      floorExploration: { "0:0": { open: true, keySets: [["k"]] } },
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

describe("trimSave", () => {
  it("drops corridor cells and keeps every place", () => {
    expect((journeyOf(trimSave(save())).exploredCells as Record<string, string[]>)["0:a"]).toEqual(["p1", "xkey"])
  })

  it("drops a section and the record when only corridors were walked", () => {
    const data = save({ journeys: [{ journeyId: "j", exploredCells: { "0:a": ["~1"] } }] })
    expect(journeyOf(trimSave(data))).not.toHaveProperty("exploredCells")
  })

  it("asks the backfill to recompute floor summaries", () => {
    const journey = journeyOf(trimSave(save()))
    expect(journey).not.toHaveProperty("floorExploration")
    expect(journey.floorExplorationVersion).toBe(0)
    expect(journey).not.toHaveProperty("knownHiddenCorridors")
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

  it("accepts an older storage version", () => {
    const storageVersions = { ...INITIAL_STORAGE_VERSIONS, journeys: INITIAL_STORAGE_VERSIONS.journeys - 1 }
    expect(checkImport(save({ storageVersions }))).toEqual({ ok: true })
  })
})
