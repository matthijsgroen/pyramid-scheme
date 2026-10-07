#!/usr/bin/env tsx
/**
 * Prints one authored floor's compiled lock, so a change to `floorLock` can be diffed against a
 * floor the world actually ships rather than against a fixture written for the change.
 * Run: yarn tsx scripts/dumpFloorLock.ts <journeyId> <levelNr> <floorIndex>
 *
 * Keys are sorted at every depth: the compiler fills its maps in scan order, and a diff that moved
 * because a key was inserted elsewhere is a diff nobody reads.
 */
import { generatedWorldConfigs } from "../src/data/generatedWorld"
import { assembleFloor } from "../src/game/siteAssembler"
import { resolveOneWayRealisation } from "../src/mods/allOneWayRealisations"
import { resolvePassageRealisation } from "../src/mods/allPassageRealisations"
import { floorAssemblySeed, persistentInteriorSeed } from "../src/game/siteSeed"
import { floorLock } from "../src/game/floorLock"
import { resolveKeyRequirements, resolveEncounterMeta } from "../src/mods/allFamilyMeta"

const [journeyId, levelArg, floorArg] = process.argv.slice(2)
const levelNr = Number(levelArg)
const floorIndex = Number(floorArg)

const site = generatedWorldConfigs[journeyId]?.[levelNr - 1]
if (!site) throw new Error(`no site ${journeyId} level ${levelArg}`)
const floor = site[floorIndex]
if (!floor) throw new Error(`no floor ${floorArg} on ${journeyId} level ${levelArg}`)

const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), levelNr, floorIndex)
const result = assembleFloor(journeyId, floor, seed, resolveEncounterMeta, {
  resolveKeyRequirements,
  floorRef: { journeyId, floorIndex },
  resolveOneWay: resolveOneWayRealisation,
  resolvePassage: resolvePassageRealisation,
})
if (!result.success) throw new Error(`floor will not carve: ${JSON.stringify(result.reasons)}`)

const sorted = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sorted)
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, entry]) => [key, sorted(entry)])
    )
  return value
}

console.log(JSON.stringify(sorted(floorLock(result.grid)), null, 2))
