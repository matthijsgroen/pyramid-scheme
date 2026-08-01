import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorConfig } from "@/game/siteTypes"
// Populate the family registry, exactly as the app does — resolveEncounter's tags (trap in
// particular) steer the carve, so an unregistered registry would assemble different floors
// than players get.
import "@/mods/registerModApps"

// Mirror useAssembledFloor's own resolver, so this walks the identical code path.
const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

type Floor = { label: string; config: FloorConfig; seed: number; floorIndex: number; journeyId: string }

// Every floor a player can be sent into, at the exact seed the runtime will use.
// Mirrors PyramidExpedition: one site per level number (1-based), falling back to the first
// site config when a journey has more levels than site configs, and SiteMapScreen's own
// per-floor seed offset.
const allFloors = (): Floor[] => {
  const floors: Floor[] = []
  for (const journey of journeys) {
    const siteConfigs = journey.siteConfigs
    if (!siteConfigs?.length) continue
    const siteSeed = persistentInteriorSeed(journey.id)
    for (let levelNr = 1; levelNr <= journey.levelCount; levelNr++) {
      const site = siteConfigs[levelNr - 1] ?? siteConfigs[0]
      site.forEach((config, floorIndex) => {
        floors.push({
          label: `${journey.id} level ${levelNr} floor ${floorIndex}`,
          config,
          seed: floorAssemblySeed(siteSeed, levelNr, floorIndex),
          floorIndex,
          journeyId: journey.id,
        })
      })
    }
  }
  return floors
}

// The guard that was missing when 17 authored floors (expert_1, expert_4, master_1/2/4, and ten
// wizard floors) shipped unenterable: their layout could not be carved at the one seed the
// runtime ever hands them, so the interior rendered "Site layout unavailable." for every player,
// permanently. Nothing else covers this — worldGen/reachability.ts assembles with its own seeds,
// and no other spec walks the whole baked world. Run standalone via `yarn verify-floors`.
describe("every authored floor assembles at its runtime seed", () => {
  it("has floors to check at all (a silent empty sweep would prove nothing)", () => {
    expect(allFloors().length).toBeGreaterThan(100)
  })

  // Assembling the whole world is a few hundred maze carves — well past the default 5s budget.
  it("assembles all of them", () => {
    const failures = allFloors()
      .map(floor => {
        const result = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, {
          resolveKeyRequirements,
          floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex },
        })
        return result.success ? null : `${floor.label} (seed ${floor.seed}): ${JSON.stringify(result.reasons)}`
      })
      .filter((f): f is string => f !== null)

    expect(failures, `${failures.length} floor(s) cannot be assembled:\n${failures.join("\n")}`).toEqual([])
  }, 60_000)
})
