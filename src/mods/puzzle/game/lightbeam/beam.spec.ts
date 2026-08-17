import { describe, expect, it } from "vitest"
import {
  configGrid,
  eachConfig,
  gridResolver,
  opposite,
  pieceOccupant,
  pieceStateCount,
  reflect,
  stepCell,
  traceBeam,
  walkBackward,
  walkForward,
  type LightbeamPuzzleData,
  type MovablePiece,
} from "./beam"

// A 4x4 board: the disc on the top edge shining down, one mirror bending the beam right, the shrine
// waiting on the right edge of that row.
//
//     · S · ·        S = sun (facing down)
//     · / · X        / = the mirror,  X = the shrine
//     · · · ·
//     · · · ·
const board: LightbeamPuzzleData = {
  size: 4,
  sun: { at: { row: 0, col: 1 }, facing: "down" },
  shrine: { row: 1, col: 3 },
  fixed: [],
  movable: [{ kind: "turnMirror", at: { row: 1, col: 1 }, faces: ["/", "\\"] }],
}

describe("geometry", () => {
  it("steps one cell in each direction", () => {
    expect(stepCell({ row: 2, col: 2 }, "up")).toEqual({ row: 1, col: 2 })
    expect(stepCell({ row: 2, col: 2 }, "right")).toEqual({ row: 2, col: 3 })
  })

  it("turns the beam a quarter off either diagonal", () => {
    expect(reflect("/", "right")).toBe("up")
    expect(reflect("/", "down")).toBe("left")
    expect(reflect("\\", "right")).toBe("down")
    expect(reflect("\\", "up")).toBe("left")
  })

  // The backward walk leans on this: bouncing the same face twice gives the direction back, so tracing
  // the beam in reverse can reuse the very same reflection rather than a second table to keep in step.
  it("reflection is its own inverse", () => {
    for (const face of ["/", "\\"] as const)
      for (const travel of ["up", "down", "left", "right"] as const)
        expect(reflect(face, reflect(face, travel))).toBe(travel)
  })

  it("counts a piece's states and where each one puts it", () => {
    const sliding: MovablePiece = {
      kind: "slidingWall",
      stops: [
        { row: 0, col: 0 },
        { row: 0, col: 2 },
      ],
    }
    expect(pieceStateCount(sliding)).toBe(2)
    expect(pieceOccupant(sliding, 1)).toEqual({ at: { row: 0, col: 2 }, blocks: { kind: "wall" } })
  })
})

describe("traceBeam", () => {
  it("lights the shrine when the mirror faces the right way", () => {
    const walk = traceBeam(board, [1]) // "\\" turns the beam down-then-right
    expect(walk.end).toBe("lit")
    expect(walk.path.map(segment => segment.at)).toEqual([
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 1, col: 3 },
    ])
  })

  it("runs off the frame when it faces the other way", () => {
    expect(traceBeam(board, [0]).end).toBe("escapes")
  })

  it("dies where a wall stands", () => {
    const walled = { ...board, fixed: [{ kind: "wall" as const, at: { row: 1, col: 2 } }] }
    const walk = traceBeam(walled, [1])
    expect(walk.end).toBe("absorbed")
    expect(walk.stopAt).toEqual({ row: 1, col: 2 })
  })

  it("the disc absorbs light that comes back at it", () => {
    const returning: LightbeamPuzzleData = {
      size: 4,
      sun: { at: { row: 0, col: 1 }, facing: "down" },
      shrine: { row: 3, col: 3 },
      fixed: [
        { kind: "mirror", at: { row: 2, col: 1 }, face: "\\" },
        { kind: "mirror", at: { row: 2, col: 2 }, face: "/" },
        { kind: "mirror", at: { row: 0, col: 2 }, face: "\\" },
      ],
      movable: [],
    }
    const walk = traceBeam(returning, [])
    expect(walk.end).toBe("absorbed")
    expect(walk.stopAt).toEqual({ row: 0, col: 1 })
  })
})

