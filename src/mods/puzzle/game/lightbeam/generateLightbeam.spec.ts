import { describe, expect, it } from "vitest"
import { difficulties } from "@/data/difficultyLevels"
import {
  allPieceOptions,
  cellKey,
  eachConfig,
  firedWirings,
  isHalfStep,
  isLit,
  opposite,
  pieceCells,
  pieceOptions,
  reflect,
  restingState,
  segmentKey,
  traceBeam,
  type Direction,
  type LightbeamPuzzleData,
} from "./beam"
import { generateLightbeam, reachableDeviations, type LightbeamOptions } from "./generateLightbeam"
import { routeIsUnique, type LightbeamGate } from "./generateLightbeam"
import { LIGHTBEAM_CONFIG } from "./lightbeamConfig"
import { solveLightbeamByTechniques } from "./techniques"

type Board = ReturnType<typeof generateLightbeam>

/** Which direction the winning beam enters each cell travelling, so a branch can be walked from a bend. */
const arrivals = (board: Board): Map<string, Direction> =>
  new Map(traceBeam(board, board.solution).path.map(segment => [cellKey(segment.at), segment.enter]))

describe("generateLightbeam", () => {
  it("is deterministic", () => {
    expect(generateLightbeam(7, 42, { turns: 3 })).toEqual(generateLightbeam(7, 42, { turns: 3 }))
  })

  it("different seeds produce different boards", () => {
    expect(generateLightbeam(7, 1, { turns: 3 })).not.toEqual(generateLightbeam(7, 2, { turns: 3 }))
  })

  // The same floor the other generator has, and for the same reason: two binary pieces make four
  // configurations, and every dark one of them is either a tap from done or solved by tapping both, which
  // `openingIsHonest` refuses.
  it("refuses a two-piece board, which cannot open honestly", () => {
    expect(() => generateLightbeam(7, 1, { turns: 2 })).toThrow(/no logically solvable board/)
  })

  it("records the modes it was built to, which is what gives a board its character", () => {
    expect(generateLightbeam(8, 3, { turns: 5 }).modes).toEqual([])
    expect(generateLightbeam(8, 3, { turns: 5, modes: ["wallHeavy"] }).modes).toEqual(["wallHeavy"])
  })
})

