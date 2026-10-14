import { describe, expect, it } from "vitest"
import { freshState, plainFloor, prepOf } from "./carveFixtures"
import { standSwitches } from "./standSwitches"
import type { FloorPrep } from "./state"

describe("standSwitches", () => {
  const plain = prepOf(plainFloor({ difficulty: "junior" }))
  const withSwitches = (switches?: { encounter: string; min: number; max: number }): FloorPrep => ({
    ...plain,
    config: { ...plain.config, config: { ...plain.config.config, ...(switches ? { switches } : {}) } },
  })
  const stood = (prep: FloorPrep, switchesPlaced: number) => {
    const state = {
      ...freshState(prep),
      forks: { reserved: ["0,2", "4,2"], inFork: new Set<string>(), switchesPlaced },
    }
    standSwitches.run(prep, state)
    return state.switchRooms!
  }

  it("stands the switch's encounter in each junction it fills, named by its index and dressed as the floor", () => {
    const rooms = stood(withSwitches({ encounter: "sumplete", min: 1, max: 1 }), 1)
    expect([...rooms.keys()]).toEqual(["0,2"])
    expect(rooms.get("0,2")).toMatchObject({ family: "sumplete", mechanismId: "switch:0", difficulty: "junior" })
    expect(rooms.get("0,2")?.boardIndex).toEqual(expect.any(Number))
  })

  it("stands nothing where the floor authors no switch", () => {
    expect(stood(withSwitches(), 0)).toEqual(new Map())
  })
})
