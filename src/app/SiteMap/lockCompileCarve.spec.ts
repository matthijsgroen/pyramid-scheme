import { describe, expect, it } from "vitest"
import "@/mods/registerModApps"
import { getFamilyPlugin, resolveEncounter } from "@/app/families/familyRegistry"
import { resolveMechanicKind } from "@/game/mechanics"
import { floorLock } from "@/game/floorLock"
import { compileLock, type LockFragment } from "@/game/lockCompile"
import { walkLock } from "@/game/lockWalk"
import { assembleFloor } from "@/game/siteAssembler"
import type { FloorConfig } from "@/game/siteTypes"
import type { Lock } from "@/game/lockAuthoring"
import { BINDING, mirrorForkLock, sluiceLock } from "@/game/testSupport/lockFixtures"

const fragmentOf = (lock: Lock): LockFragment => {
  const result = compileLock(lock, BINDING, { kinds: resolveMechanicKind })
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result.faults)}`)
  return result.fragment
}

describe("a compiled lock carves and walks sound", () => {
  const carve = (config: FloorConfig, seed: number) =>
    assembleFloor("lock-compile", config, seed, resolveEncounter, {
      resolveKeyRequirements: (familyId, ctx) => getFamilyPlugin(familyId)?.meta.resolveKeyRequirements?.(ctx),
      floorRef: { journeyId: "lock-compile", floorIndex: 0 },
    })

  const sweep = (config: FloorConfig, seeds: number) => {
    const walks = Array.from({ length: seeds }, (_, n) => {
      const result = carve(config, n + 1)
      return result.success ? walkLock(floorLock(result.grid)!) : undefined
    })
    return walks.filter(walk => walk !== undefined)
  }

  const floorOf = (fragment: LockFragment, base: Partial<FloorConfig>): FloorConfig => ({
    pathPuzzles: 0,
    difficulty: "expert",
    end: "treasure",
    exitOrStaircase: "exit",
    sideSections: [],
    ...base,
    regionLayout: fragment.regionLayout,
    obstacles: fragment.obstacles,
    controls: fragment.controls,
    ...(fragment.forks.length > 0 ? { forks: fragment.forks } : {}),
    ...(fragment.barrierOrder.length > 0 ? { barrierOrder: fragment.barrierOrder } : {}),
    ...(fragment.oneWayRealisation ? { oneWayRealisation: fragment.oneWayRealisation } : {}),
    ...(fragment.regionBarrierRealisation ? { regionBarrierRealisation: fragment.regionBarrierRealisation } : {}),
  })

  const section = { pathPuzzles: 0, difficulty: "expert" as const, end: "treasure" as const }

  it("walks the mirrorFork's carves sound on every seed that carves, and some do", { timeout: 120_000 }, () => {
    const walks = sweep(floorOf(fragmentOf(mirrorForkLock()), { packing: 9, sideSections: [section, section] }), 60)

    expect(walks.length).toBeGreaterThan(0)
    expect(walks.every(walk => walk.sound)).toBe(true)
  })

  it("walks the sluice's carves sound on every seed that carves, and some do", { timeout: 60_000 }, () => {
    const sections = [3, 1].map(pathPuzzles => ({ ...section, pathPuzzles }))
    const walks = sweep(floorOf(fragmentOf(sluiceLock()), { pathPuzzles: 2, sideSections: sections }), 12)

    expect(walks.length).toBeGreaterThan(0)
    expect(walks.every(walk => walk.sound)).toBe(true)
  })
})