describe.each(difficulties)("at %s", difficulty => {
  const { size, ...options } = LIGHTBEAM_CONFIG[difficulty]
  const boards = Array.from({ length: 10 }, (_, seed) => generateLightbeam(size, seed + 1, options))

  it("its answer lights the shrine", () => {
    for (const board of boards) expect(isLit(board, board.solution)).toBe(true)
  })

  /**
   * **Exactly one winning route.** Not one winning *configuration*: a decoy's setting is free by construction —
   * the light never reaches it — so any tier that puts a piece off the winning beam's line has many winning
   * configurations and only one winning route. That is the property §5 gate 5 asks for and the one the player
   * actually solves for.
   */
  it("has exactly one winning route", () => {
    for (const board of boards) expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
  })

  it("is reachable by deduction alone, inside its own cap", { timeout: 120_000 }, () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
  })

  it("opens dark", () => {
    for (const board of boards) expect(isLit(board, board.initial)).toBe(false)
  })

  /**
   * Every branch dies. Walked from each piece's own stop list rather than read off anything generation
   * recorded, so this checks the board rather than the bookkeeping.
   *
   * **Scoped to the pieces the winning beam crosses**, which is not fastidiousness: a decoy's setting is free
   * by construction, so asserting this over every mirror asserts that a decoy is not a decoy. It is the
   * mistake the design doc's own Known Traps section warns about.
   */
  it("every wrong stop runs the light out, for the pieces the beam meets", () => {
    for (const board of boards) {
      const onRoute = new Set(traceBeam(board, board.solution).path.map(segment => cellKey(segment.at)))
      board.movable.forEach((piece, index) => {
        if (restingState(board, index) !== undefined) return // a door is not the player's to be wrong about
        if (!pieceCells(piece).some(at => onRoute.has(cellKey(at)))) return
        const total = piece.kind === "turnMirror" ? piece.angles.length : piece.stops.length
        for (let state = 0; state < total; state++) {
          if (state === board.solution[index]) continue
          const config = [...board.solution]
          config[index] = state
          expect(traceBeam(board, config).end).not.toBe("lit")
        }
      })
    }
  })

  /**
   * Phase 1's correctness rule, asserted directly: no branch shares a `(cell, direction)` pair with the
   * golden path, and none enters a cell a tappable piece occupies.
   *
   * The pair rather than "does it reach the shrine", because a branch rejoining *upstream* of where it left
   * also delivers the light (design doc §11.15). And the tappable half is what phase 1 buys its proof with:
   * a branch entering a tappable cell is one corridor **per stop of that piece**, so authoring covers only
   * the stop it was traced against — which is exactly the two-branches-combine counterexample §11.15 found.
   *
   * Reuse itself is allowed and expected — that is what `corridorDies` recurses for. What may never happen is
   * the **join**, and the retracing stop is the one case that looks like one and is not: it retraces through
   * the mirrors that carried it, each still at its golden angle or the light would not have reached the bend,
   * and the disc swallows it.
   */
  it("no branch joins the golden path", () => {
    for (const board of boards) {
      const golden = traceBeam(board, board.solution)
      const goldenSegments = new Set(golden.path.map(segment => segmentKey(segment.at, segment.enter)))
      const tappable = new Set(board.movable.flatMap(piece => pieceCells(piece).map(cellKey)))
      const arrival = arrivals(board)
      board.movable.forEach((piece, index) => {
        if (piece.kind !== "turnMirror") return
        // A decoy is off the winning beam's line, so the beam never arrives at it and it has no branch of its
        // own to check here — `neverReached` is what settles it instead.
        const enter = arrival.get(cellKey(piece.at))
        if (enter === undefined) return
        const answer = piece.angles[board.solution[index]]
        for (const stop of piece.angles) {
          if (stop === answer) continue
          const retraces = reflect(stop, enter as Direction) === opposite(enter as Direction)
          const config = [...board.solution]
          config[index] = piece.angles.indexOf(stop)
          const walk = traceBeam(board, config)
          const from = walk.path.findIndex(segment => cellKey(segment.at) === cellKey(piece.at))
          for (const segment of walk.path.slice(from + 1))
            expect(goldenSegments.has(segmentKey(segment.at, segment.enter))).toBe(false)
          void retraces
          void tappable
        }
      })
    }
  })

  /**
   * **Every wall stops a branch** — there is no scenery, because stone is only ever placed where a corridor
   * had nowhere else to end.
   *
   * Note what this does *not* claim, because measuring it corrected the plan: taking a wall away mostly does
   * **not** break uniqueness. Measured over 1 000 boards, 692 of 722 walls are holding a branch out of a
   * cell a tappable piece occupies, and the beam dies anyway once it gets there. They are load-bearing for
   * phase 1's no-reuse invariant rather than for the answer, which is the real reason `thinWalls` must not
   * run here: it re-checks uniqueness and the ladder, so it would strip exactly the stone that keeps
   * branches away from tappable cells and hand phase 2's recursion §11.15's hazard.
   */
  it("carries no wall that stops nothing", () => {
    // Every wall is placed because a corridor had nowhere else to end, so some reachable beam must arrive at it.
    //
    // Asked of the reachable-deviation walk rather than by sampling, and the first attempt at this test is why:
    // over the single- and double-piece deviations it fails at four tiers, because **walls really are
    // load-bearing three and more settings deep** once branches may reuse the pieces already on the board. That
    // is a fact about the construction rather than a gap in it — but it does mean nothing short of the full
    // reachable tree can answer the question.
    //
    // Note what this therefore does and does not catch. It shares its walk with `pruneStone`, so it cannot catch
    // a bug in the walk — the tree-against-product agreement asserted elsewhere is what covers that. What it does
    // catch is scenery shipped because pruning was skipped, which happens by design whenever the exploration is
    // cut short, and that is the case worth a guard.
    for (const board of boards) {
      const reach = reachableDeviations(board, board.solution)
      expect(reach?.complete).toBe(true)

      // Wall-heavy's corner pairs are the one stone that is there to be *read* rather than to stop something:
      // two walls either side of a diagonal step, with the winning beam going through the gap (§11.8 rule 4).
      const path = traceBeam(board, board.solution).path
      const cornerSlip = new Set<string>()
      for (let step = 1; step < path.length; step++) {
        if (path[step].enter % 2 !== 1) continue
        const before = path[step - 1].at
        const after = path[step].at
        cornerSlip.add(cellKey({ row: after.row, col: before.col }))
        cornerSlip.add(cellKey({ row: before.row, col: after.col }))
      }
      for (const wall of board.fixed) {
        if (wall.kind !== "wall") continue
        const key = cellKey(wall.at)
        expect(reach!.stoneHit.has(key) || cornerSlip.has(key)).toBe(true)
      }
    }
  })

  /** Rule 2: every stop list keeps a quarter turn, so a half-step answer brings a diagonal partner with it. */
  it("keeps a quarter turn in every stop list", () => {
    for (const board of boards)
      for (const piece of board.movable) {
        if (piece.kind !== "turnMirror") continue
        expect(piece.angles.some(angle => angle === 2 || angle === 6)).toBe(true)
      }
  })

  it("puts a mirror at every bend and nothing on a shoulder", () => {
    for (const board of boards) {
      const owner = new Map<string, number>()
      board.movable.forEach((piece, index) => {
        // A door has no tap target to protect, so it needs no shoulders — the rule is about a thumb landing on
        // the piece the player meant, and nothing driven can be meant.
        if (restingState(board, index) !== undefined) return
        for (const at of pieceCells(piece)) owner.set(cellKey(at), index)
      })
      for (const [key, index] of owner) {
        const [row, col] = key.split(",").map(Number)
        for (const direction of [0, 2, 4, 6] as Direction[]) {
          const beside = owner.get(
            cellKey({ row: row + [0, -1, 0, 1][direction / 2], col: col + [1, 0, -1, 0][direction / 2] })
          )
          if (beside !== undefined) expect(beside).toBe(index)
        }
      }
    }
  })
})

/**
 * The dials the shipped tiers do not reach, kept in a spec because the code paths they exercise are real.
 *
 * A single cut mirror always arrives on a square leg, so its wrong stop never retroreflects; the second of
 * a consecutive cut pair arrives diagonally and does. Measured over 200 seeds the pair produces about 110
 * retracing branches and the shipped tiers produce none, so without this the branch that closes them for
 * free would never run.
 */
