import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import {
  allPieceOptions,
  BACKSLASH,
  cellKey,
  eachConfig,
  isHalfStep,
  isLit,
  reflect,
  pieceCells,
  pieceStateCount,
  restingState,
  SLASH,
  SQUARE_DIRECTIONS,
  stepCell,
  traceBeam,
  type MirrorAngle,
} from "./beam"
import { generateLightbeam, resistsGreedyPlay } from "./generateLightbeam"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { solveLightbeamByTechniques } from "./techniques"

/** Whether the winning beam ever leaves the rows and columns. */
const routeRunsDiagonally = (board: ReturnType<typeof generateLightbeam>) =>
  traceBeam(board, board.solution).path.some(segment => segment.enter % 2 === 1)

describe("generateLightbeam", () => {
  it("is deterministic", () => {
    expect(generateLightbeam(7, 42, { turns: 3 })).toEqual(generateLightbeam(7, 42, { turns: 3 }))
  })

  it("different seeds produce different boards", () => {
    expect(generateLightbeam(7, 1, { turns: 3 })).not.toEqual(generateLightbeam(7, 2, { turns: 3 }))
  })

  // Three movable pieces is the family's floor, and it falls out of the opening rules rather than being
  // chosen. On a two-piece board with two settings each, every opening is either already lit, one tap from
  // lit, or the same one tap on both — and that last is the exploit `openingIsHonest` exists to refuse. A
  // board too small to avoid it is a board that should not be built, so generation says so instead of
  // shipping one.
  it("refuses a two-piece board, which cannot open honestly", () => {
    expect(() => generateLightbeam(7, 1, { turns: 2 })).toThrow(/no logically solvable board/)
  })
})

