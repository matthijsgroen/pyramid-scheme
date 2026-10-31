import { describe, it, expect, vi, beforeEach } from "vitest"
import { SAVE_EPOCH, settleSaveEpoch } from "./saveEpoch"

let save: Record<string, unknown> | Error
vi.mock("@/support/useGameStorage", () => ({
  readGameData: async () => {
    if (save instanceof Error) throw save
    return { ...save }
  },
  writeGameData: async (data: Record<string, unknown>) => {
    save = data
  },
}))

beforeEach(() => {
  save = {}
})

describe("settleSaveEpoch", () => {
  it("stamps a fresh save and announces nothing", async () => {
    expect(await settleSaveEpoch()).toBe(false)
    expect(save).toEqual({ saveEpoch: SAVE_EPOCH })
  })

  it("throws an older save away, keeping the tutorials choice, and says so", async () => {
    save = { journeys: [{ journeyId: "a" }], tutorialsEnabled: false }
    expect(await settleSaveEpoch()).toBe(true)
    expect(save).toEqual({ tutorialsEnabled: false, saveEpoch: SAVE_EPOCH })
  })

  it("keeps a save that already carries the epoch", async () => {
    save = { journeys: [{ journeyId: "a" }], saveEpoch: SAVE_EPOCH }
    expect(await settleSaveEpoch()).toBe(false)
    expect(save).toEqual({ journeys: [{ journeyId: "a" }], saveEpoch: SAVE_EPOCH })
  })

  it("leaves a save it cannot read alone", async () => {
    save = new Error("unreadable")
    expect(await settleSaveEpoch()).toBe(false)
    expect(save).toBeInstanceOf(Error)
  })

  it("does not announce a save that only held the tutorials choice", async () => {
    save = { tutorialsEnabled: false }
    expect(await settleSaveEpoch()).toBe(false)
    expect(save).toEqual({ tutorialsEnabled: false, saveEpoch: SAVE_EPOCH })
  })
})
