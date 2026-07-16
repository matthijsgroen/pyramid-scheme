import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react"
import "@/mods/registerModApps" // populate the perk-contribution registry (all mods on)
import { useMergedPerkContributions } from "./perkContributions"
import { TREASURE_PERKS } from "@/mods/tombTreasure/game/treasurePerks"

// Guards the open-payload typo risk (§8.0): a stat perk whose `type` string no mod grants would
// silently no-op. `describe` is defined only by the perk's owning mod, so a defined describe proves
// an owner exists — checked here for every stat perk in the authored TREASURE_PERKS, all mods on.
// The non-perk types (addTombKey + discovery handle those) are not granted via the seam.
const NON_PERK_TYPES = new Set(["none", "tier-unlock", "location-key"])

describe("perk contributions cover every authored stat perk", () => {
  it("every stat-perk type in TREASURE_PERKS has a registered owner", () => {
    const { result } = renderHook(() => useMergedPerkContributions())
    const { describe: describePerk } = result.current
    for (const [keyId, perk] of Object.entries(TREASURE_PERKS)) {
      if (NON_PERK_TYPES.has(perk.type)) continue
      expect(describePerk(perk), `${keyId} (${perk.type}) has no owning mod`).toBeDefined()
    }
  })
})