describe.each(difficulties)("at %s", difficulty => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  const boards = Array.from({ length: 10 }, (_, seed) => generateLightbeam(size, seed + 1, options))

  // The other grid families stop at 7 wide because every cell there is tappable, so cell size IS tap-target
  // size. This family's ceiling is set by legibility instead: only the pieces are tappable and they never
  // touch, so a piece reaches into its empty shoulders for a 44px target (asserted at the foot of this file)
  // and the cell only has to stay big enough to read a mirror's diagonal in.
  it("stays inside the width a phone can draw legibly", () => {
    expect(size).toBeLessThanOrEqual(9)
  })

  it("its answer lights the shrine", () => {
    for (const board of boards) expect(isLit(board, board.solution)).toBe(true)
  })

  it("opens dark, so there is something to do", () => {
    for (const board of boards) expect(isLit(board, board.initial)).toBe(false)
  })

  it("opens more than one tap from done", () => {
    for (const board of boards)
      for (let piece = 0; piece < board.movable.length; piece++)
        for (let state = 0; state < pieceStateCount(board.movable[piece]); state++) {
          const oneTap = board.initial.map((held, index) => (index === piece ? state : held))
          expect(isLit(board, oneTap)).toBe(false)
        }
  })

  // The one that got away, and the reason the rest of this block exists.
  //
  // Boards used to open on `solution + 1` for every piece. Every piece had two settings, so "wrong" meant
  // "flipped" — and tapping every piece once solved every board in the game, all five tiers, every seed.
  // Nothing above noticed: the answer did light the shrine, the board did open dark, no single tap did
  // finish it, and the ladder did settle it. All true, and all beside the point.
  it("is not solved by tapping every piece once", () => {
    for (const board of boards) {
      const tapped = board.initial.map((state, index) => (state + 1) % pieceStateCount(board.movable[index]))
      expect(isLit(board, tapped)).toBe(false)
    }
  })

  // The general form of it. A bigger offset is not a fix — it only moves the exploit to "tap twice" — so
  // what has to hold is that the pieces are not all the same distance from their answers.
  it("is not solved by any uniform number of taps", () => {
    for (const board of boards) {
      const longest = Math.max(...board.movable.map(pieceStateCount))
      for (let taps = 1; taps < longest; taps++) {
        const tapped = board.initial.map((state, index) => (state + taps) % pieceStateCount(board.movable[index]))
        expect(isLit(board, tapped)).toBe(false)
      }
    }
  })

  // A stop the piece cannot slide to is a stop that has to be drawn as something else. Ghost pieces on a
  // broken line read as teleporting, not sliding, so a track is contiguous and collinear or it is not a
  // track — this is the drawing's half of the multi-stop bargain.
  it("gives every sliding piece a straight, unbroken track", () => {
    for (const board of boards)
      for (const piece of board.movable) {
        if (piece.kind === "turnMirror") continue
        const rows = new Set(piece.stops.map(stop => stop.row))
        const cols = new Set(piece.stops.map(stop => stop.col))
        expect(Math.min(rows.size, cols.size)).toBe(1)
        const along = rows.size === 1 ? piece.stops.map(s => s.col) : piece.stops.map(s => s.row)
        expect(Math.max(...along) - Math.min(...along)).toBe(piece.stops.length - 1)
      }
  })

  // What the ladder is *for*. A beam board's natural solving mode is trial — tap whichever piece leaves the
  // light nearer the shrine, repeat — and a board that yields to it has a decorative deduction however deep
  // the rungs it was accepted under. Starter is exempt on purpose: a three-piece board is meant to give way
  // to fiddling, and that is what makes a gentle first board rather than an empty one.
  it("does not give way to getting-warmer taps, from junior up", () => {
    if (!LIGHTBEAM_CONFIG[difficulty].fiddleProof) return
    for (const board of boards) expect(resistsGreedyPlay(board, board.initial)).toBe(true)
  })

  it("never needs a guess — every board settles inside its own technique cap", () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
  })

  // Gate 4, and the honest form of uniqueness for this family: a decoy has a free setting by definition,
  // so a board with decoys has many winning configurations. What may not be ambiguous is the route.
  // Over the states the PLAYER can reach, which is what uniqueness has to mean. Enumerating a door into a
  // position no tap can put it in finds routes nobody can take, and asserts a property the board was never
  // built to have.
  it("has exactly one winning route", () => {
    for (const board of boards) {
      const paths = new Set<string>()
      const states = allPieceOptions(board)
      eachConfig(states, config => {
        if (!isLit(board, config)) return
        paths.add(
          traceBeam(board, config)
            .path.map(segment => cellKey(segment.at))
            .join(" ")
        )
      })
      expect(paths.size).toBe(1)
    }
  })

  it("puts nothing on top of anything else", () => {
    for (const board of boards) {
      const claims = [
        cellKey(board.sun.at),
        cellKey(board.shrine),
        ...board.fixed.map(piece => cellKey(piece.at)),
        ...board.movable.flatMap(piece => pieceCells(piece).map(cellKey)),
      ]
      expect(new Set(claims).size).toBe(claims.length)
    }
  })

  it("keeps every piece on the board", () => {
    for (const board of boards)
      for (const piece of board.movable)
        for (const at of pieceCells(piece)) {
          expect(at.row).toBeGreaterThanOrEqual(0)
          expect(at.col).toBeGreaterThanOrEqual(0)
          expect(at.row).toBeLessThan(size)
          expect(at.col).toBeLessThan(size)
        }
  })

  it("sets the disc and the shrine in the frame, never adrift in the middle", () => {
    const onEdge = (row: number, col: number) => row === 0 || col === 0 || row === size - 1 || col === size - 1
    for (const board of boards) {
      expect(onEdge(board.sun.at.row, board.sun.at.col)).toBe(true)
      expect(onEdge(board.shrine.row, board.shrine.col)).toBe(true)
    }
  })

  it("gives the player something to tap", () => {
    for (const board of boards) expect(board.movable.length).toBeGreaterThan(0)
  })

  // Wall-thinning's own test. A wall the player cannot spend hides which obstacles the deduction turns
  // on, so every one left standing has to be load-bearing under this board's cap.
  it("shows no wall the player cannot spend", () => {
    for (const board of boards)
      for (const wall of board.fixed.filter(piece => piece.kind === "wall")) {
        const without = { ...board, fixed: board.fixed.filter(piece => piece !== wall) }
        const states = board.movable.map(piece => Array.from({ length: pieceStateCount(piece) }, (_, i) => i))
        const paths = new Set<string>()
        eachConfig(states, config => {
          if (isLit(without, config))
            paths.add(
              traceBeam(without, config)
                .path.map(segment => cellKey(segment.at))
                .join(" ")
            )
        })
        const stillAPuzzle = paths.size === 1 && solveLightbeamByTechniques(without, board.techniqueCap).settled
        expect(stillAPuzzle).toBe(false)
      }
  })
})

