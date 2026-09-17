import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { hashString } from "@/support/hashString"
import { boardIndexesForFloor } from "./boardIndexes"
import { encodeEdge } from "./edgeId"
import { cellAddress } from "./cellIdentity"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"

/**
 * The boards themselves, built the way the player's tap builds them.
 *
 * THE GAP THIS FILLS: the sweeps in `worldFloorAssembly.spec.ts` are bookkeeping. The one next door
 * works out WHICH board each room is dealt and proves no two rooms share one, but it never asks the
 * family to build it — it reads the seed list and compares indexes. So a room could be dealt a
 * perfectly unique board whose generator throws the moment anyone opens it, and every test in this
 * repository would stay green.
 *
 * That is not hypothetical. Eleven rooms across the expert and wizard treasure tombs shipped with a
 * number set and a `maxMultiplyOperandResult` that no formula can satisfy at once, and a puzzle is built
 * during render — so opening one of them threw, React unmounted the tree, and the player got a black
 * screen with nothing on it.
 *
 * WHY IT IS NOT A TEST. Building every board in the world is the only thing that could have caught
 * that, and it costs eleven minutes — 46% of the whole suite's work in a single `it()`, which no
 * amount of parallelism can cut because one test runs on one worker. It set the floor under every
 * run: the other 265 files together finish in about three minutes. So it is a `.verify.ts` file,
 * outside the default `include` and run on its own: `yarn verify-world`. Run it when the world data,
 * a floor spec, a seed list or a puzzle generator changes — the things that can actually break it.
 */
describe("every room in the world builds the board its tap asks for", () => {
  const failures = (): string[] => {
    const broken: string[] = []
    for (const floor of allFloors()) {
      const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
        resolveKeyRequirements,
        floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex },
        resolveBoardIndex: boardIndexesForFloor(floor.journeyId, floor.levelIndex, floor.floorIndex),
      })
      if (!result.success) continue
      result.grid.cells.forEach((row, r) =>
        row.forEach((cell, c) => {
          if (cell.type !== "room" || !cell.family) return
          const family = getFamilyPlugin(cell.family)
          if (!family) return
          const edgeId = encodeEdge(floor.floorIndex, r, c)
          try {
            // The context useEncounter hands a family, built from the same cell.
            family.generate(hashString(floor.journeyId + edgeId), {
              journeyId: floor.journeyId,
              edgeId,
              address: cellAddress(result.grid, floor.floorIndex, r, c) ?? edgeId,
              sectionHash: cell.sectionHash ?? "",
              freshArrival: true,
              difficulty: cell.difficulty ?? floor.config.difficulty,
              reward: cell.reward,
              stock: cell.stock,
              pathIndex: cell.pathIndex,
              boardIndex: cell.boardIndex,
              encounterArgs: cell.encounterArgs,
              theme: cell.theme,
              role: cell.role,
              requiredKeyId: cell.requiredKeyId,
              gateVariant: cell.gateVariant,
              keyColor: cell.keyColor,
              ownedKeys: new Set<string>(),
            })
          } catch (error) {
            broken.push(
              `${floor.label} (${r},${c}) ${cell.family}/${cell.difficulty ?? floor.config.difficulty}` +
                ` role=${JSON.stringify(cell.role)}: ${(error as Error).message}`
            )
          }
        })
      )
    }
    return broken
  }

  it("builds every one of them", () => {
    expect(failures()).toEqual([])
  }, 1_200_000)
})
