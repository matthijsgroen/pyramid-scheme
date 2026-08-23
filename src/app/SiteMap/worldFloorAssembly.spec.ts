import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { journeys } from "@/data/journeys"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import type { FloorConfig, FloorGrid } from "@/game/siteTypes"
// Populate the family registry, exactly as the app does — a room resolves its family through it.
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

// Encounters are authored per pyramid and re-authored constantly — a new puzzle family, a journey
// that asks for a different pool, a trap dropped onto a floor. None of that may move a wall, because
// a run's explored cells and found corridors are filed under section hashes, and a hash moves when
// the layout does. The rule: a floor forgets what a player did on it only when its corridors really
// changed — their number or their length.
//
// Nothing about an encounter reaches the layout any more. Isolating a trap's stretch from leftover
// maze edges is the one thing that ever did, and world-gen now writes that down as `sealed`
// (placeEncounters), a structural field, so the assembler lays out a floor without ever asking what
// lives in it. This sweep is what keeps it that way.
describe("no encounter can move a wall", () => {
  const shape = (g: FloorGrid) =>
    JSON.stringify(
      g.cells.map(row =>
        row.map(c => (c.type === "empty" ? "." : `${c.type[0]}${[...c.dirs].sort().join("")}${c.hidden ? "H" : ""}`))
      )
    )
  const sectionHashes = (g: FloorGrid) =>
    JSON.stringify(
      [
        ...new Set(
          g.cells
            .flat()
            .filter(c => c.type !== "empty")
            .map(c => (c as { sectionHash?: string }).sectionHash)
        ),
      ].sort()
    )

  // Rewrite every authored encounter on a floor to one family, touching nothing structural.
  const rethemed = (config: FloorConfig, family: string): FloorConfig => {
    const floor = structuredClone(config) as unknown as Record<string, unknown>
    const walk = (node: Record<string, unknown>) => {
      if (node.encounter !== undefined || (node.pathPuzzles as number) > 0) node.encounter = family
      if (node.encountersByIndex) {
        const byIndex = node.encountersByIndex as Record<string, unknown>
        for (const k of Object.keys(byIndex)) byIndex[k] = family
      }
      for (const sub of (node.sideSections as Record<string, unknown>[]) ?? []) walk(sub)
    }
    walk(floor)
    return floor as unknown as FloorConfig
  }

  // A plain puzzle, a tomb puzzle, and a TRAP — the last one is the case that used to carve
  // differently, and the reason this sweep exists.
  it.each(["sumplete", "arithmetic-reflex"])(
    "survives every room becoming %s",
    family => {
      const moved: string[] = []
      for (const floor of allFloors()) {
        const opts = {
          resolveKeyRequirements,
          floorRef: { journeyId: floor.journeyId, floorIndex: floor.floorIndex },
        }
        const before = assembleFloor(floor.journeyId, floor.config, floor.seed, resolveEncounter, opts)
        const after = assembleFloor(floor.journeyId, rethemed(floor.config, family), floor.seed, resolveEncounter, opts)
        if (!before.success || !after.success) continue
        if (shape(before.grid) !== shape(after.grid)) moved.push(`${floor.label}: walls moved`)
        else if (sectionHashes(before.grid) !== sectionHashes(after.grid))
          moved.push(`${floor.label}: section hash moved`)
      }
      expect(moved, `${moved.length} floor(s) changed on an encounter swap:\n${moved.slice(0, 10).join("\n")}`).toEqual(
        []
      )
    },
    120_000
  )
})
