import { beforeAll, describe, expect, it } from "vitest"
import type { Difficulty } from "@/data/difficultyLevels"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { classifyForkShape, FORK_SHAPES, type ForkShape } from "@/game/forkShape"
import { assembleFloor } from "@/game/siteAssembler"
import type { Direction as WayOut, FloorConfig, RoomCell } from "@/game/siteTypes"
import type { CellRef } from "@/mods/core/game/beam/physics"
import type { LightbeamSwitchBoard } from "../../game/lightbeamSwitch/generateLightbeamSwitch"
import { QUARTER_TURNS, rotateBoard } from "../../game/lightbeamSwitch/rotateBoard"
import { buildSwitchBoard } from "./plugin"

const TIERS: Difficulty[] = ["junior", "expert", "master", "wizard"]
const SEED = 5
// The layouts a real carve makes, asserted rather than trusted: a hand-written list could name a fork the
// assembler never builds, and could miss one it does. These ten are every pair and every triple of the
// compass, so the sweep below faces a board at every layout a switch can ever stand in.
const CARVED_LAYOUTS = ["en", "ens", "enw", "es", "esw", "ew", "ns", "nsw", "nw", "sw"]

const switchFloor: FloorConfig = {
  pathPuzzles: 2,
  difficulty: "junior",
  end: "treasure",
  exitOrStaircase: "exit",
  sideSections: [
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
    { pathPuzzles: 1, difficulty: "starter", end: "treasure" },
  ],
  forks: [{ exits: 2, count: 1 }],
  switches: { encounter: "lightbeamSwitch", min: 1, max: 1 },
}

const layoutKey = (ways: readonly WayOut[]): string => [...new Set(ways)].sort().join("")

/** A carved switch: the ways out it shut, and the exits the room actually carries. */
type CarvedSwitch = { ways: WayOut[]; exits: RoomCell["exits"]; family?: string }

const carved = new Map<string, CarvedSwitch>()
const shapeOf = (ways: readonly WayOut[]): ForkShape => {
  const shape = classifyForkShape(ways)
  if (!shape) throw new Error(`the carved layout "${layoutKey(ways)}" has no shape to build a board for`)
  return shape
}

/** The edge of a board a way out points at, read off the compass and nothing else. */
const standsOnEdge = (size: number, at: CellRef, way: WayOut): boolean =>
  way === "n" ? at.row === 0 : way === "s" ? at.row === size - 1 : way === "e" ? at.col === size - 1 : at.col === 0

// Carving 120 floors and building a board per (layout, tier) is the whole cost of this file, paid once.
const built = new Map<string, LightbeamSwitchBoard>()
const canonical = new Map<string, LightbeamSwitchBoard>()
beforeAll(() => {
  for (let seed = 0; seed < 120; seed++) {
    const result = assembleFloor(`switch-board-${seed}`, switchFloor, seed, resolveEncounter, {
      floorRef: { journeyId: `switch-board-${seed}`, floorIndex: 0 },
    })
    if (!result.success) continue
    const forks = result.grid.cells.flat().filter((c): c is RoomCell => c.type === "room" && c.roomType === "fork")
    for (const fork of forks) {
      const ways = (fork.exits ?? []).filter(exit => exit.gateKeyId !== undefined).map(exit => exit.dir)
      if (ways.length < 2) continue
      carved.set(layoutKey(ways), { ways, exits: fork.exits, family: fork.family })
    }
  }
  // The same call the rooms below make, with no fork to face — so this is the shape's own board before
  // any turn, whether it came off the baked list or was searched for.
  for (const shape of FORK_SHAPES)
    for (const difficulty of TIERS)
      canonical.set(`${shape}:${difficulty}`, buildSwitchBoard(SEED, { difficulty, forkShape: shape }))
  for (const [layout, fork] of carved)
    for (const difficulty of TIERS)
      built.set(
        `${layout}:${difficulty}`,
        buildSwitchBoard(SEED, { difficulty, forkShape: shapeOf(fork.ways), exits: fork.exits })
      )
}, 180_000)

const boardFor = (layout: string, difficulty: Difficulty): LightbeamSwitchBoard => {
  const board = built.get(`${layout}:${difficulty}`)
  if (!board) throw new Error(`no board was built for ${layout} at ${difficulty}`)
  return board
}