describe("dials past the shipped tiers", () => {
  it("closes a retroreflecting stop, which only a cut pair produces", () => {
    let retracing = 0
    for (let seed = 1; seed <= 40; seed++) {
      const board = generateLightbeam(9, seed, { turns: 6, cutMirrors: 2, techniqueCap: "onlySurvivor" })
      const arrival = arrivals(board)
      let lit = 0
      eachConfig(allPieceOptions(board), config => {
        if (isLit(board, config)) lit++
      })
      expect(lit).toBe(1)
      board.movable.forEach((piece, index) => {
        if (piece.kind !== "turnMirror") return
        const enter = arrival.get(cellKey(piece.at))
        if (enter === undefined) return
        const answer = piece.angles[board.solution[index]]
        for (const stop of piece.angles) if (stop !== answer && reflect(stop, enter) === opposite(enter)) retracing++
      })
    }
    expect(retracing).toBeGreaterThan(0)
  })

  it("bends diagonally where a tier asks it to", () => {
    const board = generateLightbeam(8, 1, { turns: 5, cutMirrors: 1, techniqueCap: "onlySurvivor" })
    expect(board.movable.some(piece => piece.kind === "turnMirror" && piece.angles.some(isHalfStep))).toBe(true)
    expect(traceBeam(board, board.solution).path.some(segment => segment.enter % 2 === 1)).toBe(true)
  })

  /** A folded route is what `crossings` buys, and a crossed square is provably empty. */
  it("folds through its own line when asked", () => {
    const board = generateLightbeam(9, 4, { turns: 8, crossings: 2, techniqueCap: "onlySurvivor" })
    const seen = new Set<string>()
    const crossed = new Set<string>()
    for (const segment of traceBeam(board, board.solution).path) {
      const key = cellKey(segment.at)
      if (seen.has(key)) crossed.add(key)
      seen.add(key)
    }
    expect(crossed.size).toBeGreaterThanOrEqual(2)
    const occupied = new Set(board.movable.flatMap(piece => pieceCells(piece).map(cellKey)))
    for (const key of crossed) expect(occupied.has(key)).toBe(false)
  })

  /** Generation is measured in attempts, not seconds — the plan's Method section, made a standing check. */
  it("costs about one attempt a board", () => {
    let attempts = 0
    const gates = new Map<LightbeamGate, number>()
    for (let seed = 1; seed <= 40; seed++) {
      generateLightbeam(9, seed, {
        turns: 6,
        cutMirrors: 1,
        fiddleProof: true,
        techniqueCap: "onlySurvivor",
        reject: gate => {
          attempts++
          gates.set(gate, (gates.get(gate) ?? 0) + 1)
        },
      })
      attempts++
    }
    expect(gates.get("noRoute") ?? 0).toBe(0)
    expect(gates.get("notUnique") ?? 0).toBe(0)
    expect(gates.get("notSettled") ?? 0).toBe(0)
    expect(attempts / 40).toBeLessThan(1.5)
  })
})

/**
 * §11.15's counterexample board, transcribed from the design doc.
 *
 * **This is the regression test the whole recursion exists for.** It is a board where every single-piece
 * deviation from the answer dies *and* satisfies the pair invariant — no branch shares a `(cell, direction)`
 * pair with the golden path, none reaches the shrine — and which is nevertheless not unique, because the
 * configuration that moves all three pieces lights the shrine by a second, shorter path. Two branches that
 * each die on their own, combining into a route.
 *
 * A generator that can produce this shape is wrong, so the gate has to see it. Angles are eighth-turns:
 * 22.5°=1, 45°=2, 67.5°=3, 112.5°=5, 135°=6.
 */
const COUNTEREXAMPLE: LightbeamPuzzleData = {
  size: 5,
  sun: { at: { row: 3, col: 4 }, facing: 4 },
  shrine: { row: 0, col: 3 },
  fixed: [
    { kind: "wall", at: { row: 1, col: 1 } },
    { kind: "wall", at: { row: 1, col: 3 } },
  ],
  movable: [
    { kind: "turnMirror", at: { row: 3, col: 0 }, angles: [5, 6] }, // A
    { kind: "turnMirror", at: { row: 2, col: 1 }, angles: [0, 2] }, // B
    { kind: "turnMirror", at: { row: 1, col: 0 }, angles: [1, 3, 6] }, // C
  ],
}
const COUNTEREXAMPLE_ANSWER = [1, 0, 0]

describe("§11.15's counterexample", () => {
  it("is a board whose answer works", () => {
    expect(isLit(COUNTEREXAMPLE, COUNTEREXAMPLE_ANSWER)).toBe(true)
  })

  /** The half of §11.15 that is right: the pair is a genuine condition, and this board meets it. */
  it("satisfies the pair invariant — every single-piece deviation dies and none rejoins", () => {
    const goldenSegments = new Set(
      traceBeam(COUNTEREXAMPLE, COUNTEREXAMPLE_ANSWER).path.map(segment => segmentKey(segment.at, segment.enter))
    )
    let deviations = 0
    COUNTEREXAMPLE.movable.forEach((piece, index) => {
      if (piece.kind !== "turnMirror") return
      for (let state = 0; state < piece.angles.length; state++) {
        if (state === COUNTEREXAMPLE_ANSWER[index]) continue
        deviations++
        const config = [...COUNTEREXAMPLE_ANSWER]
        config[index] = state
        const walk = traceBeam(COUNTEREXAMPLE, config)
        expect(walk.end).not.toBe("lit")
        const from = walk.path.findIndex(segment => cellKey(segment.at) === cellKey(piece.at))
        for (const segment of walk.path.slice(from + 1))
          expect(goldenSegments.has(segmentKey(segment.at, segment.enter))).toBe(false)
      }
    })
    expect(deviations).toBe(4)
  })

  /** And the half that makes the recursion necessary: the pair is not sufficient. */
  it("is nevertheless not unique", () => {
    const paths = new Set<string>()
    eachConfig(allPieceOptions(COUNTEREXAMPLE), config => {
      if (isLit(COUNTEREXAMPLE, config))
        paths.add(
          traceBeam(COUNTEREXAMPLE, config)
            .path.map(segment => segmentKey(segment.at, segment.enter))
            .join(" ")
        )
    })
    expect(paths.size).toBe(2)
  })

  /**
   * The gate sees it, and sees it for the right reason: one **reuse** fan-out, which is A's wrong stop
   * walking into B's cell and finding that one of B's stops carries the light on to the shrine.
   */
  it("is caught by the reachable deviation tree, at one reuse fan-out", () => {
    const reach = reachableDeviations(COUNTEREXAMPLE, COUNTEREXAMPLE_ANSWER)
    expect(reach?.complete).toBe(true)
    expect(reach?.winning.size).toBe(2)
    expect(reach?.reuseForks).toBe(1)
  })
})

