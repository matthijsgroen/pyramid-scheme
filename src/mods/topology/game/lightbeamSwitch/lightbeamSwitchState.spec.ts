import { beforeAll, describe, expect, it } from "vitest"
import type { ForkShape } from "@/game/forkShape"
import { BACKSLASH, cellKey, SLASH, type MirrorAngle } from "@/mods/core/game/beam/physics"
import { routesTo } from "../shrineBeam/shrineBeam"
import { generateLightbeamSwitch, type LightbeamSwitchBoard } from "./generateLightbeamSwitch"
import {
  createLightbeamSwitchState,
  decodeLightbeamAngles,
  encodeLightbeamAngles,
  isLightbeamSwitchSolved,
  litWayOut,
  stateFitsBoard,
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

describe("a switch board reopened on a saved routing", () => {
  it("stands the player's own angles rather than the board's own initial ones", () => {
    for (const shape of SHAPES) {
      const board = boardFor(shape)
      const saved = routedTo(board, 0).angles
      expect(createLightbeamSwitchState(board, saved).angles, shape).toEqual(saved)
    }
  })

  it("falls back to the board's own initial angles for a record with the wrong mirror count", () => {
    const board = boardFor("adjacent")
    const wrongCount = [...board.grid.initial, ...board.grid.initial]
    expect(createLightbeamSwitchState(board, wrongCount).angles).toEqual(board.grid.initial)
  })

  it("falls back to the board's own initial angles for no saved record at all", () => {
    const board = boardFor("adjacent")
    expect(createLightbeamSwitchState(board, undefined).angles).toEqual(board.grid.initial)
  })
})

// The reported crash: a durable record survives a world regeneration that reshapes the board underneath
// it — same room, different board — and reaches `traceBeam` with an index its own array never reached.
// `stepCell` (src/mods/core/game/beam/physics.ts) then indexes its direction table by `NaN`
// (`reflect(undefined, travel)`), which is the "Cannot read properties of undefined (reading 'row')" the
// owner hit. A record the same LENGTH as the board it crashes on gets past the length check that guarded
// this restore before — length is not proof a record belongs to this board, only `stateFitsBoard` is.
describe("a record whose length only happens to match the board it crashes on", () => {
  it("still drives traceBeam off the grid when litWayOut is asked to trust it raw", () => {
    const board = boardFor("three")
    // A real route, so the touched index is one an honest trace can reach — this is not a hand-picked
    // impossible number, it is where the board's OWN geometry sends the beam.
    const routes = routesTo(
      board.grid,
      board.shrines.map(s => s.at),
      0
    )
    const touchedIndices = routes[0].map(mirror =>
      board.grid.mirrors.findIndex(at => cellKey(at) === cellKey(mirror.at))
    )
    const lastTouched = Math.max(...touchedIndices)
    // The real route's own angles, so the trace up to `lastTouched` is the one the board's own geometry
    // actually walks — same length as the board's own mirrors (the guard `createLightbeamSwitchState`
    // already had), but the mirror the beam turns at past `lastTouched` was never really written; the
    // token there was some OTHER build's own leftover value, not this board's, and it lands on
    // `lastTouched` after `.length` alone is asked to vouch for it.
    const angles: MirrorAngle[] = [...board.grid.initial]
    for (const mirror of routes[0]) {
      const index = board.grid.mirrors.findIndex(at => cellKey(at) === cellKey(mirror.at))
      angles[index] = mirror.angle
    }
    angles[lastTouched] = undefined as unknown as MirrorAngle
    expect(angles.length).toBe(board.grid.mirrors.length)
    expect(() => litWayOut(board, { angles })).toThrow(/reading 'row'/)
  })

  it("stateFitsBoard refuses it, so a caller never has to ask litWayOut to trust it", () => {
    const board = boardFor("three")
    const rightLength = board.grid.initial.map(() => SLASH)
    expect(stateFitsBoard(board, { angles: rightLength })).toBe(true)
    expect(stateFitsBoard(board, { angles: rightLength.slice(1) })).toBe(false)
    // Right length, impossible value — the gap `decodeLightbeamAngles` used to leave by checking only
    // `Number.isFinite`, and the one `createLightbeamSwitchState`'s length check alone never caught either.
    expect(stateFitsBoard(board, { angles: [0, ...rightLength.slice(1)] })).toBe(false)
  })

  it("createLightbeamSwitchState falls back rather than seed a state that could crash the trace", () => {
    const board = boardFor("three")
    const impossible = [0, ...board.grid.initial.slice(1)]
    expect(createLightbeamSwitchState(board, impossible).angles).toEqual(board.grid.initial)
  })
})

describe("encoding the player's own angles for the durable per-room record", () => {
  it("round-trips every angle, in order, for every shape", () => {
    for (const shape of SHAPES) {
      const board = boardFor(shape)
      const routed = routedTo(board, 0).angles
      expect(decodeLightbeamAngles(encodeLightbeamAngles(routed))).toEqual(routed)
    }
  })

  it("reads back undefined for a record that isn't a list of finite angles", () => {
    for (const bad of ["", "not-a-number", "2,not-a-number,6"]) expect(decodeLightbeamAngles(bad)).toBeUndefined()
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