// A ring of four mirrors carries light round forever, and the walk has to stop rather than spin. What it
// cannot do is trap the beam the player is looking at: a 90° mirror maps (cell, direction) one-to-one, so
// every state has exactly one predecessor, and the disc's very first state has none. A beam from the disc
// therefore walks a path and can never join a ring — the ring is only reachable by starting inside it.
//
// So loop detection here is a guard, not a game state. It earns its place all the same: it is what keeps
// the walk total, and the first piece that bends light by anything other than a quarter turn (the
// deferred prism, §11) breaks the one-to-one and makes it load-bearing.
describe("a ring of mirrors", () => {
  const ring: LightbeamPuzzleData = {
    size: 5,
    sun: { at: { row: 0, col: 0 }, facing: "down" },
    shrine: { row: 4, col: 4 },
    fixed: [
      { kind: "mirror", at: { row: 3, col: 3 }, face: "/" },
      { kind: "mirror", at: { row: 1, col: 3 }, face: "\\" },
      { kind: "mirror", at: { row: 1, col: 1 }, face: "/" },
      { kind: "mirror", at: { row: 3, col: 1 }, face: "\\" },
    ],
    movable: [],
  }

  it("stops the walk instead of spinning, for a beam started inside it", () => {
    const walk = walkForward(ring.size, { row: 3, col: 1 }, "right", gridResolver(configGrid(ring, [])))
    expect(walk.end).toBe("loops")
  })

  it("never catches the beam the disc actually sends", () => {
    expect(traceBeam(ring, []).end).not.toBe("loops")
  })
})

describe("walkBackward", () => {
  const resolve = gridResolver(configGrid(board, [1]))

  it("finds the disc when it traces the winning route in reverse", () => {
    // The beam arrives at the shrine travelling right, so backwards is leftwards along that row.
    expect(walkBackward(board.size, board.shrine, "right", resolve).end).toBe("lit")
  })

  it("rules out a side nothing could have delivered the light from", () => {
    // The shrine sits on the right edge: light arriving leftwards would have had to come from outside.
    expect(walkBackward(board.size, board.shrine, "left", resolve).end).toBe("escapes")
  })

  it("cannot be traced back into the disc's shadowed side", () => {
    // Disc halfway down the column shining down, shrine above it. Going backwards from the shrine
    // reaches the disc from the wrong side, and the disc only ever emits downwards — so light arriving
    // upwards at this shrine is not something the disc could have sent.
    const behind: LightbeamPuzzleData = {
      size: 4,
      sun: { at: { row: 2, col: 1 }, facing: "down" },
      shrine: { row: 0, col: 1 },
      fixed: [],
      movable: [],
    }
    expect(walkBackward(behind.size, behind.shrine, "up", gridResolver(configGrid(behind, []))).end).toBe("absorbed")
  })

  it("agrees with the forward walk on which way round it goes", () => {
    const forward = traceBeam(board, [1])
    const last = forward.path[forward.path.length - 1]
    expect(opposite(last.enter)).toBe("left")
    expect(walkBackward(board.size, board.shrine, last.enter, resolve).end).toBe("lit")
  })
})

describe("eachConfig", () => {
  it("visits every combination once", () => {
    const seen: number[][] = []
    expect(
      eachConfig(
        [
          [0, 1],
          [0, 1, 2],
        ],
        config => seen.push([...config])
      )
    ).toBe(true)
    expect(seen).toHaveLength(6)
    expect(new Set(seen.map(String)).size).toBe(6)
  })

  it("refuses a space bigger than the caller will pay for", () => {
    let visits = 0
    expect(
      eachConfig(
        [
          [0, 1],
          [0, 1],
        ],
        () => visits++,
        3
      )
    ).toBe(false)
    expect(visits).toBe(0)
  })
})