// The whole point of the technique cap is that it is what a board may DEMAND. Built plainly every board
// is a chain of `deadEnd` eliminations, so the tiers would differ only in size — the shadow pieces
// (generateLightbeam's `shadows`) are what make the higher rungs necessary rather than merely permitted.
describe("the tiers demand different reasoning", () => {
  const sweep = (difficulty: (typeof difficulties)[number]) => {
    const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
    return Array.from({ length: 16 }, (_, seed) => generateLightbeam(size, seed + 1, options))
  }

  const demanded = (difficulty: (typeof difficulties)[number]) => {
    const used = new Set<string>()
    for (const board of sweep(difficulty))
      for (const technique of solveLightbeamByTechniques(board, board.techniqueCap).used) used.add(technique)
    return used
  }

  // Footprint is only half of difficulty, but it may never go backwards: a junior board that is smaller
  // than a starter one is a tier table that reads right and plays wrong, which is exactly what the first
  // pass at this table did — and then what the first pass at the goal pool did again, by letting two goals
  // add four pieces on top of baselines that already carried some.
  //
  // Asserted in AGGREGATE over a tier rather than board by board: with goals drawn per board, one starter
  // grid can legitimately out-measure one junior grid. It is the tier that has to grow, not every board.
  it("never shrinks as the tiers go up", () => {
    const space = difficulties.map(difficulty =>
      sweep(difficulty).reduce(
        (total, board) => total + allPieceOptions(board).reduce((product, states) => product * states.length, 1),
        0
      )
    )
    for (let tier = 1; tier < space.length; tier++) expect(space[tier]).toBeGreaterThan(space[tier - 1])
  })

  it("asks a starter board for nothing but a visible dead end", () => {
    expect([...demanded("starter")].sort()).toEqual(["deadEnd", "entryRun", "exitRun"])
  })

  // Junior's one addition is a longer route, which buys legs and not forks (§6.3) — so it asks the same
  // reasoning as starter over further ground. The shrine-side elimination needs something unsettled
  // standing in a wrong ray, and that is expert's sliding piece.
  it("asks junior for the same rungs as starter, over a longer route", () => {
    expect([...demanded("junior")].sort()).toEqual(["deadEnd", "entryRun", "exitRun"])
  })

  it("reaches the shrine-side elimination by expert, where pieces start standing in wrong rays", () => {
    expect(demanded("expert")).toContain("feedsExit")
  })

  it("names an irrelevant piece from expert on, where the decoys start", () => {
    expect(demanded("expert")).toContain("neverReached")
  })

  // Every rung, the ordering fact included — wizard boards carry a door, so the light having to reach a
  // socket before it can reach anything past that door is part of every one of them.
  it("spends the whole ladder at wizard", () => {
    expect([...demanded("wizard")].sort()).toEqual([
      "deadEnd",
      "entryRun",
      "exitRun",
      "feedsExit",
      "neverReached",
      "onlySurvivor",
      "wiringFires",
    ])
  })

  // The vocabulary ladder (§6.4): each tier may only use what it has met. This is the gate that was
  // missing — a goal turns a dial, and three of the six dials add a PIECE rather than more of one, so
  // before this a starter board could draw a sliding wall and an expert board a door.
  it("never puts a piece on a board before its tier", () => {
    const kinds = (difficulty: (typeof difficulties)[number]) => {
      const seen = new Set<string>()
      for (const board of sweep(difficulty)) {
        for (const piece of board.movable) seen.add(piece.kind)
        if (board.nodes?.length) seen.add("socket")
        if (board.wirings?.length) seen.add("door")
        if (board.fixed.some(piece => piece.kind === "mirror")) seen.add("setMirror")
      }
      return seen
    }
    // Right angles only, and nothing that moves off its square.
    for (const tier of ["starter", "junior"] as const) expect([...kinds(tier)].sort()).toEqual(["turnMirror"])
    // Sliding pieces arrive, sockets and doors do not.
    for (const tier of ["expert", "master"] as const) {
      expect([...kinds(tier)].sort()).not.toContain("door")
      expect([...kinds(tier)].sort()).not.toContain("socket")
    }
    // Wizard is where the ordering fact lives, so it is the only tier carrying a door and its sockets.
    expect(kinds("wizard")).toContain("door")
    expect(kinds("wizard")).toContain("socket")
    // And the diagonal cut is master's, so no board below it ever leaves the rows and columns. This is the
    // half of the vocabulary rule `kinds` cannot see — a cut mirror is a `turnMirror` like any other, and
    // what makes it a new word is the stop set rather than the piece.
    for (const tier of ["starter", "junior", "expert"] as const)
      for (const board of sweep(tier)) expect(routeRunsDiagonally(board)).toBe(false)
    for (const tier of ["master", "wizard"] as const)
      for (const board of sweep(tier)) expect(routeRunsDiagonally(board)).toBe(true)
    // Sweeps every tier rather than one, so it needs more than the default budget.
  }, 30_000)
})