describe("the carved forks this file builds boards for", () => {
  it("holds every layout the assembler makes and no layout it cannot", () => {
    expect([...carved.keys()].sort()).toEqual(CARVED_LAYOUTS)
  })

  it("is a fork the switch family is actually standing in", () => {
    expect([...carved.values()].map(fork => fork.family)).toEqual(CARVED_LAYOUTS.map(() => "lightbeamSwitch"))
  })
})

// A switch is walked back into to change its mind, so assembleFloor refuses a floor whose registered switch family
// closes behind the player. That refusal is the guard; this is the family passing it. The closing family is a
// registered one, since a family nobody registers is a bare junction and not a refusal.
const closesBehind: typeof resolveEncounter = (encounter, defaultTag) =>
  encounter === "sumplete"
    ? { familyId: "sumplete", tags: ["puzzle"], ownerMod: "puzzle" }
    : resolveEncounter(encounter, defaultTag)

describe("a floor standing this family in its fork", () => {
  it("assembles, where the same floor with a room that closes behind the player does not", () => {
    const assembled = assembleFloor("re-enterable", switchFloor, 0, resolveEncounter, {
      floorRef: { journeyId: "re-enterable", floorIndex: 0 },
    })
    expect(assembled.success).toBe(true)
    const sealed = assembleFloor(
      "re-enterable",
      { ...switchFloor, switches: { encounter: "sumplete", min: 1, max: 1 } },
      0,
      closesBehind,
      { floorRef: { journeyId: "re-enterable", floorIndex: 0 } }
    )
    expect(sealed.success === false && sealed.reasons.map(reason => reason.type)).toEqual([
      "switchFamilyNotReEnterable",
    ])
  })
})

describe("the board a switch room is dealt", () => {
  it("carries one shrine per way out the fork shut, at that way out's own bearing", () => {
    let faced = 0
    for (const [layout, fork] of carved)
      for (const difficulty of TIERS) {
        const board = boardFor(layout, difficulty)
        expect(board.shrines.map(shrine => shrine.canonicalDir).sort()).toEqual([...fork.ways].sort())
        for (const shrine of board.shrines)
          expect(standsOnEdge(board.grid.size, shrine.at, shrine.canonicalDir), `${layout} ${difficulty}`).toBe(true)
        faced++
      }
    expect(faced).toBe(CARVED_LAYOUTS.length * TIERS.length)
  })

  /**
   * THE SEED CONTRACT. A board is generated for the SHAPE of a fork and turned afterwards, so the four
   * compass layouts of one shape are one board laid down four ways — which is what lets an offline list
   * hold an entry per (shape, tier, seed) rather than per bearing. A generator handed anything about the
   * compass would answer a different board here, and no turn of the canonical one would match it.
   */
  it("is the one canonical board of its shape and tier, turned — never a board built per bearing", () => {
    let matched = 0
    for (const [layout, fork] of carved)
      for (const difficulty of TIERS) {
        const shape = shapeOf(fork.ways)
        const source = canonical.get(`${shape}:${difficulty}`)!
        const board = boardFor(layout, difficulty)
        const turns = QUARTER_TURNS.filter(quarterTurns => {
          const laid = rotateBoard(source, quarterTurns)
          return JSON.stringify(laid) === JSON.stringify(board)
        })
        expect(turns.length, `${layout} at ${difficulty} is no turn of its shape's board`).toBeGreaterThan(0)
        matched++
      }
    expect(matched).toBe(CARVED_LAYOUTS.length * TIERS.length)
  })

  // A fork must draw the same board every time it is walked into. The order its exits arrive in is the
  // carve's business, and a facing pair answers to two turns — so both have to settle the same way.
  it("lays one fork's board down the same way on every visit", () => {
    let compared = 0
    for (const [layout, fork] of carved) {
      const again = buildSwitchBoard(SEED, {
        difficulty: "junior",
        forkShape: shapeOf(fork.ways),
        exits: [...(fork.exits ?? [])].reverse(),
      })
      expect(again).toEqual(boardFor(layout, "junior"))
      compared++
    }
    expect(compared).toBe(CARVED_LAYOUTS.length)
  })
})
