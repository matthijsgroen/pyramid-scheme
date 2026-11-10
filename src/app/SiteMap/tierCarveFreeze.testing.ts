import { existsSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import type { Difficulty } from "@/data/difficultyLevels"
import { carvedFloorDigest } from "@/data/tierFingerprints"
import type { FloorGrid } from "@/game/siteTypes"
import { allFloors, resolveKeyRequirements, type Floor } from "./worldFloors.testing"

const tierFloors = (difficulty: Difficulty): Floor[] =>
  allFloors().filter(floor => journeys.find(j => j.id === floor.journeyId)?.difficulty === difficulty)

const assembled = (floor: Floor): FloorGrid => {
  const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
    resolveKeyRequirements,
    floorRef: { journeyId: floor.journeyId, levelIndex: floor.levelIndex, floorIndex: floor.floorIndex },
  })
  if (!result.success) throw new Error(`${floor.label} cannot be assembled: ${JSON.stringify(result.reasons)}`)
  return result.grid
}

const dataDir = path.resolve(import.meta.dirname, "../../data")

// A tier's freeze waits for its recording: until `src/data/<tier>Carve.json` exists it is skipped, unless
// `CARVE_RECORD=<tier>` asks for the recording (`yarn <tier>-freeze:record`).
export const tierCarveFreeze = (difficulty: Difficulty) => {
  const file = path.join(dataDir, `${difficulty}Carve.json`)
  const recording = process.env.CARVE_RECORD === difficulty
  describe(`${difficulty}'s carved floors`, () => {
    it.skipIf(!existsSync(file) && !recording)("are carved exactly as recorded, floor by floor", async () => {
      const digests = Object.fromEntries(tierFloors(difficulty).map(f => [f.label, carvedFloorDigest(assembled(f))]))
      expect(Object.keys(digests).length).toBeGreaterThan(5)
      await expect(
        JSON.stringify(digests, null, 2) + "\n",
        `A ${difficulty} floor carves differently than src/data/${difficulty}Carve.json records. A save names a corridor cell by its order on the floor, so once ${difficulty} is released this moves players: update the file only together with a save migration.`
      ).toMatchFileSnapshot(file)
    })
  })
}