// The tap-accuracy rule, and what buys this family a grid wider than the other grid families allow. There,
// every cell is tappable, so cell size is tap-target size and 7 wide is a real ceiling. Here only the
// movable pieces are tappable and they are never allowed to touch, so a piece owns the empty shoulders
// around it and its hit area can be a thumb wide while its cell is smaller (LightbeamBoard spends that).
//
// Before this rule existed essentially every board broke it — up to ten touching pairs on one wizard grid.
describe("no two pieces the player can tap ever touch", () => {
  // The board is 318px inside a 360px encounter modal, measured; 5px of overflow each way is what the
  // movable cells carry.
  const BOARD_PX = 318
  const OVERFLOW_PX = 5
  const TAP_TARGET_PX = 44

  describe.each(difficulties)("at %s", difficulty => {
    const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
    const boards = Array.from({ length: 16 }, (_, seed) => generateLightbeam(size, seed + 1, options))

    // Doors are exempt, and that is the rule reading correctly rather than an exception to it: this is
    // about a thumb landing on the piece the player meant, and a door is not something anyone can mean.
    it("keeps every pair of tappable pieces at least a square apart", () => {
      for (const board of boards) {
        const owner = new Map<string, number>()
        board.movable.forEach((piece, index) => {
          if (restingState(board, index) !== undefined) return
          for (const at of pieceCells(piece)) owner.set(cellKey(at), index)
        })
        for (const [key, index] of owner) {
          const [row, col] = key.split(",").map(Number)
          for (const direction of SQUARE_DIRECTIONS) {
            const beside = stepCell({ row, col }, direction)
            expect(owner.get(cellKey(beside)) ?? index).toBe(index)
          }
        }
      }
    })

    it("still clears the 44px tap target once a piece reaches into its shoulders", () => {
      expect(BOARD_PX / size + 2 * OVERFLOW_PX).toBeGreaterThanOrEqual(TAP_TARGET_PX)
    })

    // The overflow may reach into empty squares, never into another target's.
    it("leaves no two tap targets overlapping", () => {
      expect(BOARD_PX / size + 2 * OVERFLOW_PX).toBeLessThanOrEqual(2 * (BOARD_PX / size))
    })
  })
})

// ---------------------------------------------------------------------------------------------------
// The cut mirror (design doc §11.8), and the route that bends diagonally at it — §11.8 rule 10 step 4,
// measured in §11.12. Rule 8's cost is spent as a swap rather than an extra piece: the bend would have
// carried an ordinary mirror anyway, and what changes is that its answer is a half-step.
// ---------------------------------------------------------------------------------------------------

/**
 * The bends the route turns **diagonally** at, with their answer and the way the beam arrived.
 *
 * Selected on the **answer** being a half-step rather than on `isCut(angles)`, and that distinction is the
 * whole of what §11.13 changed: once a list is authored per piece, an ordinary quarter-turn bend can carry a
 * half-step among its *other* stops, so `isCut` is true of pieces the route does not bend diagonally at all.
 * What `cutMirrors` counts is diagonal legs, which is a fact about the answer.
 */
