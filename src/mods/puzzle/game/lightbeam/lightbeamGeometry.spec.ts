import { describe, expect, it } from "vitest"
import { mulberry32 } from "@/game/random"
import {
  BACKSLASH,
  DIR,
  DIRECTIONS,
  isHalfStep,
  opposite,
  reflect,
  SLASH,
  SQUARE_DIRECTIONS,
  type LightbeamPuzzleData,
  type MovablePiece,
} from "./beam"
import {
  angleFor,
  axisOf,
  cutBendSlots,
  cutStops,
  drawOpening,
  halfStepTurns,
  openingIsHonest,
  perpendicular,
  pickSun,
  piecesAreSpaced,
  resistsGreedyPlay,
  stepsToEdge,
  trackRuns,
} from "./lightbeamGeometry"

const ODD_ANGLES = [1, 3, 5, 7]

describe("angleFor", () => {
  it("bends the beam the way it was asked to", () => {
    for (const enter of DIRECTIONS)
      for (const exit of DIRECTIONS) {
        const angle = angleFor(enter, exit)
        if (angle !== undefined) expect(reflect(angle, enter)).toBe(exit)
      }
  })

  it("refuses the two that are not bends and the two angles that offer square light no turn", () => {
    for (const enter of DIRECTIONS) {
      expect(angleFor(enter, enter)).toBeUndefined()
      expect(angleFor(enter, opposite(enter))).toBeUndefined()
      for (const exit of DIRECTIONS) expect(angleFor(enter, exit)).not.toBe(0)
      for (const exit of DIRECTIONS) expect(angleFor(enter, exit)).not.toBe(4)
    }
  })
})

describe("cutStops", () => {
  it("pairs a half-step with a diagonal, so the piece keeps a quarter turn", () => {
    for (const angle of ODD_ANGLES) {
      const stops = cutStops(angle)!
      expect(stops).toHaveLength(2)
      expect(stops).toContain(angle)
      expect(stops.some(stop => stop === SLASH || stop === BACKSLASH)).toBe(true)
      expect([...stops].sort((a, b) => a - b)).toEqual([...stops])
    }
  })

  it("has nothing to offer an even angle, which an ordinary mirror already serves", () => {
    for (const angle of [0, 2, 4, 6]) expect(cutStops(angle)).toBeUndefined()
  })
})

describe("cutBendSlots", () => {
  const random = mulberry32(7)

  it("spends an odd cut on the last bend, whose diagonal leg runs into the frame", () => {
    for (const cuts of [1, 3, 5]) {
      const slots = cutBendSlots(6, cuts, random)!
      expect(slots.has(5)).toBe(true)
    }
  })

  it("places every other cut as a consecutive pair — one out of the square, one back into it", () => {
    for (let draw = 0; draw < 50; draw++)
      for (let cuts = 0; cuts <= 6; cuts++) {
        // It places them greedily, so a crowded ask can come back empty-handed; what it does place is paired.
        const slots = cutBendSlots(6, cuts, random)
        if (!slots) continue
        expect(slots.size).toBe(cuts)
        const paired = [...slots].filter(slot => slot !== 5 || cuts % 2 === 0)
        for (const slot of paired) expect(paired.includes(slot - 1) || paired.includes(slot + 1)).toBe(true)
      }
  })

  it("cannot cut more bends than there are", () => {
    expect(cutBendSlots(3, 4, random)).toBeUndefined()
  })
})

describe("halfStepTurns", () => {
  it("are four genuine bends off a half-step mirror, all of the other parity", () => {
    for (const enter of DIRECTIONS) {
      const turns = halfStepTurns(enter)
      expect(turns).toHaveLength(4)
      for (const exit of turns) {
        expect(exit % 2).not.toBe(enter % 2)
        expect(isHalfStep(angleFor(enter, exit)!)).toBe(true)
      }
    }
  })
})

describe("perpendicular", () => {
  it("names the crossings from the axis, so a leg and its reverse get the same pair in the same order", () => {
    for (const direction of DIRECTIONS) expect(perpendicular(direction)).toEqual(perpendicular(opposite(direction)))
  })

  it("crosses the beam", () => {
    for (const direction of DIRECTIONS)
      for (const across of perpendicular(direction)) expect(axisOf(across)).not.toBe(axisOf(direction))
  })
})

describe("axisOf", () => {
  it("is the line, not the way along it: eight directions make four axes", () => {
    for (const direction of DIRECTIONS) expect(axisOf(direction)).toBe(axisOf(opposite(direction)))
    expect(new Set(DIRECTIONS.map(axisOf)).size).toBe(4)
  })
})