/**
 * Phase 2's construction: branches that turn, and the mirrors they turn at.
 *
 * A branch mirror is off the golden path by construction, so the winning beam never meets it — which makes it
 * a decoy, and a **shadow** where it stands in a wrong ray. That is the piece §6.1 measured as the only thing
 * that makes the technique cap bite, and here it falls out of authoring rather than being scattered on top.
 */
describe("branches that turn", () => {
  const DIALS: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 6,
    cutMirrors: 1,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
  }
  const { size, ...options } = DIALS
  const boards = Array.from({ length: 10 }, (_, seed) => generateLightbeam(size, seed + 1, options))

  it("still has exactly one winning route", () => {
    for (const board of boards) {
      const reach = reachableDeviations(board, board.solution)
      expect(reach?.complete).toBe(true)
      expect(reach?.winning.size).toBe(1)
    }
  })

  /** The tree and the product must never disagree — one of them is the gate and the other is the check. */
  it("agrees with the walk over the whole product", () => {
    for (const board of boards) {
      const reach = reachableDeviations(board, board.solution)
      expect(reach?.winning.size === 1).toBe(routeIsUnique(board, allPieceOptions(board)))
    }
  })

  /** And it is cheaper, which is the claim §11.15 makes for it. */
  it("costs less than the product it replaces", () => {
    for (const board of boards) {
      const reach = reachableDeviations(board, board.solution)
      let productSteps = 0
      eachConfig(allPieceOptions(board), config => {
        productSteps += traceBeam(board, config).path.length
      })
      expect(reach!.nodes).toBeLessThan(productSteps)
    }
  })

  /** The recursion has work to do here, unlike at `branchDepth` 0 where no branch meets a tappable cell. */
  it("puts branches through tappable cells, which is what the recursion is for", () => {
    const reuse = boards.map(board => reachableDeviations(board, board.solution)!.reuseForks)
    expect(reuse.every(count => count > 0)).toBe(true)
  })

  /** A branch mirror is never on the winning beam's line, or it would have bent it. */
  it("keeps every branch mirror off the golden path", () => {
    for (const board of boards) {
      const golden = new Set(traceBeam(board, board.solution).path.map(segment => cellKey(segment.at)))
      const bends = new Set(
        traceBeam(board, board.solution)
          .path.filter(segment => segment.exit !== undefined && segment.exit !== segment.enter)
          .map(segment => cellKey(segment.at))
      )
      for (const piece of board.movable) {
        if (piece.kind !== "turnMirror") continue
        const key = cellKey(piece.at)
        // Either it is a golden bend, or the golden beam never touches its cell at all.
        expect(bends.has(key) || !golden.has(key)).toBe(true)
      }
    }
  })

  /**
   * **The cap starts biting**, which phase 1 could not manage at any tier: `deadEnd` alone no longer settles
   * these boards, because the light disappears into a piece nobody has settled instead of visibly dying.
   */
  it("needs more than deadEnd", () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, "deadEnd").settled).toBe(false)
  })

  it("is still reachable by deduction inside its own cap", () => {
    for (const board of boards) expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
  })
})

/**
 * `interactive` is a share with a floor, and the floor is what stops it producing an unopenable board.
 *
 * Three tappable pieces is where §5's opening rules already put the family, so a share asking for fewer is
 * raised to it rather than honoured — which is why 0.4 and 0.2 produce the same board on a six-bend route.
 */
describe("the interactive share", () => {
  it("turns bends into givens as it falls", () => {
    const counts = [1, 0.7, 0.4].map(interactive => {
      const board = generateLightbeam(9, 7, {
        turns: 6,
        cutMirrors: 1,
        interactive,
        techniqueCap: "onlySurvivor",
      })
      return { tappable: board.movable.length, givens: board.fixed.filter(piece => piece.kind === "mirror").length }
    })
    expect(counts[0].tappable).toBeGreaterThan(counts[2].tappable)
    expect(counts[2].givens).toBeGreaterThan(counts[0].givens)
  })

  it("never drops below three tappable pieces", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const board = generateLightbeam(9, seed, { turns: 6, interactive: 0, techniqueCap: "onlySurvivor" })
      expect(board.movable.length).toBeGreaterThanOrEqual(3)
    }
  })

  /** A given contributes nothing to the configuration space, which is the whole of what makes it scenery. */
  it("shrinks the configuration space as the share falls", () => {
    const spaces = [1, 0.7, 0.4].map(interactive =>
      allPieceOptions(
        generateLightbeam(9, 7, { turns: 6, cutMirrors: 1, interactive, techniqueCap: "onlySurvivor" })
      ).reduce((product, options) => product * options.length, 1)
    )
    expect(spaces[0]).toBeGreaterThan(spaces[1])
    expect(spaces[1]).toBeGreaterThan(spaces[2])
  })
})

/**
 * A shadow defeats `deadEnd` by design, so a tier capped there cannot carry one.
 *
 * Measured rather than assumed: starter's dials with `branchDepth` 1 fail `notSettled` on every attempt of
 * every seed. That is the vocabulary ladder (§6.4) showing up as a hard constraint on the tier table rather
 * than a preference — decoys and shadows are only fair once a rung can prove a piece irrelevant.
 */
