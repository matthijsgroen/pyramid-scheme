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

const scanFloorForFragments = (floor: FloorConfig, hieroglyphId: string): number[] => {
  const results: number[] = []
  const checkReward = (r: FloorConfig["mainEndReward"]) => {
    if (r?.type !== "hieroglyphFragment") return
    const fragment = hieroglyphFragmentSchema.parse(r)
    if (fragment.hieroglyphId === hieroglyphId) results.push(fragment.pieceIndex)
  }
  // Fragments live under two node-reward names: the path-end `endReward` AND every `rewards[]`
  // entry (a shop node bakes its stock there). Scan both, or the compass can't point at a shop
  // that sells a fragment — the ownership-skip below then drops it once bought. Mirrors the
  // gen-side forEachReward sweep (validate.ts).
  const scan = (s: { endReward?: FloorConfig["mainEndReward"]; rewards?: FloorConfig["mainEndReward"][] }) => {
    checkReward(s.endReward)
    for (const r of s.rewards ?? []) checkReward(r)
  }
  checkReward(floor.mainEndReward)
  for (const r of floor.rewards ?? []) checkReward(r)
  for (const section of floor.sideSections ?? []) {
    scan(section)
    for (const sub of section.sideSections ?? []) scan(sub)
  }
  return results
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
            const pieces = scanFloorForFragments(floor, target).filter(p => !hasFragment(target, p))
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
            for (const pieceIndex of pieces) {
              results.push({
                journeyId,
                levelIdx,
                floorIdx,
                hieroglyphId: target,
                pieceIndex,
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
