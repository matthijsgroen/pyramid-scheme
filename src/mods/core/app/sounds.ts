import chestUrl from "@/assets/audio/chest-opens.m4a?url"
import { registerSound } from "@/app/audio/soundRegistry"

export const CHEST_OPENS_SOUND = "core.chestOpens"

registerSound(CHEST_OPENS_SOUND, { url: chestUrl, gain: 0.8 })
