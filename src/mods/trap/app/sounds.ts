import healUrl from "@/assets/audio/heal.m4a?url"
import heartLostUrl from "@/assets/audio/heart-lost.m4a?url"
import trapFiresUrl from "@/assets/audio/trap-fires.m4a?url"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"

export const HEAL_SOUND = "trap.heal"
export const TRAP_FIRES_SOUND = "trap.fires"
export const HEART_LOST_SOUND = "trap.heartLost"

if (isModEnabled("trap")) {
  registerSound(TRAP_FIRES_SOUND, { url: trapFiresUrl, gain: 0.7 })
  registerSound(HEART_LOST_SOUND, { url: heartLostUrl, gain: 0.8 })
  registerSound(HEAL_SOUND, { url: healUrl, gain: 0.6 })
}
