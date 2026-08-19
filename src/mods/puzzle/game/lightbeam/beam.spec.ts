import { describe, expect, it } from "vitest"
import {
  BACKSLASH,
  cellKey,
  configGrid,
  DIR,
  DIRECTIONS,
  eachConfig,
  firedWirings,
  gridResolver,
  isCut,
  isHalfStep,
  opposite,
  pieceOptions,
  restingState,
  pieceOccupant,
  pieceStateCount,
  reflect,
  SLASH,
  stepCell,
  traceBeam,
  travelledDirections,
  TURN_ANGLES,
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
  sun: { at: { row: 0, col: 1 }, facing: DIR.down },
  shrine: { row: 1, col: 3 },
  fixed: [],
  movable: [{ kind: "turnMirror", at: { row: 1, col: 1 }, angles: TURN_ANGLES }],
}

describe("geometry", () => {
  it("steps one cell in each direction, diagonals on both axes at once", () => {
    expect(stepCell({ row: 2, col: 2 }, DIR.up)).toEqual({ row: 1, col: 2 })
    expect(stepCell({ row: 2, col: 2 }, DIR.right)).toEqual({ row: 2, col: 3 })
    expect(stepCell({ row: 2, col: 2 }, DIR.upRight)).toEqual({ row: 1, col: 3 })
    expect(stepCell({ row: 2, col: 2 }, DIR.downLeft)).toEqual({ row: 3, col: 1 })
  })

  it("turns the beam a quarter off either diagonal", () => {
    expect(reflect(SLASH, DIR.right)).toBe(DIR.up)
    expect(reflect(SLASH, DIR.down)).toBe(DIR.left)
    expect(reflect(BACKSLASH, DIR.right)).toBe(DIR.down)
    expect(reflect(BACKSLASH, DIR.up)).toBe(DIR.left)
  })

  /**
   * The two stop sets §11.8 rule 2 settles on, checked against the table it is written out in: a beam
   * arriving rightward leaves `{22.5°, 135°}` up-right or down, and `{45°, 157.5°}` up or down-right.
   * Each set keeps one quarter turn, which is the constraint that killed three earlier drafts, and
   * reaches one diagonal, which is the whole point of the piece.
   */
  it.each([
    { stops: [1, 6], exits: [DIR.upRight, DIR.down] },
    { stops: [2, 7], exits: [DIR.up, DIR.downRight] },
  ])("sends a rightward beam $exits from the stops $stops", ({ stops, exits }) => {
    expect(stops.map(angle => reflect(angle, DIR.right))).toEqual(exits)
    expect(stops.some(angle => reflect(angle, DIR.right) % 2 === 0)).toBe(true)
    expect(isCut(stops)).toBe(true)
  })

  // What the whole mechanic rests on: only an odd stop can change a beam between square and diagonal, so
  // a board with no half-step on it cannot carry diagonal light however its mirrors are set.
  it("changes a beam's parity exactly when the stop is a half-step", () => {
    for (const angle of [0, 1, 2, 3, 4, 5, 6, 7])
      for (const travel of DIRECTIONS) expect(reflect(angle, travel) % 2 !== travel % 2).toBe(isHalfStep(angle))
  })

  // §11.8 rule 3, and it costs no code: the sliding wall's "get out of the way" verb in one cell. A
  // mirror lies along the beam when its line is the beam's own — an angle of twice the direction, since
  // stops are counted in half the steps directions are.
  it("passes a beam straight through a mirror lying along it", () => {
    for (const travel of DIRECTIONS) expect(reflect((2 * travel) % 8, travel)).toBe(travel)
    // Which is direction-dependent, and that is the point: flat stone stops nothing coming along the row
    // and everything coming down the column.
    expect(reflect(0, DIR.right)).toBe(DIR.right)
    expect(reflect(0, DIR.down)).toBe(DIR.up)
  })

  // The backward walk leans on this: bouncing off the same mirror twice gives the direction back, so
  // tracing the beam in reverse can reuse the very same reflection rather than a second table to keep in
  // step. It has to hold for every stop now, not just the two diagonals.
  it("reflection is its own inverse", () => {
    for (const angle of [0, 1, 2, 3, 4, 5, 6, 7])
      for (const travel of DIRECTIONS) expect(reflect(angle, reflect(angle, travel))).toBe(travel)
  })

  it("knows which mirrors are cut, and it is the stop set that decides", () => {
    expect(isCut(TURN_ANGLES)).toBe(false)
    expect(isCut([1, 6])).toBe(true)
    // An aligned stop of a cut mirror is still a cut mirror — otherwise it changes species mid-rotation.
    expect(isCut([2, 7])).toBe(true)
    expect(isCut([0, 2])).toBe(true)
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
      sun: { at: { row: 0, col: 1 }, facing: DIR.down },
      shrine: { row: 3, col: 3 },
      fixed: [
        { kind: "mirror", at: { row: 2, col: 1 }, angle: BACKSLASH },
        { kind: "mirror", at: { row: 2, col: 2 }, angle: SLASH },
        { kind: "mirror", at: { row: 0, col: 2 }, angle: BACKSLASH },
      ],
      movable: [],
    }
    const walk = traceBeam(returning, [])
    expect(walk.end).toBe("absorbed")
    expect(walk.stopAt).toEqual({ row: 0, col: 1 })
  })
})

