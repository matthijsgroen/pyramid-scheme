import { useEffect, useRef } from "react"
import { playSound } from "@/app/audio/audio"
import { CORE_SOUNDS } from "@/app/audio/coreSounds"

/** A quick tap past the completion overlay moves the level on while the pyramid's stones still slide; this lets them finish. */
const AFTER_STONES_S = 1

/**
 * Plays on the change only: a finished journey still reads `levelNr > levelCount` on every reload, so
 * mounting plays nothing, and only a rising `levelNr` (one `completeLevel`) does.
 */
export const useLevelSounds = (levelNr: number, levelCount: number): void => {
  const previous = useRef(levelNr)
  useEffect(() => {
    const was = previous.current
    previous.current = levelNr
    if (levelNr <= was) return
    playSound(levelNr > levelCount ? CORE_SOUNDS.journeyComplete : CORE_SOUNDS.levelComplete, {
      delay: AFTER_STONES_S,
    })
  }, [levelNr, levelCount])
}