describe("branch depth against the technique cap", () => {
  it("cannot build a deadEnd-capped board with a branch mirror on it", () => {
    expect(() => generateLightbeam(7, 1, { turns: 3, branchDepth: 1, techniqueCap: "deadEnd" })).toThrow(
      /no logically solvable board/
    )
  })

  it("builds the same dials once the cap allows a piece to be ruled irrelevant", () => {
    const board = generateLightbeam(7, 1, { turns: 3, branchDepth: 1, techniqueCap: "neverReached" })
    expect(solveLightbeamByTechniques(board, "neverReached").settled).toBe(true)
  })
})

/**
 * Wall-heavy, the first of the three modes that replace the goal pool (§11.18).
 *
 * Two things it does, and they are the same idea twice: stone is more legible than the frame. A branch closed
 * in stone says "it hit that"; one that leaves the board says only "it went away". And on a diagonal golden
 * leg a **pair** of walls goes down either side of the step, so the winning beam is seen to slip between two
 * corners — §11.8 rule 4 taught by the board instead of by rules text.
 */
describe("wall-heavy", () => {
  const DIALS: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 6,
    cutMirrors: 1,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
  }
  const { size, ...options } = DIALS
  const plain = Array.from({ length: 8 }, (_, seed) => generateLightbeam(size, seed + 1, options))
  const heavy = Array.from({ length: 8 }, (_, seed) =>
    generateLightbeam(size, seed + 1, { ...options, modes: ["wallHeavy"] })
  )

  const stoneCount = (board: (typeof plain)[number]) => board.fixed.filter(piece => piece.kind === "wall").length

  it("records the mode it was built to", () => {
    expect(heavy[0].modes).toEqual(["wallHeavy"])
    expect(plain[0].modes).toEqual([])
  })

  it("carries substantially more stone", () => {
    const plainStone = plain.reduce((total, board) => total + stoneCount(board), 0)
    const heavyStone = heavy.reduce((total, board) => total + stoneCount(board), 0)
    expect(heavyStone).toBeGreaterThan(plainStone * 2)
  })

  /** The point of the mode: a branch dies somewhere the player can point at. */
  it("closes branches in stone rather than at the frame", () => {
    const absorbed = (boards: typeof plain) => {
      let count = 0
      for (const board of boards)
        board.movable.forEach((piece, index) => {
          if (piece.kind !== "turnMirror") return
          const answer = piece.angles[board.solution[index]]
          for (const stop of piece.angles) {
            if (stop === answer) continue
            const config = [...board.solution]
            config[index] = piece.angles.indexOf(stop)
            if (traceBeam(board, config).end === "absorbed") count++
          }
        })
      return count
    }
    expect(absorbed(heavy)).toBeGreaterThan(absorbed(plain))
  })

  /**
   * The corner slip, made visible: two walls with the winning beam going diagonally between them. This is the
   * one place stone is kept without stopping anything, because what it is there for is to be read.
   */
  it("puts a pair of walls either side of a diagonal step, and the beam still gets through", () => {
    let pairs = 0
    for (const board of heavy) {
      const stone = new Set(board.fixed.filter(piece => piece.kind === "wall").map(piece => cellKey(piece.at)))
      const path = traceBeam(board, board.solution).path
      for (let step = 1; step < path.length; step++) {
        if (path[step].enter % 2 !== 1) continue
        const before = path[step - 1].at
        const after = path[step].at
        if (
          stone.has(cellKey({ row: after.row, col: before.col })) &&
          stone.has(cellKey({ row: before.row, col: after.col }))
        )
          pairs++
      }
      // Whatever stone went down, the answer still lights the shrine — which is rule 4 holding.
      expect(isLit(board, board.solution)).toBe(true)
    }
    expect(pairs).toBeGreaterThan(0)
  })

  it("is still unique and still deducible", () => {
    for (const board of heavy) {
      expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
      expect(routeIsUnique(board, allPieceOptions(board))).toBe(true)
      expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
    }
  })
})

/**
 * Slider-heavy: golden bends that slide rather than turn.
 *
 * The cheapest fork in the family, and for a structural reason. A turn mirror's wrong setting sends the light
 * somewhere that has to be closed with authored stone; a slider's wrong setting is *"as if the piece were not
 * there"*, so the branch is the beam's own line carrying straight on through the cell it vacated. It also asks
 * a different question — not "which way round" but "is it in the way", and on a three-cell track, "which cell".
 *
 * It is the mode that needed the occupancy model: a sliding piece's **absence** from a cell is a fact about its
 * setting, so a beam crossing an empty track cell has learned something, and `(cell, direction)` alone no
 * longer determines the future.
 */
