import balanceUrl from "@/assets/audio/balance-settles.m4a?url"
import pourUrl from "@/assets/audio/canister-pour.m4a?url"
import scrollUrl from "@/assets/audio/scroll-furls.m4a?url"
import { registerSound } from "@/app/audio/soundRegistry"
import { isModEnabled } from "@/mods/registeredMods"

export const CANISTER_POUR_SOUND = "puzzle.canisterPour"
export const BALANCE_SETTLES_SOUND = "puzzle.balanceSettles"
export const SCROLL_FURLS_SOUND = "puzzle.scrollFurls"

if (isModEnabled("puzzle")) {
  registerSound(CANISTER_POUR_SOUND, { url: pourUrl, gain: 0.6 })
  registerSound(BALANCE_SETTLES_SOUND, { url: balanceUrl, gain: 0.7 })
  registerSound(SCROLL_FURLS_SOUND, { url: scrollUrl, gain: 0.7 })
}
