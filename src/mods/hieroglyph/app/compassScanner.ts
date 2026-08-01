import { useCallback } from "react"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import type { CompassResult, FloorConfig, FloorGrid, TreasureReward } from "@/game/siteTypes"
import type { CompassScanner } from "@/app/SiteMap/detectorScanners"
import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import { generateNewSeed } from "@/game/random"
import { hashString } from "@/support/hashString"
import { useHieroglyphProgress } from "./useHieroglyphProgress"
import { hieroglyphFragmentSchema } from "./rewardSchema"

// What stands between the player and a fragment, as observed while walking the config. Raw facts
// only — the scanner can't see what the player holds, so the verdict is useDetector's job.
type FragmentAccess = { wardKeys: readonly string[]; hidden: boolean; inShop: boolean }
type FragmentHit = FragmentAccess & { pieceIndex: number }

const OPEN: FragmentAccess = { wardKeys: [], hidden: false, inShop: false }

// A section's own tomb-key gate, if any. Mirrors slots.ts's sWardKeys/subWardKeys accumulation so
// the client agrees with world-gen about what gates a slot.
const gateKeysOf = (s: { gate?: { type: string; wardKeyId?: string } }): readonly string[] =>
  s.gate?.type === "tomb-key" && s.gate.wardKeyId ? [s.gate.wardKeyId] : []

// A section's stock is buyable when its encounter resolved to the shop family. `encounter` may be a
// tag list, so read the first entry (same normalisation as slots.ts).
const isShop = (s: { encounter?: string | string[] }): boolean =>
  (Array.isArray(s.encounter) ? s.encounter[0] : s.encounter) === "fez-shop"

const scanFloorForFragments = (floor: FloorConfig, hieroglyphId: string): FragmentHit[] => {
  const hits: FragmentHit[] = []
  const checkReward = (r: FloorConfig["mainEndReward"], access: FragmentAccess) => {
    if (r?.type !== "hieroglyphFragment") return
    const fragment = hieroglyphFragmentSchema.parse(r)
    if (fragment.hieroglyphId === hieroglyphId) hits.push({ pieceIndex: fragment.pieceIndex, ...access })
  }
  // Fragments live under two node-reward names: the path-end `endReward` AND every `rewards[]`
  // entry (a shop node bakes its stock there). Scan both, or the compass can't point at a shop
  // that sells a fragment — the ownership-skip below then drops it once bought. Mirrors the
  // gen-side forEachReward sweep (validate.ts). Only `rewards[]` of a shop section is buyable
  // stock; a plain section's `rewards[]` is its puzzle-chain loot, which costs nothing.
  const scan = (
    s: {
      endReward?: FloorConfig["mainEndReward"]
      rewards?: FloorConfig["mainEndReward"][]
      encounter?: string | string[]
    },
    access: FragmentAccess
  ) => {
    checkReward(s.endReward, access)
    const stocked = isShop(s) ? { ...access, inShop: true } : access
    for (const r of s.rewards ?? []) checkReward(r, stocked)
  }
  // The floor's own main path is ungated by construction (a gate lives on a side section).
  checkReward(floor.mainEndReward, OPEN)
  for (const r of floor.rewards ?? []) checkReward(r, OPEN)
  for (const section of floor.sideSections ?? []) {
    const access: FragmentAccess = {
      wardKeys: gateKeysOf(section),
      hidden: !!section.hidden,
      inShop: false,
    }
    scan(section, access)
    // A sub-section sits behind its parent's gate as well as its own, and inherits its hiddenness.
    for (const sub of section.sideSections ?? [])
      scan(sub, {
        wardKeys: [...access.wardKeys, ...gateKeysOf(sub)],
        hidden: access.hidden || !!sub.hidden,
        inShop: false,
      })
  }
  return hits
}

const isTargetFragment = (r: TreasureReward | undefined, hieroglyphId: string, pieceIndex: number): boolean =>
  r?.type === "hieroglyphFragment" && r.hieroglyphId === hieroglyphId && r.pieceIndex === pieceIndex

// Find the cell (row,col) holding a given fragment piece in an assembled floor. A fragment sits in a
// room's `reward` OR, when sold at a shop, its `stock[]`. Returns undefined if the assembler didn't
// place it (defensive — the config scan already proved the reward exists).
const findFragmentCell = (grid: FloorGrid, hieroglyphId: string, pieceIndex: number): CompassResult["cell"] => {
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = grid.cells[row][col]
      if (cell.type !== "room") continue
      if (isTargetFragment(cell.reward, hieroglyphId, pieceIndex)) return { row, col }
      if (cell.stock?.some(s => isTargetFragment(s, hieroglyphId, pieceIndex))) return { row, col }
    }
  }
  return undefined
}

// A persistent interior's seed is a pure function of its id (useJourneys getJourney), so the compass
// can reproduce any floor's layout without live journey state: floorSeed = idSeed + levelNr + floor,
// where levelNr = levelIdx + 1 (SiteMapScreen: seed = randomSeed + levelNr, per floor + floorIdx).
const floorSeed = (journeyId: string, levelIdx: number, floorIdx: number): number =>
  generateNewSeed(hashString(journeyId), 1) + (levelIdx + 1) + floorIdx

// The hieroglyph mod's compass scanner: every world location of the target hieroglyph's fragment
// pieces the player hasn't collected yet. Level-aware (§7.2 narrow inward): the raw hits always
// carry pyramid (journeyId) + floor (levelIdx/floorIdx); at level 3 each hit also gets its exact
// `cell`, resolved by assembling that floor. Lower levels skip assembly (the panel hides the finer
// fields anyway). Registered from the mod's app entrypoint, so core surfaces compass hits without
// naming `hieroglyphFragment`. hieroglyph off → not registered → the compass yields nothing.
export const useHieroglyphCompassScanner = (): CompassScanner => {
  const { hasFragment, compassLevel } = useHieroglyphProgress()
  return useCallback(
    (target: string): CompassResult[] => {
      const results: CompassResult[] = []
      for (const [journeyId, levels] of Object.entries(generatedWorldConfigs)) {
        levels.forEach((floors, levelIdx) => {
          floors.forEach((floor, floorIdx) => {
            const pieces = scanFloorForFragments(floor, target).filter(p => !hasFragment(target, p.pieceIndex))
            if (pieces.length === 0) return
            // Assemble once per floor only at L3 (exact-cell precision); a failed assembly degrades
            // to floor-level (cell stays undefined) rather than dropping the hit.
            const grid =
              compassLevel >= 3
                ? (() => {
                    const r = assembleFloor(
                      journeyId,
                      floor,
                      floorSeed(journeyId, levelIdx, floorIdx),
                      resolveEncounter
                    )
                    return r.success ? r.grid : undefined
                  })()
                : undefined
            for (const { pieceIndex, wardKeys, hidden, inShop } of pieces) {
              results.push({
                journeyId,
                levelIdx,
                floorIdx,
                hieroglyphId: target,
                pieceIndex,
                ...(wardKeys.length > 0 ? { wardKeys } : {}),
                ...(hidden ? { hidden } : {}),
                ...(inShop ? { inShop } : {}),
                ...(grid ? { cell: findFragmentCell(grid, target, pieceIndex) } : {}),
              })
            }
          })
        })
      }
      return results
    },
    [hasFragment, compassLevel]
  )
}
