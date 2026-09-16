import { assembleFloor } from "@/game/siteAssembler"
import { resolveEncounter } from "@/app/families/familyRegistry"
import type { SiteConfig } from "@/game/siteTypes"
import { cellAddress, floorOfAddress } from "./cellIdentity"

// Which floor the player stands on: read off the persisted position, never tracked alongside it.
// The position write is async (it goes through storage), so a separately-held floor state switched
// a render earlier than the position it belongs to — one render on the new floor with the old
// floor's position, which falls back to the entrance and made the explorer walk from the entrance
// to the staircase it had just come out of.
export const floorOfPosition = (positionKey: string | null | undefined, floorCount: number): number => {
  if (!positionKey) return 0
  return Math.min(floorOfAddress(positionKey), floorCount - 1)
}

// The far side of a staircase: the same stairId's cell on whichever other floor carries it.
// Floors are assembled from the site's stable seed, so this is a pure lookup — no walking needed.
// The peer's address comes back with it: the grid that knows where the stairhead landed is right here,
// and the caller has no other way to name a cell on a floor it is not on.
export const stairPeerPosition = (
  journeyId: string,
  siteConfig: SiteConfig,
  seed: number,
  stairId: string,
  fromFloor: number
): { floor: number; pos: readonly [number, number]; address: string } | null => {
  for (let fi = 0; fi < siteConfig.length; fi++) {
    if (fi === fromFloor) continue
    const result = assembleFloor(journeyId, siteConfig[fi], seed + fi, resolveEncounter)
    if (!result.success) continue
    const peerPos = result.grid.staircases[stairId]
    if (!peerPos) continue
    const address = cellAddress(result.grid, fi, peerPos[0], peerPos[1])
    if (address) return { floor: fi, pos: peerPos, address }
  }
  return null
}
