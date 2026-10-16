import { describe, expect, it } from "vitest"
import { floorLock } from "@/game/floorLock"
import { reachableStates, walkLock } from "@/game/lockWalk"
import { walkSpecOf } from "@/game/lockWalkSpec"
import { parseLock } from "@/game/lockNotation"
import { progressState } from "@/game/sequence"
import type { FloorGrid } from "@/game/siteTypes"
import { carvePlayground, defaultBinding, playgroundFloor } from "./playgroundCarve"
import "@/mods/registerModApps"

const carve = (text: string) => {
  const { lock } = parseLock(text)
  const found = carvePlayground(playgroundFloor(lock, defaultBinding()))
  if (!found.found) throw new Error(JSON.stringify(found.reasons))
  return { lock, grid: found.grid }
}

const verdicts = (text: string) => {
  const { lock, grid } = carve(text)
  return { lock: walkLock(walkSpecOf(lock)).sound, floor: walkLock(floorLock(grid)!).sound }
}

const tilesOf = (grid: FloorGrid) =>
  grid.cells.flatMap((row, r) =>
    row.flatMap((cell, c) => (cell.type === "room" && cell.sequenceTile ? [{ at: [r, c], ...cell.sequenceTile }] : []))
  )

const HUB =
  "in -- hub\nhub -- a\nhub -- b\nhub -[P]- out\nP sequence hub a b reset hub-out\nin ?\na ?\nb ?\nhub ?\nout ?"

describe("a sequence carved on the playground walks to the same verdict on the floor as in the lock", () => {
  it("sound, where each tile is walked to in its turn", () => {
    expect(verdicts("in -- a\nin -- b\nin -[P]- out\nP sequence a b reset in-out\nin ?\na ?\nb ?\nout ?")).toEqual({
      lock: true,
      floor: true,
    })
  })

  it("refused, where the way to the first tile crosses the second", () => {
    expect(
      verdicts("in -- mid\nmid -- far\nin -[P]- out\nP sequence far mid reset in-out\nin ?\nmid ?\nfar ?\nout ?")
    ).toEqual({ lock: false, floor: false })
  })

  it("sound, where a hub's step is walked first and every way into the hub carries its tile", () => {
    const { grid } = carve(HUB)
    const hub = tilesOf(grid).filter(tile => tile.step === 0)
    expect(new Set(hub.map(tile => tile.entrance))).toEqual(new Set(["lock.in", "lock.a", "lock.b", "lock.out"]))
    expect(verdicts(HUB)).toEqual({ lock: true, floor: true })
  })

  it("refused, where a hub stands between the way in and an earlier step, since leaving the hub steps on it", () => {
    expect(
      verdicts(
        "in -- hub\nhub -- a\nhub -- b\nhub -[P]- out\nP sequence a hub b reset hub-out\nin ?\na ?\nb ?\nhub ?\nout ?"
      )
    ).toEqual({ lock: false, floor: false })
  })

  it("steps on the way in's tile at the start: the lock on arrival, the floor on the first step off the entrance", () => {
    const text = "in -- a\nin -- b\nin -[P]- out\nP sequence in a b reset in-out\nin ?\na ?\nb ?\nout ?"
    const { lock, grid } = carve(text)
    const inLock = reachableStates(walkSpecOf(lock))
    const onFloor = reachableStates(floorLock(grid)!)
    if (inLock === "tooLarge" || onFloor === "tooLarge") throw new Error("too large")
    expect(inLock.order[0].config.P).toBe(progressState(1))
    const sequence = Object.keys(onFloor.order[0].config).find(id => onFloor.order[0].config[id] === progressState(0))!
    const start = onFloor.order[0].region
    const setOff = onFloor.edges[0].map(to => onFloor.order[to]).filter(state => state.region !== start)
    expect(setOff.length).toBeGreaterThan(0)
    for (const state of setOff) expect(state.config[sequence]).toBe(progressState(1))
    expect(verdicts(text)).toEqual({ lock: true, floor: true })
  })
})