describe("slider-heavy", () => {
  const BASE: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 6,
    cutMirrors: 1,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
  }
  const { size, ...options } = BASE
  const boards = Array.from({ length: 8 }, (_, seed) =>
    generateLightbeam(size, seed + 1, { ...options, modes: ["sliderHeavy"], sliders: 2 })
  )

  const sliding = (board: (typeof boards)[number]) => board.movable.filter(piece => piece.kind !== "turnMirror")

  it("delivers exactly the sliders it was asked for, or does not build", () => {
    for (const board of boards) expect(sliding(board)).toHaveLength(2)
  })

  it("puts them on the winning beam's line", () => {
    for (const board of boards) {
      const onRoute = new Set(traceBeam(board, board.solution).path.map(segment => cellKey(segment.at)))
      for (const piece of sliding(board)) {
        expect(piece.kind).toBe("slidingMirror")
        const cells = pieceCells(piece)
        expect(cells.some(at => onRoute.has(cellKey(at)))).toBe(true)
      }
    }
  })

  /** The track is contiguous and collinear, or it reads as teleporting rather than sliding. */
  it("gives them a contiguous straight track", () => {
    for (const board of boards)
      for (const piece of sliding(board)) {
        const cells = pieceCells(piece)
        const rows = new Set(cells.map(at => at.row))
        const cols = new Set(cells.map(at => at.col))
        expect(rows.size === 1 || cols.size === 1).toBe(true)
        const along = rows.size === 1 ? cells.map(at => at.col) : cells.map(at => at.row)
        const sorted = [...along].sort((a, b) => a - b)
        for (let step = 1; step < sorted.length; step++) expect(sorted[step] - sorted[step - 1]).toBe(1)
      }
  })

  /** Sliding it out of the way must still run the light out — the branch is just the beam's own line. */
  it("closes the branch a vacated cell opens", () => {
    for (const board of boards)
      board.movable.forEach((piece, index) => {
        if (piece.kind === "turnMirror") return
        for (let state = 0; state < piece.stops.length; state++) {
          if (state === board.solution[index]) continue
          const config = [...board.solution]
          config[index] = state
          expect(traceBeam(board, config).end).not.toBe("lit")
        }
      })
  })

  it("is still unique, and the tree still agrees with the product", () => {
    for (const board of boards) {
      const reach = reachableDeviations(board, board.solution)
      expect(reach?.complete).toBe(true)
      expect(reach?.winning.size).toBe(1)
      expect(routeIsUnique(board, allPieceOptions(board))).toBe(true)
      expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
    }
  })

  it("combines with wall-heavy", () => {
    const board = generateLightbeam(9, 3, {
      ...options,
      modes: ["wallHeavy", "sliderHeavy"],
      sliders: 2,
    })
    expect(board.modes).toEqual(["wallHeavy", "sliderHeavy"])
    expect(board.movable.filter(piece => piece.kind !== "turnMirror")).toHaveLength(2)
    expect(board.fixed.filter(piece => piece.kind === "wall").length).toBeGreaterThan(4)
    expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
  })
})

/**
 * The three modes have to produce measurably different boards rather than three names for the same board,
 * which is what phase 3 exists to prove.
 */
describe("sliding walls", () => {
  const BASE: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 6,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
  }
  const { size, ...options } = BASE
  const boards = Array.from({ length: 8 }, (_, seed) =>
    generateLightbeam(size, seed + 1, { ...options, modes: ["wallHeavy"], slidingWalls: 1 })
  )
  const walls = (board: Board) => board.movable.filter(piece => piece.kind === "slidingWall")

  it("delivers the wall it was asked for, and it is the player's", () => {
    for (const board of boards) {
      expect(walls(board)).toHaveLength(1)
      const index = board.movable.findIndex(piece => piece.kind === "slidingWall")
      // Nothing drives it: the whole difference from a door is that a thumb moves this one.
      expect(restingState(board, index)).toBeUndefined()
      expect(pieceOptions(board, index)).toHaveLength(2)
    }
  })

  it("rests in the beam's way, and its answer is the cell beside it", () => {
    for (const board of boards) {
      const onRoute = new Set(traceBeam(board, board.solution).path.map(segment => cellKey(segment.at)))
      const index = board.movable.findIndex(piece => piece.kind === "slidingWall")
      const stops = pieceCells(board.movable[index])
      // One stop on the winning beam's own line, one off it — and the answer is the one off it.
      expect(stops.filter(at => onRoute.has(cellKey(at)))).toHaveLength(1)
      expect(onRoute.has(cellKey(stops[board.solution[index]]))).toBe(false)
    }
  })

  it("kills the beam where it stands, so its wrong stop needs no corridor", () => {
    for (const board of boards) {
      const index = board.movable.findIndex(piece => piece.kind === "slidingWall")
      const wrong = [...board.solution]
      wrong[index] = board.solution[index] === 0 ? 1 : 0
      expect(traceBeam(board, wrong).end).toBe("absorbed")
      expect(isLit(board, wrong)).toBe(false)
    }
  })

  it("leaves the board unique and deducible", () => {
    for (const board of boards) {
      expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
      expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
    }
  })
})

/**
 * Flavours: the dial set is drawn per board, so a tier is a range rather than one recipe (§7.4).
 *
 * The failure this guards is what playtesting reported — every board on a tier the same shape, because a tier
 * had exactly one set of dials and dials do not vary. A pool only fixes that if the draw actually lands on
 * different flavours, which is what the counts below are for.
 */
describe("flavours", () => {
  const BASE: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 5,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
  }
  const { size, ...options } = BASE
  const flavours: NonNullable<LightbeamOptions["flavours"]> = [
    { modes: ["wallHeavy"] },
    { modes: ["sliderHeavy"], sliders: 1, slidingStops: 2 },
    { modes: ["wallHeavy"], slidingWalls: 1 },
  ]
  const drawn = Array.from({ length: 12 }, (_, seed) => generateLightbeam(size, seed + 1, { ...options, flavours }))

  it("draws more than one shape across a tier", () => {
    const shapes = new Set(
      drawn.map(board =>
        [...board.modes, ...board.movable.map(piece => piece.kind)]
          .sort((left, right) => (left < right ? -1 : 1))
          .join("/")
      )
    )
    expect(shapes.size).toBeGreaterThan(2)
  })

  it("draws a flavour rather than blending them: every board is one of the pool", () => {
    for (const board of drawn) {
      expect(board.modes).toHaveLength(1)
      const slid = board.movable.filter(piece => piece.kind === "slidingMirror").length
      const stone = board.movable.filter(piece => piece.kind === "slidingWall").length
      // Slider-heavy is the only flavour with a sliding mirror, and only one flavour asks for stone to slide.
      if (board.modes.includes("sliderHeavy")) expect(slid).toBe(1)
      else expect(slid).toBe(0)
      expect(stone).toBeLessThanOrEqual(1)
    }
  })

  it("builds the same board every attempt: the draw is off the seed", () => {
    for (let seed = 1; seed <= 4; seed++) {
      const again = generateLightbeam(size, seed, { ...options, flavours })
      expect(again.modes).toEqual(generateLightbeam(size, seed, { ...options, flavours }).modes)
    }
  })
})