// ---------------------------------------------------------------------------------------------------
// Eight directions and the cut mirror (design doc §11.8, step 2 of its build order). The walk did not
// grow a second case for any of this: `reflect` is one subtraction modulo eight, `stepCell` reads a step
// off a table of eight, and everything below is what those two changes already do.
// ---------------------------------------------------------------------------------------------------

describe("a cut mirror on the board", () => {
  /**
   * The mechanic at its smallest. The disc shines rightward along the bottom row into a cut mirror
   * stopping at `{22.5°, 135°}`; the shallow stop sends the light up-right to a shrine two diagonal steps
   * away, and the steep one sends it straight down off the frame.
   *
   *     · · · · ·        S = sun (facing right)   X = the shrine
   *     · · · · ·        c = the cut mirror
   *     · · · · X
   *     · · · · ·
   *     S · c · ·
   */
  const diagonal: LightbeamPuzzleData = {
    size: 5,
    sun: { at: { row: 4, col: 0 }, facing: DIR.right },
    shrine: { row: 2, col: 4 },
    fixed: [],
    movable: [{ kind: "turnMirror", at: { row: 4, col: 2 }, angles: [1, 6] }],
  }

  it("lights a shrine no square beam could have reached", () => {
    const walk = traceBeam(diagonal, [0])
    expect(walk.end).toBe("lit")
    expect(walk.path.map(segment => segment.at)).toEqual([
      { row: 4, col: 1 },
      { row: 4, col: 2 },
      { row: 3, col: 3 },
      { row: 2, col: 4 },
    ])
  })

  it("keeps its quarter turn, which is what the other stop is for", () => {
    // 135° is the ordinary `\` turn: straight down, off the bottom of the frame.
    expect(traceBeam(diagonal, [1]).end).toBe("escapes")
  })

  /**
   * §11.8 rule 4: **a diagonal step resolves only the cell it lands in.** Stone at both cells the step
   * squeezes past does not stop it — the light slips through the corner, which is why the wall glyph is
   * drawn with rounded corners rather than the rule being written down anywhere.
   */
  it("slips between the corners of two walls", () => {
    const boxed: LightbeamPuzzleData = {
      ...diagonal,
      fixed: [
        { kind: "wall", at: { row: 3, col: 2 } },
        { kind: "wall", at: { row: 4, col: 3 } },
      ],
    }
    expect(traceBeam(boxed, [0]).end).toBe("lit")
  })

  it("still dies in stone standing where it lands", () => {
    const blocked: LightbeamPuzzleData = { ...diagonal, fixed: [{ kind: "wall", at: { row: 3, col: 3 } }] }
    const walk = traceBeam(blocked, [0])
    expect(walk.end).toBe("absorbed")
    expect(walk.stopAt).toEqual({ row: 3, col: 3 })
  })

  /**
   * §11.8 rule 3, on a board: a stop lying flat along the run the beam is on passes it, which is the
   * sliding wall's "get out of the way" verb in one cell instead of three. The other stop of the same
   * piece is an ordinary quarter turn, so this is one piece asking "through, or aside?".
   */
  it("passes the beam when its stop lies edge-on to it", () => {
    const edgeOn: LightbeamPuzzleData = {
      size: 5,
      sun: { at: { row: 2, col: 0 }, facing: DIR.right },
      shrine: { row: 2, col: 4 },
      fixed: [],
      movable: [{ kind: "turnMirror", at: { row: 2, col: 2 }, angles: [0, BACKSLASH] }],
    }
    expect(traceBeam(edgeOn, [0]).end).toBe("lit")
    expect(traceBeam(edgeOn, [1]).end).toBe("escapes")
  })

  /**
   * Which directions the board can even carry light in, which `exitRun` searches over. Reflection only
   * changes a beam between square and diagonal at a half-step stop, so a board with none is still a
   * four-direction board however many the walk knows — and the backward search over shrine entries stays
   * exactly as tight as it was before §11.8 instead of quietly weakening every board in the family.
   */
  it("counts eight ways for the beam to travel, and four when nothing can flip it", () => {
    expect(travelledDirections(board)).toEqual([DIR.right, DIR.up, DIR.left, DIR.down])
    expect(travelledDirections(diagonal)).toEqual([...DIRECTIONS])
  })
})

