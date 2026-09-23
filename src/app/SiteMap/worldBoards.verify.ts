import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { hashString } from "@/support/hashString"
import { boardIndexesForFloor } from "./boardIndexes"
import { encodeEdge } from "./edgeId"
import { cellAddress } from "./cellIdentity"
import { allFloors, resolveKeyRequirements } from "./worldFloors.testing"

/**
 * Builds every board the world deals, which the seed-list sweeps cannot: they compare indexes and
 * never ask a family to generate. Eleven tomb rooms once shipped with an unsatisfiable config and
 * every test stayed green.
 *
 * Not a test: eleven minutes in one `it()`, which one worker runs start to finish. Run it —
 * `yarn verify-world` — when world data, a floor spec, a seed list or a generator changes.
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
              levelNr: floor.levelIndex + 1,
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
