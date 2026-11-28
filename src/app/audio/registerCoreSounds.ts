import campfireUrl from "@/assets/audio/campfire.m4a?url"
import corridorOpensUrl from "@/assets/audio/corridor-opens.m4a?url"
import footstepUrl from "@/assets/audio/footstep.m4a?url"
import journeyCompleteUrl from "@/assets/audio/journey-complete.m4a?url"
import puzzleSolvedUrl from "@/assets/audio/puzzle-solved.m4a?url"
import puzzleTapStoneUrl from "@/assets/audio/puzzle-tap-stone.m4a?url"
import puzzleTapWoodUrl from "@/assets/audio/puzzle-tap-wood.m4a?url"
import lockSolvedUrl from "@/assets/audio/lock-solved.m4a?url"
import pyramidOpensUrl from "@/assets/audio/pyramid-opens.m4a?url"
import { CORE_SOUNDS } from "./coreSounds"
import { registerSound } from "./soundRegistry"

// The moments core itself plays. Every effect file is loudness-matched, so a gain here is the moment's place in the
// mix: below 1 sits it further under the ambience.
registerSound(CORE_SOUNDS.pyramidOpens, { url: pyramidOpensUrl, gain: 0.8 })
registerSound(CORE_SOUNDS.corridorOpens, { url: corridorOpensUrl, gain: 0.7 })
registerSound(CORE_SOUNDS.footstep, { url: footstepUrl, gain: 0.5 })
registerSound(CORE_SOUNDS.campfire, { url: campfireUrl, gain: 0.2 })
registerSound(CORE_SOUNDS.journeyComplete, { url: journeyCompleteUrl, gain: 0.7 })
registerSound(CORE_SOUNDS.lockSolved, { url: lockSolvedUrl, gain: 0.7 })
registerSound(CORE_SOUNDS.puzzleSolved, { url: puzzleSolvedUrl, gain: 0.8 })
registerSound(CORE_SOUNDS.puzzleTapStone, { url: puzzleTapStoneUrl, gain: 0.35 })
registerSound(CORE_SOUNDS.puzzleTapWood, { url: puzzleTapWoodUrl, gain: 0.35 })
