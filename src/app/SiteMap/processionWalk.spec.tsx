// @vitest-environment jsdom
import { act } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import type { FloorGrid } from "@/game/siteTypes"
import { cellAddress } from "@/game/cellAddress"
import { progressState } from "@/game/sequence"
import { lockFloor, PROCESSION_LOCK } from "@/game/testSupport/processionFixtures"
import {
  carveSequence,
  homeOf,
  JOURNEY,
  roomsOf,
  routesAreClean,
  sequenceHarness,
  tilesOf,
} from "./sequenceHarness.testing"
import "@/mods/registerModApps"

const CONFIG = lockFloor(PROCESSION_LOCK)
let carved: { seed: number; grid: FloorGrid }
beforeAll(() => {
  carved = carveSequence(CONFIG, routesAreClean)
}, 120_000)
afterEach(() => vi.useRealTimers())

const play = () => {
  vi.useFakeTimers()
  const h = sequenceHarness(carved.seed, CONFIG)
  const { grid } = carved
  const home = homeOf(grid)
  const address = cellAddress(grid, 0, home.at[0], home.at[1])!
  const door = roomsOf(grid).find(({ cell }) => cell.worksMechanism && !cell.sequenceTile)!
  const key = door.cell.requiredKeyId!
  return {
    h,
    tiles: tilesOf(grid),
    state: () => h.current().journeys.getMechanismStates(JOURNEY).get(address),
    open: () => h.current().openGateKeys.has(key),
    face: () => h.current().grid!.cells[door.at[0]][door.at[1]],
    // What the board does once solved: the read is written for the sequence its face names.
    solve: () => {
      act(() => h.current().journeys.readSequence(address))
      h.remount()
    },
    walkInOrder: (tiles: ReturnType<typeof tilesOf>) => tiles.forEach(({ at }) => h.walkTo(at)),
  }
}

describe("a procession door played", () => {
  it("unlocks a bar for every tile walked, out of order too, and shows no order on its face", () => {
    const { h, tiles, face } = play()
    for (const { at } of [...tiles].reverse()) h.walkTo(at)
    const door = face()
    expect(door.type === "room" && door.gateFace?.sequences?.[0].hidden?.walked).toEqual([true, true, true])
    expect(door.type === "room" && door.gateFace?.sequences?.[0].tiles.map(tile => tile.status)).toEqual([
      "unwalked",
      "unwalked",
      "unwalked",
    ])
  }, 60_000)

  it("opens once the tiles walked out of order are read and then walked in order", () => {
    const { h, tiles, state, open, solve, walkInOrder } = play()
    for (const { at } of [...tiles].reverse()) h.walkTo(at)
    expect(open()).toBe(false)
    solve()
    expect(state()).toBe(progressState(0))
    h.walkTo(h.current().grid!.entrancePos as [number, number])
    walkInOrder(tiles)
    expect(state()).toBe(progressState(tiles.length))
    expect(open()).toBe(true)
  }, 60_000)

  it("stays shut on a walk made in order before the read, until the order is walked again after it", () => {
    const { h, tiles, state, open, solve, walkInOrder } = play()
    walkInOrder(tiles)
    expect(state()).toBe(progressState(tiles.length))
    expect(open()).toBe(false)
    solve()
    expect(state()).toBe(progressState(0))
    expect(open()).toBe(false)
    h.walkTo(h.current().grid!.entrancePos as [number, number])
    walkInOrder(tiles)
    expect(open()).toBe(true)
  }, 60_000)
})