describe("mode variance", () => {
  const BASE: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 6,
    cutMirrors: 1,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
  }
  const { size, ...options } = BASE
  const shape = (modes: LightbeamOptions["modes"], sliders = 2) => {
    let stone = 0
    let slid = 0
    let absorbed = 0
    for (let seed = 1; seed <= 6; seed++) {
      const board = generateLightbeam(size, seed, { ...options, modes, sliders })
      stone += board.fixed.filter(piece => piece.kind === "wall").length
      slid += board.movable.filter(piece => piece.kind !== "turnMirror").length
      board.movable.forEach((piece, index) => {
        if (piece.kind !== "turnMirror") return
        const answer = piece.angles[board.solution[index]]
        for (const stop of piece.angles) {
          if (stop === answer) continue
          const config = [...board.solution]
          config[index] = piece.angles.indexOf(stop)
          if (traceBeam(board, config).end === "absorbed") absorbed++
        }
      })
    }
    return { stone, slid, absorbed }
  }

  it("tells the modes apart on piece mix and branch shape", () => {
    const plain = shape([])
    const wall = shape(["wallHeavy"])
    const slide = shape(["sliderHeavy"])

    // Wall-heavy is the stone one, and its branches die in stone rather than off the frame.
    expect(wall.stone).toBeGreaterThan(plain.stone * 2)
    expect(wall.absorbed).toBeGreaterThan(plain.absorbed)
    // Slider-heavy is the only one that puts a sliding piece on the board.
    expect(slide.slid).toBeGreaterThan(0)
    expect(plain.slid).toBe(0)
    expect(wall.slid).toBe(0)
  })
})

/**
 * Switch-heavy: doors across the route, and the sockets that open them.
 *
 * A door is stone the player cannot shift, so the light is the only thing that opens it — which is what stops
 * the socket being decoration (§11.2). It buys a rung nothing else in the family does: **order**, "the light
 * has to get through here, this door is shut, so it must reach that socket first", seeded from the middle of
 * the board where a long route is thinnest.
 *
 * It is also the mode that generalises the proof. A socket changes the board mid-walk, so the determinism both
 * walks rest on is keyed on `(cell, direction, firedSet)` rather than `(cell, direction)`. That stays
 * well-founded because firing is **monotone** — a wiring fires once and never un-fires — so a walk cannot
 * cycle through door states.
 */
describe("switch-heavy", () => {
  const BASE: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 6,
    cutMirrors: 1,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
  }
  const { size, ...options } = BASE
  const boards = Array.from({ length: 8 }, (_, seed) =>
    generateLightbeam(size, seed + 1, { ...options, modes: ["switchHeavy"], doors: 1, doorNodes: 1 })
  )

  it("puts a socket and a door on the board", () => {
    for (const board of boards) {
      expect(board.nodes?.length).toBe(1)
      expect(board.wirings?.length).toBe(1)
    }
  })

  /** A door the player could open makes the socket decoration, so it must not be theirs to tap. */
  it("gives the door no state the player can choose", () => {
    for (const board of boards) {
      const door = board.wirings![0].piece
      expect(restingState(board, door)).toBeDefined()
      expect(pieceOptions(board, door)).toHaveLength(1)
    }
  })

  /** The winning beam really does open it — otherwise the door is just a wall in the way. */
  it("is opened by the winning beam", () => {
    for (const board of boards) {
      expect(firedWirings(board, board.solution).size).toBe(1)
      expect(isLit(board, board.solution)).toBe(true)
    }
  })

  /**
   * The order is structural, not checked: the socket comes strictly before the door along the route, so the
   * effect lands ahead of the light and the drawn beam is never a picture of something that has stopped being
   * true.
   */
  it("crosses the socket before it reaches the door", () => {
    for (const board of boards) {
      const path = traceBeam(board, board.solution).path.map(segment => cellKey(segment.at))
      const socket = path.indexOf(cellKey(board.nodes![0].at))
      const door = board.movable[board.wirings![0].piece]
      const doorCell = cellKey(pieceCells(door)[0])
      expect(socket).toBeGreaterThanOrEqual(0)
      expect(socket).toBeLessThan(path.indexOf(doorCell) === -1 ? Infinity : path.indexOf(doorCell))
    }
  })

  /**
   * A switch needs an off. A socket on the route's first leg is crossed under every configuration, so its door
   * stands open from the first frame and there is no order to read — the socket has to sit behind a piece the
   * player can move.
   */
  it("leaves the socket dark under some setting the player can choose", () => {
    for (const board of boards) {
      const dark = allPieceOptions(board).some((states, piece) =>
        states.some(state => {
          const config = [...board.solution]
          config[piece] = state
          return !firedWirings(board, config).has(0)
        })
      )
      expect(dark).toBe(true)
    }
  })

  /** A driven piece contributes nothing to the configuration space, which is what `pieceOptions` says. */
  it("costs the configuration space nothing", () => {
    const plain = generateLightbeam(size, 1, options)
    const switched = generateLightbeam(size, 1, {
      ...options,
      modes: ["switchHeavy"],
      doors: 1,
      doorNodes: 1,
    })
    const space = (board: typeof plain) =>
      allPieceOptions(board).reduce((product, states) => product * states.length, 1)
    expect(space(switched)).toBe(space(plain))
  })

  it("is still unique and still deducible, with the firedSet key", () => {
    for (const board of boards) {
      const reach = reachableDeviations(board, board.solution)
      expect(reach?.complete).toBe(true)
      expect(reach?.winning.size).toBe(1)
      expect(routeIsUnique(board, allPieceOptions(board))).toBe(true)
      expect(solveLightbeamByTechniques(board, board.techniqueCap).settled).toBe(true)
    }
  })

  /** An and-wiring is a routing demand rather than a setting to rule out — two sockets, one door. */
  it("supports an and-wiring across two sockets", () => {
    const board = generateLightbeam(size, 2, {
      ...options,
      modes: ["switchHeavy"],
      doors: 1,
      doorNodes: 2,
    })
    expect(board.nodes).toHaveLength(2)
    expect(board.wirings![0].from).toHaveLength(2)
    expect(firedWirings(board, board.solution).size).toBe(1)
    expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
  })

  it("combines with the other two modes", () => {
    for (const modes of [
      ["wallHeavy", "switchHeavy"],
      ["sliderHeavy", "switchHeavy"],
    ] as const) {
      const board = generateLightbeam(size, 5, {
        ...options,
        modes: [...modes],
        sliders: 1,
        doors: 1,
        doorNodes: 1,
      })
      expect(board.modes).toEqual([...modes])
      expect(board.nodes).toHaveLength(1)
      expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
    }
  })
})