/**
 * **Retroreflection**, which eight directions make reachable and four never could: a beam meeting a
 * mirror square on its back comes straight down its own line. Up-right into a `\` is that case.
 *
 * It is not a loop, and that distinction is the whole reason the guard can stay a guard. The walk
 * remembers `(cell, direction)` pairs and the return trip travels the other way, so the beam retraces its
 * outward path, reaches the disc, and is absorbed there — which is what light does.
 */
describe("a beam sent back down its own line", () => {
  const backwards: LightbeamPuzzleData = {
    size: 5,
    sun: { at: { row: 4, col: 0 }, facing: DIR.right },
    shrine: { row: 0, col: 0 },
    fixed: [
      { kind: "mirror", at: { row: 4, col: 2 }, angle: 1 },
      { kind: "mirror", at: { row: 2, col: 4 }, angle: BACKSLASH },
    ],
    movable: [],
  }

  it("comes back to the disc rather than reading as a loop", () => {
    const walk = traceBeam(backwards, [])
    expect(walk.end).toBe("absorbed")
    expect(walk.stopAt).toEqual({ row: 4, col: 0 })
    // Out along the diagonal and back down it: (3,3) is crossed twice, once each way.
    expect(walk.path.filter(segment => cellKey(segment.at) === "3,3")).toHaveLength(2)
  })

  it("still stops a beam bouncing between two of them, started between the two", () => {
    const trapped: LightbeamPuzzleData = {
      ...backwards,
      fixed: [
        { kind: "mirror", at: { row: 4, col: 2 }, angle: BACKSLASH },
        { kind: "mirror", at: { row: 2, col: 4 }, angle: BACKSLASH },
      ],
    }
    const walk = walkForward(trapped.size, { row: 4, col: 2 }, DIR.upRight, gridResolver(configGrid(trapped, [])))
    expect(walk.end).toBe("loops")
  })
})

