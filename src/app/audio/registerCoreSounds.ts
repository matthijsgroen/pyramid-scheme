import campfireUrl from "@/assets/audio/campfire.m4a?url"
import corridorOpensUrl from "@/assets/audio/corridor-opens.m4a?url"
import footstepUrl from "@/assets/audio/footstep.m4a?url"
import pyramidOpensUrl from "@/assets/audio/pyramid-opens.m4a?url"
import { CORE_SOUNDS } from "./coreSounds"
import { registerSound } from "./soundRegistry"

// The moments core itself plays. Every effect file is loudness-matched, so a gain here is the moment's place in the
// mix: below 1 sits it further under the ambience.
registerSound(CORE_SOUNDS.pyramidOpens, { url: pyramidOpensUrl, gain: 0.8 })
registerSound(CORE_SOUNDS.corridorOpens, { url: corridorOpensUrl, gain: 0.7 })
registerSound(CORE_SOUNDS.footstep, { url: footstepUrl, gain: 0.5 })
registerSound(CORE_SOUNDS.campfire, { url: campfireUrl, gain: 0.45 })