const diagonalBends = (board: ReturnType<typeof generateLightbeam>) => {
  const entered = new Map(traceBeam(board, board.solution).path.map(segment => [cellKey(segment.at), segment.enter]))
  return board.movable.flatMap((piece, index) => {
    if (piece.kind !== "turnMirror") return []
    const answer = piece.angles[board.solution[index]]
    const enter = entered.get(cellKey(piece.at))
    if (enter === undefined || !isHalfStep(answer)) return []
    return [{ piece, index, enter, answer }]
  })
}

/** Every authored stop list on a board, in piece order. */
const stopLists = (board: ReturnType<typeof generateLightbeam>): readonly MirrorAngle[][] =>
  board.movable.flatMap(piece => (piece.kind === "turnMirror" ? [[...piece.angles]] : []))

/**
 * The turn mirrors the winning beam actually crosses — the ones whose setting is load-bearing.
 *
 * A decoy and a shadow are turn mirrors too, and their settings are **free by construction**: the light
 * never reaches them, which is what `neverReached` proves and why `routeIsUnique` checks the winning *path*
 * rather than the winning configuration. So any claim about "a wrong setting fails" is a claim about these.
 */
const routeMirrors = (board: ReturnType<typeof generateLightbeam>): number[] => {
  const crossed = new Set(traceBeam(board, board.solution).path.map(segment => cellKey(segment.at)))
  return board.movable.flatMap((piece, index) =>
    piece.kind === "turnMirror" && crossed.has(cellKey(piece.at)) ? [index] : []
  )
}

