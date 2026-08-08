import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import type { SiteConfig } from "@/game/siteTypes"
import { decodeEdge } from "./useAssembledFloor"

// Which floor the player stands on: read off the persisted position, never tracked alongside it.
// The position write is async (it goes through storage), so a separately-held floor state switched
// a render earlier than the position it belongs to — one render on the new floor with the old
// floor's position, which falls back to the entrance and made the explorer walk from the entrance
// to the staircase it had just come out of.
export const floorOfPosition = (position: string | null | undefined, floorCount: number): number => {
  if (!position) return 0
  return Math.min(decodeEdge(position)[0], floorCount - 1)
}

// The far side of a staircase: the same stairId's cell on whichever other floor carries it.
// Floors are assembled from the site's stable seed, so this is a pure lookup — no walking needed.
export const stairPeerPosition = (
  journeyId: string,
  siteConfig: SiteConfig,
  seed: number,
  stairId: string,
  fromFloor: number
): { floor: number; pos: readonly [number, number] } | null => {
  for (let fi = 0; fi < siteConfig.length; fi++) {
    if (fi === fromFloor) continue
    const result = assembleFloor(journeyId, siteConfig[fi], seed + fi, resolveEncounter)
    if (!result.success) continue
    const peerPos = result.grid.staircases[stairId]
    if (peerPos) return { floor: fi, pos: peerPos }
  }
  return null
}
