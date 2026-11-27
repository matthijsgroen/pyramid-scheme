import rewardUrl from "@/assets/audio/reward-harp.m4a?url"
import stoneUrl from "@/assets/audio/stone.m4a?url"
import tombPanelUrl from "@/assets/audio/tomb-panel.m4a?url"
import { rewardSound } from "@/app/audio/coreSounds"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"

export const TILE_PLACED_SOUND = "hieroglyph.tilePlaced"
export const LOCK_PANEL_SOUND = "hieroglyph.lockPanel"

if (isModEnabled("hieroglyph")) {
  registerSound(TILE_PLACED_SOUND, { url: stoneUrl, gain: 0.6 })
  registerSound(LOCK_PANEL_SOUND, { url: tombPanelUrl, gain: 0.6 })
  registerSound(rewardSound("hieroglyphFragment"), { url: rewardUrl, gain: 1 })
}
