#!/usr/bin/env tsx
/**
 * Prints `floorRef sha256` for every shipped floor of every tier, sorted: the carve's byte-identity record.
 * Run: yarn carve-digests
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { carvedFloorDigest } from "../src/data/tierFingerprints"
import { worldFloorCarve } from "../src/mods/carveWorldFloor"

const lines: string[] = []
for (const [journeyId, site] of Object.entries(generatedWorldConfigs)) {
  site.forEach((floors, levelIndex) => {
    floors.forEach((config, floorIndex) => {
      const result = worldFloorCarve(journeyId, levelIndex + 1, floorIndex).carve(config)
      lines.push(
        `${journeyId}/${levelIndex}/${floorIndex} ${result.success ? carvedFloorDigest(result.grid) : "FAILED"}`
      )
    })
  })
}
console.log(lines.sort().join("\n"))
