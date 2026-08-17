import { describe, expect, it } from "vitest"
import type { LightbeamPuzzleData } from "./beam"
import {
  applyLightbeamDecisions,
  applyLightbeamTechniques,
  createLightbeamBoard,
  lightbeamSettled,
  nextLightbeamStep,
  settledStates,
  solveLightbeamByTechniques,
  techniquesUpTo,
  TECHNIQUES,
  type TechniqueId,
} from "./techniques"

/**
 * A minimal deducible board. The disc shines down column 1; a turn mirror at (2,1) must bend it right to
 * the shrine on the right edge, and a wall waits where the other face would send it.
 *
 *     · S · · ·      S = disc facing down    X = shrine
 *     · · · · ·      M = the turn mirror     # = wall
 *     # M · · X
 *     · · · · ·
 */
const oneMirror: LightbeamPuzzleData = {
  size: 5,
  sun: { at: { row: 0, col: 1 }, facing: "down" },
  shrine: { row: 2, col: 4 },
  fixed: [{ kind: "wall", at: { row: 2, col: 0 } }],
  movable: [{ kind: "turnMirror", at: { row: 2, col: 1 }, faces: ["/", "\\"] }],
}

/** Runs the ladder up to `cap` and hands back only what the last technique to fire concluded. */
const firstStep = (puzzle: LightbeamPuzzleData, cap: TechniqueId, only?: TechniqueId) => {
  const board = createLightbeamBoard(puzzle)
  const allowed = only ? techniquesUpTo(cap).filter(technique => technique !== only) : []
  // Spend the cheaper rungs first, so the technique under test is the one left with something to say.
  if (only)
    for (let pass = 0; pass < 12; pass++) {
      const harvest = applyLightbeamTechniques(board, allowed)
      if (!harvest) break
      for (const step of harvest) applyLightbeamDecisions(board, step.decisions)
    }
  return nextLightbeamStep(board, cap)
}

describe("the ladder", () => {
  // The three facts first, then the eliminations, then the exhaustive pair — ordered by how well a reason
  // explains itself rather than by strength. `wiringFires` sits with the facts because it is one: it rules
  // nothing out, it says a door has opened, and every rung below it then has more of the board to work on.
  it("is ordered by how well a reason explains itself, cheapest first", () => {
    expect([...TECHNIQUES]).toEqual([
      "entryRun",
      "exitRun",
      "wiringFires",
      "deadEnd",
      "feedsExit",
      "wiringDead",
      "neverReached",
      "onlySurvivor",
    ])
  })

  it("a cap admits itself and everything below it", () => {
    expect(techniquesUpTo("deadEnd")).toEqual(["entryRun", "exitRun", "wiringFires", "deadEnd"])
  })
})

describe("entryRun", () => {
  it("settles the stretch before the light meets anything the player can change", () => {
    const step = nextLightbeamStep(createLightbeamBoard(oneMirror), "entryRun")
    expect(step?.technique).toBe("entryRun")
    // Down column 1 to the mirror, and no further: that cell could be facing either way.
    expect(step?.beam.map(segment => segment.at)).toEqual([
      { row: 1, col: 1 },
      { row: 2, col: 1 },
    ])
  })
})

describe("exitRun", () => {
  it("finds the only side the shrine can be lit from", () => {
    const step = firstStep(oneMirror, "exitRun", "exitRun")
    expect(step?.technique).toBe("exitRun")
    // The shrine sits on the right edge, so light can only reach it travelling rightwards.
    expect(step?.decisions).toContainEqual({ kind: "shrineEntry", direction: "right" })
  })

  it("says nothing while two sides are still open", () => {
    // A shrine in open ground with something unsettled on two of its approaches: light could arrive
    // rightwards off the mirror beside it, or downwards off the one above it, and nothing yet tells them
    // apart. The frame rules out the other two sides, but two open sides is one too many.
    const open: LightbeamPuzzleData = {
      ...oneMirror,
      shrine: { row: 2, col: 2 },
      fixed: [],
      movable: [...oneMirror.movable, { kind: "turnMirror", at: { row: 1, col: 2 }, faces: ["/", "\\"] }],
    }
    expect(applyLightbeamTechniques(createLightbeamBoard(open), ["exitRun"])).toBeUndefined()
  })
})