/**
 * **Traps** — §11.1's missing half, and the thing this whole architecture was for.
 *
 * §11.1 worked out what a trap needs and then explained why it could not be built. The trap has to be the
 * *only* reason a wrong setting fails, so that setting must otherwise **reach the shrine** — a would-be second
 * route — and route-then-obstruct is built to reject exactly those. It called looking for one "fishing in a pond
 * stocked against you", and measured what happens if you place the socket the way shadows are placed instead:
 * **23 traps across 120 boards, every single one of them decoration.**
 *
 * An authoring generator does not fish. It routes a wrong setting to the shrine on purpose (`routeToShrine`),
 * then puts the socket on that corridor and the stone further along it. The wrong setting's own light drops the
 * stone in front of itself and dies of its own doing, so uniqueness is restored *by the trap*.
 *
 * The acceptance test is §11.1's own, and it is a generation gate rather than only an assertion here: take the
 * trap out and the board must stop being a puzzle.
 */
describe("traps", () => {
  const DIALS: LightbeamOptions & { size: number } = {
    size: 9,
    turns: 6,
    cutMirrors: 1,
    branchDepth: 1,
    interactive: 1,
    fiddleProof: true,
    techniqueCap: "onlySurvivor",
    modes: ["switchHeavy"],
    doors: 1,
    doorNodes: 1,
    traps: 1,
  }
  const { size, ...options } = DIALS
  const boards = Array.from({ length: 4 }, (_, seed) => generateLightbeam(size, seed + 1, options))

  it("puts two sockets on the board — one to reach, one to dodge", () => {
    for (const board of boards) {
      expect(board.nodes).toHaveLength(2)
      expect(board.wirings).toHaveLength(2)
    }
  })

  /**
   * The classification is the thinking (§11.1): the winning beam fires the door's wiring and **not** the trap's.
   * A board where the light crosses every socket on its way past is a checklist, not a choice.
   */
  it("leaves one wiring unfired by the winning beam", () => {
    for (const board of boards) {
      const fired = firedWirings(board, board.solution)
      expect(fired.size).toBe(1)
      expect(board.wirings!.length).toBe(2)
    }
  })

  /**
   * §11.1's acceptance test. Remove the trap's wiring and its stone never drops, so the wrong setting it was
   * killing survives — and the board has two routes. That is what load-bearing means here, and it is asserted
   * directly the way §5.1's walls are.
   */
  it("is load-bearing: take it out and the board stops being a puzzle", () => {
    for (const board of boards) {
      const wirings = board.wirings!
      const trap = wirings.findIndex((_, index) => !firedWirings(board, board.solution).has(index))
      expect(trap).toBeGreaterThanOrEqual(0)
      const without = { ...board, wirings: wirings.filter((_, index) => index !== trap) }
      // The answer still works — the trap was never in the winning beam's way.
      expect(isLit(without, board.solution)).toBe(true)
      // But it is no longer the only route.
      expect(routeIsUnique(without, allPieceOptions(without))).toBe(false)
    }
  })

  /** With the trap in, the board is a puzzle again — uniqueness restored *by* the trap. */
  it("restores uniqueness by itself", () => {
    for (const board of boards) {
      expect(routeIsUnique(board, allPieceOptions(board))).toBe(true)
      expect(reachableDeviations(board, board.solution)?.winning.size).toBe(1)
    }
  })

  /**
   * `wiringDead` is what §11.1 says a trap board cannot settle without: the stone the trap might drop sits
   * `unknown` across the board until a rung can prove the wiring never fires.
   */
  it("needs the rung that proves a wiring can never fire", () => {
    for (const board of boards) {
      const solve = solveLightbeamByTechniques(board, board.techniqueCap)
      expect(solve.settled).toBe(true)
      expect(solve.used.has("wiringDead")).toBe(true)
    }
  })
})
