import { useEffect, useRef } from "react"
import { playSound } from "@/app/audio/audio"
import { CORE_SOUNDS } from "@/app/audio/coreSounds"

/**
 * Sounds a door opening when a gate on this floor opens: a lever thrown, a stone set, a mirror turned. The way past a
 * door is often already in sight, so the reveal wave (useRevealWave) has nothing to play for it. A floor change seeds
 * what stands open without playing.
 */
// ponytail: a door that also lays hidden ground bare plays this and the reveal's sound together, as one louder hit
export const useGateOpensSound = (openGateKeys: ReadonlySet<string>, floor: string): void => {
  const seen = useRef<{ floor: string; open: ReadonlySet<string> } | undefined>(undefined)
  useEffect(() => {
    const before = seen.current
    seen.current = { floor, open: openGateKeys }
    if (before?.floor !== floor) return
    if ([...openGateKeys].some(key => !before.open.has(key))) playSound(CORE_SOUNDS.corridorOpens, { delay: 0.25 })
  }, [floor, openGateKeys])
}
