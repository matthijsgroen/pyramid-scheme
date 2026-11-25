import coinsUrl from "@/assets/audio/coins.m4a?url"
import { rewardSound } from "@/app/audio/coreSounds"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"

/** Coins changing hands at Fez's stall, bought or sold. */
export const SHOP_COINS_SOUND = "shop.coins"

if (isModEnabled("shop")) {
  registerSound(SHOP_COINS_SOUND, { url: coinsUrl, gain: 0.6 })
  registerSound(rewardSound("money"), { url: coinsUrl, gain: 0.6 })
}