describe("the diagonal cut", () => {
  // §6.4's vocabulary ladder, and the gate the first three steps of §11.8 rule 10 lived behind: the piece
  // arrives at master, where the doc has always assigned it, and nowhere earlier.
  it("arrives at master and reaches no tier below it", () => {
    for (const difficulty of ["starter", "junior", "expert"] as const)
      expect(LIGHTBEAM_CONFIG[difficulty].cutMirrors ?? 0).toBe(0)
    for (const difficulty of ["master", "wizard"] as const) expect(LIGHTBEAM_CONFIG[difficulty].cutMirrors).toBe(1)
  })

  describe.each(difficulties)("at %s", difficulty => {
    const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
    const wanted = options.cutMirrors ?? 0
    const boards = Array.from({ length: 8 }, (_, seed) => generateLightbeam(size, seed + 1, options))

    it("turns the route diagonally at exactly as many bends as the dial asks for", () => {
      for (const board of boards) expect(diagonalBends(board)).toHaveLength(wanted)
    })

    // What step 4 is *for*. Every earlier step could only put diagonal light in a wrong setting; here the
    // winning beam itself leaves the rows and columns, which is the thing a player has to read.
    it("sends the winning beam off the rows and columns, or leaves it square", () => {
      for (const board of boards) expect(routeRunsDiagonally(board)).toBe(wanted > 0)
    })

    // §11.8 rule 2, the constraint that killed three earlier drafts: a stop set has to keep a quarter turn,
    // since every other piece and the route itself depend on a mirror cell being able to turn light 90°.
    // Asserted over EVERY list rather than only the diagonal bends, because once lists are authored per
    // piece (§11.13) this is the one thing none of them may lose.
    it("keeps a quarter turn in every authored list, however long", () => {
      for (const board of boards)
        for (const angles of stopLists(board)) {
          expect(angles.filter(angle => angle === SLASH || angle === BACKSLASH).length).toBeGreaterThanOrEqual(1)
          expect(new Set(angles).size).toBe(angles.length)
        }
    })

    it("puts the answer in the list, and the diagonal bend's answer is the half-step", () => {
      for (const board of boards) {
        board.movable.forEach((piece, index) => {
          if (piece.kind !== "turnMirror") return
          expect(piece.angles[board.solution[index]]).toBeDefined()
        })
        for (const { piece, answer } of diagonalBends(board)) {
          expect(piece.angles).toContain(answer)
          expect(isHalfStep(answer)).toBe(true)
        }
      }
    })

    // The answer bends the beam diagonally, so the route leaves the rows and columns there.
    it("sends the beam off the rows and columns at the bend it answers diagonally", () => {
      for (const board of boards)
        for (const { enter, answer } of diagonalBends(board)) expect(isHalfStep(reflect(answer, enter))).toBe(true)
    })

    // The property the whole of `blockWrongSettings` exists for, and the one a longer list has to keep: every
    // stop that is not the answer has to leave the shrine dark, however many of them there are.
    it("closes every wrong setting of every route mirror, whatever the fork's size", () => {
      for (const board of boards)
        for (const index of routeMirrors(board)) {
          const piece = board.movable[index]
          if (piece.kind !== "turnMirror") continue
          const answer = board.solution[index]
          expect(piece.angles.length).toBeGreaterThan(1)
          piece.angles.forEach((_, state) => {
            if (state === answer) return
            const wrong = [...board.solution]
            wrong[index] = state
            expect(isLit(board, wrong)).toBe(false)
          })
        }
    })

    it("still settles inside its tier's own cap", () => {
      for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
    })
  })

  // -------------------------------------------------------------------------------------------------
  // The fork, authored per piece (§11.8 rule 1, measured in §11.13). Rule 1 has asked for this since it was
  // written and the generator declined for the family's whole life: `[45°, 135°]` on 921 of 961 mirrors.
  // -------------------------------------------------------------------------------------------------

  it("gives the fork to wizard and to no tier below it", () => {
    for (const difficulty of ["starter", "junior", "expert", "master"] as const)
      expect(LIGHTBEAM_CONFIG[difficulty].mirrorStops ?? 2).toBe(2)
    expect(LIGHTBEAM_CONFIG.wizard.mirrorStops).toBe(3)
  })

  it("authors no more stops than the dial allows, on any tier", () => {
    for (const difficulty of difficulties) {
      const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
      const most = options.mirrorStops ?? 2
      for (let seed = 1; seed <= 6; seed++)
        for (const angles of stopLists(generateLightbeam(size, seed, options))) {
          expect(angles.length).toBeGreaterThanOrEqual(2)
          expect(angles.length).toBeLessThanOrEqual(most)
        }
    }
  })

  // The point of the dial, and the thing a count alone would not show: rule 1 asks for lists that DIFFER,
  // not merely for longer ones. Below wizard there is exactly one shape of ordinary fork; at wizard the
  // same nine mirrors offer many.
  it("draws forks that differ from each other, which is what rule 1 actually asks for", () => {
    const shapes = (difficulty: (typeof difficulties)[number]) => {
      const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
      const seen = new Set<string>()
      for (let seed = 1; seed <= 12; seed++)
        for (const angles of stopLists(generateLightbeam(size, seed, options))) seen.add(angles.join(","))
      return seen
    }
    expect(shapes("junior").size).toBe(1)
    expect(shapes("wizard").size).toBeGreaterThan(shapes("master").size)
  }, 30_000)

  // Two cuts is the excursion rather than the exit: out of the square on one bend and back on the next, so
  // the shrine is entered square again. No tier draws it — §11.5 forbids letting the *count* of cut mirrors
  // decide how many of them are flipping — but the geometry has to hold, because it is the shape §11.5's own
  // route-folding argument is written about.
  describe("a pair of cuts, out of the square and back", () => {
    const { size, ...options } = LIGHTBEAM_CONFIG.master
    const boards = Array.from({ length: 6 }, (_, seed) =>
      generateLightbeam(size, seed + 1, { ...options, cutMirrors: 2 })
    )

    it("builds, and runs diagonally in the middle rather than at the end", () => {
      for (const board of boards) {
        expect(diagonalBends(board)).toHaveLength(2)
        const path = traceBeam(board, board.solution).path
        expect(path.some(segment => segment.enter % 2 === 1)).toBe(true)
        // Back on the square by the time it arrives: an even number of half-step crossings (§11.5).
        expect(path[path.length - 1].enter % 2).toBe(0)
      }
    })

    it("settles without a guess", () => {
      for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
    })
  })
})
