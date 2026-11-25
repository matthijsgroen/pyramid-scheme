import rewardUrl from "@/assets/audio/reward-harp.m4a?url"
import treasureUrl from "@/assets/audio/treasure.m4a?url"
import { rewardSound } from "@/app/audio/coreSounds"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"

// A treasure is the biggest find there is, so it rings above the pluck of a map piece.
if (isModEnabled("tomb-treasure")) {
  registerSound(rewardSound("mapPiece"), { url: rewardUrl, gain: 0.5 })
  registerSound(rewardSound("tombKey"), { url: treasureUrl, gain: 0.9 })
}