describe("deadEnd", () => {
  it("rules out the face that walks the light into a wall", () => {
    const step = firstStep(oneMirror, "deadEnd", "deadEnd")
    expect(step?.technique).toBe("deadEnd")
    expect(step?.variant).toBe("wall")
    // Face "/" sends the beam left, into the wall at (2,0).
    expect(step?.decisions).toEqual([{ kind: "eliminate", piece: 0, states: [0] }])
  })

  it("tells the frame apart from a wall — they are different sentences", () => {
    const noWall: LightbeamPuzzleData = { ...oneMirror, fixed: [] }
    expect(firstStep(noWall, "deadEnd", "deadEnd")?.variant).toBe("edge")
  })

  it("blames nothing when every setting dies — a broken board is not the piece's fault", () => {
    // The shrine is unreachable whichever way the mirror faces, so neither face may be ruled out.
    const hopeless: LightbeamPuzzleData = { ...oneMirror, shrine: { row: 4, col: 4 } }
    const board = createLightbeamBoard(hopeless)
    applyLightbeamDecisions(
      board,
      (applyLightbeamTechniques(board, ["entryRun"]) ?? []).flatMap(step => step.decisions)
    )
    expect(applyLightbeamTechniques(board, ["deadEnd"])).toBeUndefined()
  })
})

describe("solveLightbeamByTechniques", () => {
  it("settles the board and names the setting the light needs", () => {
    const solve = solveLightbeamByTechniques(oneMirror, "deadEnd")
    expect(solve.settled).toBe(true)
    expect(settledStates(solve.board)).toEqual([1])
  })

  it("stops short of a board its cap cannot reach", () => {
    // Nothing below `deadEnd` rules a setting out, so with only the runs allowed the board stalls.
    const solve = solveLightbeamByTechniques(oneMirror, "exitRun")
    expect(solve.settled).toBe(false)
    expect(lightbeamSettled(solve.board)).toBe(false)
  })

  it("records which rungs the board actually demanded", () => {
    expect([...solveLightbeamByTechniques(oneMirror, "onlySurvivor").used]).toContain("deadEnd")
  })
})

/**
 * A board with a decoy. The route is the same one-mirror bend; the extra mirror at (0,4) sits where no
 * beam can ever reach it, whatever either piece is set to.
 */
const withDecoy: LightbeamPuzzleData = {
  ...oneMirror,
  movable: [...oneMirror.movable, { kind: "turnMirror", at: { row: 0, col: 4 }, faces: ["/", "\\"] }],
}

describe("neverReached", () => {
  it("frees the piece the light can never touch", () => {
    const solve = solveLightbeamByTechniques(withDecoy, "neverReached")
    expect(solve.settled).toBe(true)
    expect([...solve.board.free]).toEqual([1])
  })

  // It is the one rung whose conclusion the answer does not need — the board is already settled by the
  // time it speaks — so it runs as a closing sweep rather than inside the fixpoint loop. Without that it
  // would never fire at all, and the family's own skill would have nothing to say.
  it("still speaks even though the route never needed it", () => {
    expect([...solveLightbeamByTechniques(withDecoy, "neverReached").used]).toContain("neverReached")
  })

  it("holds its tongue below its own rung", () => {
    expect(solveLightbeamByTechniques(withDecoy, "deadEnd").board.free.size).toBe(0)
  })

  it("never frees a piece that could stand in the beam's way", () => {
    expect(solveLightbeamByTechniques(oneMirror, "neverReached").board.free.size).toBe(0)
  })
})
