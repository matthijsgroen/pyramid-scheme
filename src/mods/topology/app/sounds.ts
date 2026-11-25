import leverUrl from "@/assets/audio/lever.m4a?url"
import plateUrl from "@/assets/audio/pressure-plate.m4a?url"
import sandUrl from "@/assets/audio/sand-recedes.m4a?url"
import tickUrl from "@/assets/audio/sequence-tick.m4a?url"
import squeezeUrl from "@/assets/audio/squeeze.m4a?url"
import stoneUrl from "@/assets/audio/stone.m4a?url"
import waterUrl from "@/assets/audio/water-recedes.m4a?url"
import ziplineUrl from "@/assets/audio/zipline.m4a?url"
import { barrierSound, CORE_SOUNDS, stoneMoveSound, throwSound, traversalSound } from "@/app/audio/coreSounds"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"
import { HANDLE_META } from "@/mods/topology/game/handle/meta"
import { NARROW_PASSAGE_META } from "@/mods/topology/game/narrowPassage/meta"
import { SAND_META, WATER_META, WEB_SAND_META } from "@/mods/topology/game/regionBarrier/meta"
import { ZIPLINE_META } from "@/mods/topology/game/zipline/meta"

// The sounds of the mechanisms this mod dresses, each under the name core plays the mechanism's moment by. A wrong
// sequence step is the same tick played low, below the scale its right steps climb.
if (isModEnabled("topology")) {
  registerSound(throwSound(HANDLE_META.id), { url: leverUrl, gain: 0.8 })
  for (const move of ["lift", "set", "take", "post"]) registerSound(stoneMoveSound(move), { url: stoneUrl, gain: 0.7 })
  registerSound(CORE_SOUNDS.platePressed, { url: plateUrl, gain: 0.6 })
  registerSound(CORE_SOUNDS.sequenceStep, { url: tickUrl, gain: 0.5 })
  registerSound(CORE_SOUNDS.sequenceWrong, { url: tickUrl, gain: 0.5, playbackRate: 0.6 })
  registerSound(traversalSound(ZIPLINE_META.id), { url: ziplineUrl, gain: 0.8 })
  registerSound(traversalSound(NARROW_PASSAGE_META.id), { url: squeezeUrl, gain: 0.9 })
  registerSound(barrierSound(WATER_META.id), { url: waterUrl, gain: 0.7 })
  registerSound(barrierSound(SAND_META.id), { url: sandUrl, gain: 0.7 })
  registerSound(barrierSound(WEB_SAND_META.id), { url: sandUrl, gain: 0.7 })
}
