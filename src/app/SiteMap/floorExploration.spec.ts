import { describe, expect, it } from "vitest"
import { assembleFloor, type ResolveKeyRequirements } from "@/game/siteAssembler"
import { resolveEncounter, getFamilyPlugin } from "@/app/families/familyRegistry"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { floorAssemblySeed, persistentInteriorSeed } from "@/game/siteSeed"
import { computeFloorExploration } from "./floorExploration"
import type { FloorGrid, GridCell, RoomCell } from "@/game/siteTypes"
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

  // A tester walked a tomb floor to its end, opened every door that opens, and the marker still said
  // there was something to do. There was — a tableau needing hieroglyphs found in a pyramid, and the
  // chest behind it — and neither was anything they could act on from inside the tomb. The floor did
  // not claim to be `open`; it advertised a key bundle that named the chest's own section and not the
  // tableau standing in front of it, so it lit on keys that were never enough.
  const playedOut = (grid: FloorGrid): FloorGrid => ({
    ...grid,
    cells: grid.cells.map(row =>
      row.map(cell => {
        if (cell.type === "empty") return cell
        const asksForKeys = cell.type === "room" && ((cell as RoomCell).requiredKeyIds?.length ?? 0) > 0
        return asksForKeys ? cell : ({ ...cell, state: "completed" } as GridCell)
      })
    ),
  })

  it("a tomb floor played out to its end stops claiming to be open", () => {
    const grid = playedOut(assemble("junior_treasure_tomb", 0, 0))
    const result = computeFloorExploration(grid)

    // Nothing here is available for the asking any more.
    expect(result.open).toBe(false)
    // What is left is named, so the travel screen lights it the moment those hieroglyphs are held.
    expect(result.keySets.length).toBeGreaterThan(0)
    expect(result.keySets.every(ks => ks.every(k => k.startsWith("hieroglyph:")))).toBe(true)
  })

  it("a chest behind an unsolved tableau inherits the tableau's hieroglyphs", () => {
    // This is the guard for the tester's report — it fails without the inheritance, where the bundle
    // named only the chest's own section.
    const grid = playedOut(assemble("junior_treasure_tomb", 0, 0))
    const blockers = grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && (c.requiredKeyIds?.length ?? 0) > 0)
    const blockerKeys = new Set(blockers.flatMap(b => b.requiredKeyIds ?? []))
    expect(blockerKeys.size).toBeGreaterThan(0)

    // Every bundle draws only on keys some blocker on this floor asks for — nothing invented.
    for (const ks of computeFloorExploration(grid).keySets)
      for (const key of ks) expect(blockerKeys.has(key)).toBe(true)
    // And at least one bundle is bigger than any single tableau's own set: that is the inheritance.
    const widest = Math.max(...blockers.map(b => (b.requiredKeyIds ?? []).length))
    expect(computeFloorExploration(grid).keySets.some(ks => ks.length > widest)).toBe(true)
  })

  /**
   * A branch whose key is AUTHORED — minted by a room the player solves, never grown in a chest — is
   * content the player can still come back for, so the floor has to keep saying so.
   *
   * It does, through `open` rather than through a bundle: a floor-key gate asks for nothing the player
   * carries between sites, so what is behind it is available for the asking, one more walk away. A
   * bundle instead would name a key the travel screen's held-keys union never carries, and the floor
   * would go dark on the one branch the player still has to be sent back for.
   */
  const walkedUpTo = (grid: FloorGrid, held: ReadonlySet<string>): FloorGrid => {
    const moves: Record<string, [number, number]> = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] }
    const stood = new Set<string>()
    const work: [number, number][] = [[grid.entrancePos[0], grid.entrancePos[1]]]
    while (work.length > 0) {
      const [r, c] = work.pop()!
      const cell = grid.cells[r]?.[c]
      if (!cell || cell.type === "empty" || cell.hidden || stood.has(`${r},${c}`)) continue
      stood.add(`${r},${c}`)
      // The gate square is ground the player stands on; what is past it is not.
      if (cell.type === "room" && cell.requiredKeyId && !held.has(cell.requiredKeyId)) continue
      for (const dir of cell.dirs) {
        const [dr, dc] = moves[dir]
        work.push([r + dr, c + dc])
      }
    }
    return {
      ...grid,
      cells: grid.cells.map((row, r) =>
        row.map((cell, c) =>
          cell.type !== "empty" && stood.has(`${r},${c}`) ? ({ ...cell, state: "completed" } as GridCell) : cell
        )
      ),
    }
  }

  it("a floor whose authored-key branch is still shut keeps inviting the player back", () => {
    const grid = assemble("junior_2", 1, 0)
    const authored = grid.cells
      .flat()
      .filter((c): c is RoomCell => c.type === "room" && !!c.keyIsAuthored && !!c.requiredKeyId)
      .map(c => c.requiredKeyId!)
    expect(authored.length).toBe(2)

    // One shrine opened, its branch walked to the end, everything else on the floor done.
    expect(computeFloorExploration(walkedUpTo(grid, new Set([authored[0]]))).open).toBe(true)
    // Both opened and both walked: nothing left, and the floor stops asking.
    expect(computeFloorExploration(walkedUpTo(grid, new Set(authored))).open).toBe(false)
  })

  it("shop and gate/trap nodes never produce content on their own (fill-order 0)", () => {
    // The shop family is priority 0; if it (or a gate/trap) leaked in, a bundle keyed to nothing
    // meaningful would appear. Assert every key we emit is a real key id (tomb key or hieroglyph),
    // i.e. no empty-string keys from a family we shouldn't have counted.
    const result = computeFloorExploration(assemble("junior_treasure_tomb", 0, 0))
    expect(result.keySets.every(ks => ks.every(k => k.length > 0))).toBe(true)
  })
})
