import findUrl from "@/assets/audio/find.m4a?url"
import { rewardSound } from "@/app/audio/coreSounds"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"

if (isModEnabled("mosaic")) registerSound(rewardSound("mosaicPiece"), { url: findUrl, gain: 0.5 })