describe("trackRuns", () => {
  const at = { row: 4, col: 4 }

  it("gives a contiguous, collinear run of the length asked for, with the cell somewhere along it", () => {
    for (const across of SQUARE_DIRECTIONS)
      for (const length of [2, 3]) {
        const runs = trackRuns(at, across, length)
        expect(runs).toHaveLength(length)
        for (const run of runs) {
          expect(run).toHaveLength(length)
          expect(run).toContainEqual(at)
          const rows = new Set(run.map(cell => cell.row))
          const cols = new Set(run.map(cell => cell.col))
          expect(Math.min(rows.size, cols.size)).toBe(1)
          const along = [...(rows.size === 1 ? cols : rows)].sort((a, b) => a - b)
          expect(along[along.length - 1] - along[0]).toBe(length - 1)
        }
      }
  })
})

describe("stepsToEdge", () => {
  it("counts to the last cell still on the grid", () => {
    expect(stepsToEdge(9, { row: 4, col: 4 }, DIR.right)).toBe(4)
    expect(stepsToEdge(9, { row: 0, col: 4 }, DIR.up)).toBe(0)
    expect(stepsToEdge(9, { row: 6, col: 2 }, DIR.upLeft)).toBe(2)
  })
})

describe("pickSun", () => {
  it("sits on an edge facing inward, never in a corner, where the first leg has only one way to go", () => {
    const random = mulberry32(3)
    for (let draw = 0; draw < 200; draw++) {
      const sun = pickSun(9, random)
      const onEdge = [sun.at.row, sun.at.col].filter(index => index === 0 || index === 8)
      expect(onEdge).toHaveLength(1)
      expect(SQUARE_DIRECTIONS).toContain(sun.facing)
    }
  })
})

describe("piecesAreSpaced", () => {
  const mirror = (row: number, col: number): MovablePiece => ({
    kind: "turnMirror",
    at: { row, col },
    angles: [SLASH, BACKSLASH],
  })

  it("refuses two tappable pieces side by side, which cannot own separate hit areas", () => {
    expect(piecesAreSpaced(9, [mirror(1, 1), mirror(1, 2)], new Set())).toBe(false)
    expect(piecesAreSpaced(9, [mirror(1, 1), mirror(3, 3)], new Set())).toBe(true)
  })

  it("lets a door stand where it likes, having no tap target to protect", () => {
    expect(piecesAreSpaced(9, [mirror(1, 1), mirror(1, 2)], new Set([1]))).toBe(true)
  })
})

const board = (movable: MovablePiece[], shrine = { row: 0, col: 4 }): LightbeamPuzzleData => ({
  size: 9,
  sun: { at: { row: 8, col: 4 }, facing: DIR.up },
  shrine,
  fixed: [],
  movable,
})

/** A mirror the beam never reaches, so what it is set to cannot decide anything. */
const decoy: MovablePiece = { kind: "turnMirror", at: { row: 1, col: 1 }, angles: [SLASH, BACKSLASH] }

describe("openingIsHonest", () => {
  it("refuses a board that opens lit", () => {
    expect(openingIsHonest(board([]), [])).toBe(false)
  })

  it("refuses a board one tap finishes", () => {
    const turn: MovablePiece = { kind: "turnMirror", at: { row: 4, col: 4 }, angles: [BACKSLASH, SLASH] }
    expect(openingIsHonest(board([turn], { row: 4, col: 8 }), [0])).toBe(false)
  })

  it("refuses a board a uniform number of taps opens, however deep the deduction that accepted it", () => {
    const turn: MovablePiece = { kind: "turnMirror", at: { row: 4, col: 4 }, angles: [BACKSLASH, SLASH] }
    // Neither piece alone finishes it — the decoy does nothing — but one tap on each does.
    expect(openingIsHonest(board([turn, decoy], { row: 4, col: 8 }), [0, 0])).toBe(false)
  })
})

describe("resistsGreedyPlay", () => {
  it("refuses a board a run of getting-warmer taps finishes, however deep the deduction that accepted it", () => {
    const turn: MovablePiece = { kind: "turnMirror", at: { row: 4, col: 4 }, angles: [BACKSLASH, SLASH] }
    expect(resistsGreedyPlay(board([turn], { row: 4, col: 8 }), [0])).toBe(false)
  })

  it("accepts one where no tap leaves the light nearer", () => {
    expect(resistsGreedyPlay(board([decoy], { row: 0, col: 0 }), [0])).toBe(true)
  })
})

describe("drawOpening", () => {
  it("opens a door where it rests: it is not the player's to be wrong about", () => {
    const door = board([decoy, { kind: "turnMirror", at: { row: 6, col: 6 }, angles: [SLASH, BACKSLASH] }])
    door.wirings = [{ from: [0], piece: 1, to: 1 }]
    const random = mulberry32(11)
    const draws = Array.from({ length: 40 }, () => drawOpening(door, [0, 0], random))
    expect(draws.every(states => states[1] === 0)).toBe(true)
    expect(draws.some(states => states[0] !== 0)).toBe(true)
  })
})
