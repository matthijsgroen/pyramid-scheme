import { describe, expect, it } from "vitest"
import { cellAddress } from "@/game/cellAddress"
import { floorLock } from "@/game/floorLock"
import { walkFloorLock } from "@/game/floorLockWalk"
import { dousedConfig, reachableStates } from "@/game/lockWalk"
import { douseFloor, floorTorches, legalTargets, withDouse } from "@/game/mechanismDoors"
import { assembleFloor } from "@/game/siteAssembler"
import { dirsOf, TOPOLOGY_OFF } from "@/game/testSupport/modOff"
import { homeOf, TWO_TORCHES } from "@/game/testSupport/torchFloodFixtures"
import { PLAYGROUND_JOURNEY } from "./playgroundCarve"
import { carved } from "./torchFlood.testing"

describe("a torch on a floor", () => {
  const { grid } = carved(TWO_TORCHES)

  it("carries the region it stands in and one move, off to on, made where it stands", () => {
    const { at, cell } = homeOf(grid, "B")
    expect(cell.mechanism?.torch).toEqual({ region: "flood.hall" })
    expect(cell.mechanism?.placedOnly).toBe(true)
    expect(cell.mechanism?.transitions).toEqual([{ from: "off", to: "on", at }])
  })

  it("a torch that starts lit can still be lit from off, and a lit one offers nothing", () => {
    const record = homeOf(grid, "B").cell.mechanism!
    expect(record.initial).toBe("on")
    expect(legalTargets(record, "off")).toEqual(["on"])
    expect(legalTargets(record, "on")).toEqual([])
  })

  it("an activator's record carries no torch", () => {
    const { grid: keyFloor } = carved(
      "in -- hub -- hall\nhub -[K]- out\nhall -[S:a]\nS toggle @hub\nK activator @hall\nin ?\nhub ?\nhall ?\nout ?"
    )
    expect(homeOf(keyFloor, "K").cell.mechanism?.torch).toBeUndefined()
  })

  it("the floor's solver lists both torches, covered by the hall's barrier doors, and walks the floor sound", () => {
    const spec = floorLock(grid)!
    const hallDoors = new Set<string>()
    grid.cells.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell.type === "room" && cell.regionBarrier?.region === "flood.hall") hallDoors.add(`door ${r},${c}`)
      })
    )
    const hallGates = Object.keys(spec.gates)
      .filter(id => hallDoors.has(spec.gates[id].to))
      .sort()
    expect(hallGates.length).toBeGreaterThan(0)
    expect(spec.torches).toHaveLength(2)
    for (const { coveredBy } of spec.torches!) expect([...coveredBy].sort()).toEqual(hallGates)
    expect(walkFloorLock(grid)?.sound).toBe(true)
  })
})

describe("the floor's douse and the walk's", () => {
  const { grid } = carved(TWO_TORCHES)
  const spec = floorLock(grid)!
  const address = (id: string) => cellAddress(grid, 0, ...homeOf(grid, id).at)!
  const walkId = (id: string) => {
    const [r, c] = homeOf(grid, id).at
    return Object.keys(spec.mechanisms).find(m => m.endsWith(` ${r},${c}`))!
  }

  it("leave the same torch states after every move of the same sequence", () => {
    const found = reachableStates(spec)
    if (found === "tooLarge") throw new Error("too large")
    let config = found.order[0].config
    let states = new Map<string, string>()
    states = new Map([...states, ...douseFloor(grid, 0, states)])
    const torchStates = () => ({
      walk: [config[walkId("A")], config[walkId("B")]],
      play: ["A", "B"].map(id => states.get(address(id)) ?? homeOf(grid, id).cell.mechanism!.initial),
    })
    expect(torchStates().walk).toEqual(torchStates().play)
    for (const [id, to] of [
      ["S", "b"],
      ["S", "a"],
      ["A", "on"],
      ["B", "on"],
      ["S", "b"],
    ] as const) {
      config = dousedConfig(spec, { ...config, [walkId(id)]: to })
      states = new Map([...states, ...withDouse(grid, 0, states, new Map([[address(id), to]]))])
      expect(torchStates().walk, `${id} to ${to}`).toEqual(torchStates().play)
    }
    expect(torchStates().play).toEqual(["off", "off"])
  })

  it("lists every torch on the floor, and douses nothing while the hall is dry", () => {
    expect(
      floorTorches(grid, 0)
        .map(t => t.address)
        .sort()
    ).toEqual([address("A"), address("B")].sort())
    expect(douseFloor(grid, 0, new Map())).toEqual(new Map())
  })

  it("writes a move and the douse it causes together", () => {
    expect(withDouse(grid, 0, new Map(), new Map([[address("S"), "b"]]))).toEqual(
      new Map([
        [address("S"), "b"],
        [address("B"), "off"],
      ])
    )
  })
})

describe("the torch and the flood with the topology mod off", () => {
  const { config, seed, grid } = carved(TWO_TORCHES)

  it("carves the walls play carves, with no torch on the floor", () => {
    const off = assembleFloor(PLAYGROUND_JOURNEY, config, seed, TOPOLOGY_OFF.resolveEncounter, {
      floorRef: { journeyId: PLAYGROUND_JOURNEY, floorIndex: 0 },
      resolveOneWay: TOPOLOGY_OFF.resolveOneWay,
      resolveRegionBarrier: TOPOLOGY_OFF.resolveRegionBarrier,
      resolvePassage: TOPOLOGY_OFF.resolvePassage,
    })
    if (!off.success) throw new Error("the floor does not assemble at the carved seed with the mod off")
    expect(dirsOf(off.grid)).toBe(dirsOf(grid))
    expect(floorTorches(off.grid, 0)).toEqual([])
  })
})
