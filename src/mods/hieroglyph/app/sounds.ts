import stoneUrl from "@/assets/audio/stone.m4a?url"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"

export const TABLEAU_COMPLETE_SOUND = "hieroglyph.tableauComplete"
export const TILE_PLACED_SOUND = "hieroglyph.tilePlaced"

if (isModEnabled("hieroglyph")) registerSound(TILE_PLACED_SOUND, { url: stoneUrl, gain: 0.6 })