// A ring of four mirrors carries light round forever, and the walk has to stop rather than spin. What it
// cannot do is trap the beam the player is looking at: `reflect` maps (cell, direction) one-to-one at any
// angle, so every state has exactly one predecessor and the disc's very first state has none. A beam from
// the disc therefore walks a path and can never join a ring — the ring is only reachable by starting
// inside it.
//
// So loop detection here is a guard, not a game state, and eight directions did not change that: this
// used to say the first piece bending light by anything other than a quarter turn would make the guard
// load-bearing, and the cut mirror is that piece and did not. Injectivity, not the turn size, is what the
// argument rests on. The guard still earns its place — it is what keeps the walk total, and it is what
// catches the two-mirror bounce above.
describe("a ring of mirrors", () => {
  const ring: LightbeamPuzzleData = {
    size: 5,
    sun: { at: { row: 0, col: 0 }, facing: DIR.down },
    shrine: { row: 4, col: 4 },
    fixed: [
      { kind: "mirror", at: { row: 3, col: 3 }, angle: SLASH },
      { kind: "mirror", at: { row: 1, col: 3 }, angle: BACKSLASH },
      { kind: "mirror", at: { row: 1, col: 1 }, angle: SLASH },
      { kind: "mirror", at: { row: 3, col: 1 }, angle: BACKSLASH },
    ],
    movable: [],
  }

  it("stops the walk instead of spinning, for a beam started inside it", () => {
    const walk = walkForward(ring.size, { row: 3, col: 1 }, DIR.right, gridResolver(configGrid(ring, [])))
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
    expect(walkBackward(board.size, board.shrine, DIR.right, resolve).end).toBe("lit")
  })

  it("rules out a side nothing could have delivered the light from", () => {
    // The shrine sits on the right edge: light arriving leftwards would have had to come from outside.
    expect(walkBackward(board.size, board.shrine, DIR.left, resolve).end).toBe("escapes")
  })

  it("cannot be traced back into the disc's shadowed side", () => {
    // Disc halfway down the column shining down, shrine above it. Going backwards from the shrine
    // reaches the disc from the wrong side, and the disc only ever emits downwards — so light arriving
    // upwards at this shrine is not something the disc could have sent.
    const behind: LightbeamPuzzleData = {
      size: 4,
      sun: { at: { row: 2, col: 1 }, facing: DIR.down },
      shrine: { row: 0, col: 1 },
      fixed: [],
      movable: [],
    }
    expect(walkBackward(behind.size, behind.shrine, DIR.up, gridResolver(configGrid(behind, []))).end).toBe("absorbed")
  })

  it("agrees with the forward walk on which way round it goes", () => {
    const forward = traceBeam(board, [1])
    const last = forward.path[forward.path.length - 1]
    expect(opposite(last.enter)).toBe(DIR.left)
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

// ---------------------------------------------------------------------------------------------------
// Switch nodes (design doc §11.1). A socket is a transparent cell; crossing it fires every wiring whose
// sockets have all been crossed, and the pieces those wirings name move.
// ---------------------------------------------------------------------------------------------------

/**
 * Sun at (3,0) facing right. A turn mirror at (3,3) sends the light down through a socket at (5,3), a
 * fixed mirror at (6,3) turns it left, and a sliding wall sits across that run at (6,1) until the socket
 * moves it aside. The shrine is behind the wall.
 */
const doorBoard: LightbeamPuzzleData = {
  size: 8,
  sun: { at: { row: 3, col: 0 }, facing: DIR.right },
  shrine: { row: 6, col: 0 },
  fixed: [{ kind: "mirror", at: { row: 6, col: 3 }, angle: SLASH }],
  movable: [
    { kind: "turnMirror", at: { row: 3, col: 3 }, angles: TURN_ANGLES },
    {
      kind: "slidingWall",
      stops: [
        { row: 6, col: 1 },
        { row: 4, col: 1 },
      ],
    },
  ],
  nodes: [{ at: { row: 5, col: 3 } }],
  wirings: [{ from: [0], piece: 1, to: 1 }],
}

describe("a socket and its wiring", () => {
  it("opens the door the light reaches it through, in the same walk", () => {
    // The wall is at (6,1) in this configuration and the light still gets past it, because crossing the
    // socket at (5,3) moved it before the beam arrived.
    expect(traceBeam(doorBoard, [1, 0]).end).toBe("lit")
  })

  it("leaves the door shut when the light never reaches the socket", () => {
    // The other face sends the light up and off the frame, so the socket is never crossed.
    const walk = traceBeam(doorBoard, [0, 0])
    expect(walk.end).toBe("escapes")
    expect(walk.path.map(segment => cellKey(segment.at))).not.toContain("5,3")
  })

  it("is a pure function of the configuration, which is what keeps enumeration honest", () => {
    expect(traceBeam(doorBoard, [1, 0])).toEqual(traceBeam(doorBoard, [1, 0]))
  })

  // The player cannot open this door, and that is the point: a door a tap could open makes the socket
  // decoration. So the driven piece contributes one state to the space, not two.
  it("takes the driven piece out of the player's hands", () => {
    expect(pieceOptions(doorBoard, 1)).toEqual([0])
    expect(pieceOptions(doorBoard, 0)).toEqual([0, 1])
    expect(restingState(doorBoard, 1)).toBe(0)
    expect(restingState(doorBoard, 0)).toBeUndefined()
  })

  it("reports which wirings the light fired", () => {
    expect([...firedWirings(doorBoard, [1, 0])]).toEqual([0])
    expect([...firedWirings(doorBoard, [0, 0])]).toEqual([])
  })
})

describe("an and-wiring", () => {
  // The same board with a second socket at (4,3), one square earlier on the same run, and the wall now
  // needing both. Both sit on the run, so the light crosses them in order and the door still opens —
  // what changes is that it takes two crossings, which is a routing demand rather than a setting.
  const andBoard: LightbeamPuzzleData = {
    ...doorBoard,
    nodes: [{ at: { row: 5, col: 3 } }, { at: { row: 4, col: 3 } }],
    wirings: [{ from: [0, 1], piece: 1, to: 1 }],
  }

  it("opens once every one of its sockets has been crossed", () => {
    expect(traceBeam(andBoard, [1, 0]).end).toBe("lit")
  })

  it("stays shut when only one of them is", () => {
    // Only the first socket is required now, but the wiring names a second that nothing ever crosses.
    const halfBoard: LightbeamPuzzleData = {
      ...andBoard,
      nodes: [{ at: { row: 5, col: 3 } }, { at: { row: 0, col: 7 } }],
    }
    expect(traceBeam(halfBoard, [1, 0]).end).toBe("absorbed")
  })
})

describe("the walk stays total once sockets can move things", () => {
  // Loop detection has to forget what it saw whenever a wiring fires, or a legitimate second crossing of a
  // cell reads as a loop. This board sends the light through the socket and then back over the same run.
  it("does not call a re-crossing a loop", () => {
    const board: LightbeamPuzzleData = {
      size: 7,
      sun: { at: { row: 3, col: 0 }, facing: DIR.right },
      shrine: { row: 0, col: 4 },
      fixed: [{ kind: "mirror", at: { row: 3, col: 4 }, angle: SLASH }],
      movable: [
        {
          kind: "slidingWall",
          stops: [
            { row: 1, col: 4 },
            { row: 1, col: 6 },
          ],
        },
      ],
      nodes: [{ at: { row: 3, col: 2 } }],
      wirings: [{ from: [0], piece: 0, to: 1 }],
    }
    const walk = traceBeam(board, [0])
    expect(walk.end).toBe("lit")
  })
})
