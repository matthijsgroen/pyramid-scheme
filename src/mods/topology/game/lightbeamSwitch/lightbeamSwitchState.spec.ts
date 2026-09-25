import { beforeAll, describe, expect, it } from "vitest"
import type { ForkShape } from "@/game/forkShape"
import { BACKSLASH, SLASH, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { routesTo } from "../shrineBeam/shrineBeam"
import { generateLightbeamSwitch, type LightbeamSwitchBoard } from "./generateLightbeamSwitch"
import {
  createLightbeamSwitchState,
  isLightbeamSwitchSolved,
  litWayOut,
  turnSwitchMirror,
  type LightbeamSwitchState,
} from "./lightbeamSwitchState"

const SHAPES: ForkShape[] = ["adjacent", "opposite", "three"]
const WAYS_PER_SWEEP = 2 + 2 + 3

// Building the three boards is the whole cost of this file — the three-way one searches several dozen
// drafts — so it is paid once here rather than by whichever test runs first.
const boards = new Map<ForkShape, LightbeamSwitchBoard>()
beforeAll(() => {
  for (const shape of SHAPES) boards.set(shape, generateLightbeamSwitch(1, "junior", shape))
}, 60_000)

const boardFor = (shape: ForkShape): LightbeamSwitchBoard => {
  const board = boards.get(shape)
  if (!board) throw new Error(`no board was built for ${shape}`)
  return board
}

/** The board with one shrine's own route laid over it, which is what a player who solved it would leave. */
const routedTo = (board: LightbeamSwitchBoard, shrine: number): LightbeamSwitchState => {
  const routes = routesTo(
    board.grid,
    board.shrines.map(at => at.at),
    shrine
  )
  if (routes.length !== 1) throw new Error(`shrine ${shrine} owes ${routes.length} routes, not one`)
  const angles: MirrorAngle[] = [...board.grid.initial]
  for (const mirror of routes[0]) {
    const index = board.grid.mirrors.findIndex(at => at.row === mirror.at.row && at.col === mirror.at.col)
    if (index === -1) throw new Error("the route turns at a mirror the board does not hold")
    angles[index] = mirror.angle
  }
  return { angles }
}

describe("a switch board as the room opens it", () => {
  it("has no way out lit, so walking in decides nothing", () => {
    for (const shape of SHAPES) {
      const board = boardFor(shape)
      const state = createLightbeamSwitchState(board)
      expect(litWayOut(board, state), shape).toBeUndefined()
      expect(isLightbeamSwitchSolved(board, state), shape).toBe(false)
    }
  })

  it("takes its mirrors from the board rather than a copy that could drift", () => {
    for (const shape of SHAPES)
      expect(createLightbeamSwitchState(boardFor(shape)).angles).toEqual(boardFor(shape).grid.initial)
  })
})

describe("turning a mirror", () => {
  it("lies it the other way, and a second tap puts it back", () => {
    const board = boardFor("adjacent")
    const opened = createLightbeamSwitchState(board)
    const once = turnSwitchMirror(opened, 0)
    expect(once.angles[0]).toBe(opened.angles[0] === SLASH ? BACKSLASH : SLASH)
    expect(turnSwitchMirror(once, 0).angles).toEqual(opened.angles)
  })

  it("leaves every other mirror where it stood", () => {
    const board = boardFor("adjacent")
    const opened = createLightbeamSwitchState(board)
    const once = turnSwitchMirror(opened, 0)
    expect(once.angles.slice(1)).toEqual(opened.angles.slice(1))
  })
})

describe("the way out a routed board names", () => {
  it("is the bearing of the shrine the light rests in, for every way out of every shape", () => {
    let named = 0
    for (const shape of SHAPES) {
      const board = boardFor(shape)
      board.shrines.forEach((shrine, index) => {
        const state = routedTo(board, index)
        expect(litWayOut(board, state), `${shape} shrine ${index}`).toBe(shrine.canonicalDir)
        expect(isLightbeamSwitchSolved(board, state)).toBe(true)
        named++
      })
    }
    // Every way out of every shape was actually routed to — a sweep that found none would say nothing.
    expect(named).toBe(WAYS_PER_SWEEP)
  })

  // A way out stays open only while the board still says so: each shrine owes exactly one route, so a
  // mirror of that route lying the other way is a board that no longer names that way out.
  it("stops naming it the moment a mirror of its route is turned back", () => {
    let broken = 0
    for (const shape of SHAPES) {
      const board = boardFor(shape)
      board.shrines.forEach((shrine, index) => {
        const routed = routedTo(board, index)
        const opened = createLightbeamSwitchState(board)
        const turnedByTheRoute = routed.angles.findIndex((angle, mirror) => angle !== opened.angles[mirror])
        expect(turnedByTheRoute, `${shape} shrine ${index} routes without turning anything`).toBeGreaterThan(-1)
        expect(litWayOut(board, turnSwitchMirror(routed, turnedByTheRoute))).not.toBe(shrine.canonicalDir)
        broken++
      })
    }
    expect(broken).toBe(WAYS_PER_SWEEP)
  })
})
