import { playSound } from "@/app/audio/audio"
import { CORE_SOUNDS } from "@/app/audio/coreSounds"

// A door that opens and the corridor it lays bare are one opening: calls closer together than this play once, so an
// opening never sounds louder for being both.
const SAME_OPENING_MS = 300
let lastAt = -Infinity

/** The sound of a way opening: a door on the floor, or a corridor coming out of the rock. */
export const playOpeningSound = (): void => {
  const now = performance.now()
  if (now - lastAt < SAME_OPENING_MS) return
  lastAt = now
  playSound(CORE_SOUNDS.corridorOpens, { delay: 0.25 })
}
