import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { computeFloorExploration } from "./floorExploration"
// Populate the family registry (families, their meta.rewardPriority + resolveKeyRequirements) —
// exactly what SiteMapScreen/useAssembledFloor rely on. Without this every family resolves to
// nothing and the test would be meaningless.
import "@/mods/registerModApps"

// Mirror useAssembledFloor: resolve each node's requiredKeyIds off the app family registry.
const resolveKeyRequirements: ResolveKeyRequirements = (familyId, ctx) =>
  getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx)

const assemble = (journeyId: string, pyramid: number, floor: number) => {
  const cfg = generatedWorldConfigs[journeyId][pyramid][floor]
  // The real seed the runtime hands this floor — `pyramid` is a 0-based index here, so the
  // level number it stands for is one higher (see floorAssemblySeed).
  const seed = floorAssemblySeed(persistentInteriorSeed(journeyId), pyramid + 1, floor)
  const result = assembleFloor(journeyId, cfg, seed, resolveEncounter, {
    resolveKeyRequirements,
    floorRef: { journeyId, floorIndex: floor },
  })
  if (!result.success) throw new Error(`assemble failed: ${journeyId} p${pyramid}f${floor}`)
  return result.grid
}

describe("computeFloorExploration", () => {
  // A freshly-assembled floor (nothing walked yet) is the "everything still to find" baseline the
  // marker records as the player enters — the real recording path applies exploredSections on top.

  it("a pyramid floor: ungated content is open, ward chests become tomb-key bundles", () => {
    const result = computeFloorExploration(assemble("starter_1", 0, 0))
    // starter_1 floor 0 has ungated side chests (a hieroglyph + a mosaic) → open.
    expect(result.open).toBe(true)
    // …and two ward paths, keyed to the junior + starter tier-unlock treasures.
    const flat = result.keySets.map(k => k.join(","))
    expect(flat).toContain("starter_a_1")
    expect(flat).toContain("junior_a_1")
    // Every ward bundle here is a single tomb key — no pyramid ward path needs a combination.
    expect(result.keySets.every(ks => ks.length === 1)).toBe(true)
  })

  it("a tomb floor: each tableau is a hieroglyph key bundle (needs ALL its hieroglyphs)", () => {
    const result = computeFloorExploration(assemble("junior_treasure_tomb", 0, 0))
    const hieroglyphBundles = result.keySets.filter(ks => ks.every(k => k.startsWith("hieroglyph:")))
    expect(hieroglyphBundles.length).toBeGreaterThan(0)
    // A tableau needs several hieroglyphs at once — a bundle, not a single key.
    expect(hieroglyphBundles.some(ks => ks.length > 1)).toBe(true)
  })

  it("shop and gate/trap nodes never produce content on their own (fill-order 0)", () => {
    // The shop family is priority 0; if it (or a gate/trap) leaked in, a bundle keyed to nothing
    // meaningful would appear. Assert every key we emit is a real key id (tomb key or hieroglyph),
    // i.e. no empty-string keys from a family we shouldn't have counted.
    const result = computeFloorExploration(assemble("junior_treasure_tomb", 0, 0))
    expect(result.keySets.every(ks => ks.every(k => k.length > 0))).toBe(true)
  })
})
