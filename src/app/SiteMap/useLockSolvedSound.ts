import { useEffect, useRef } from "react"
import { playSound } from "@/app/audio/audio"
import { CORE_SOUNDS } from "@/app/audio/coreSounds"
import { gateKeyOf } from "@/game/carve/ids"
import type { FloorRef } from "@/game/carve/state"
import type { PlacedLock } from "@/game/floorLocks"
import { solvedLocks } from "@/game/lockSolved"

const floorKeyOf = (floorRef: FloorRef) => `${floorRef.journeyId}#${floorRef.levelIndex ?? 0}#${floorRef.floorIndex}`

/**
 * Chimes once per lock when its last door opens. A floor seeds what is already solved without playing, so a
 * reload or a walk up the stairs is silent, and a lock that chimed stays quiet when its door shuts and opens again.
 */
export const useLockSolvedSound = ({
  locks,
  openGateKeys,
  floorRef,
}: {
  locks: readonly PlacedLock[] | undefined
  openGateKeys: ReadonlySet<string>
  floorRef: FloorRef
}): void => {
  const seen = useRef<{ floor: string; fired: Set<string> } | undefined>(undefined)
  const floor = floorKeyOf(floorRef)

  useEffect(() => {
    const solved = solvedLocks(locks ?? [], id => openGateKeys.has(gateKeyOf(floorRef, id)))
    if (seen.current?.floor !== floor) {
      seen.current = { floor, fired: solved }
      return
    }
    for (const instance of solved) {
      if (seen.current.fired.has(instance)) continue
      seen.current.fired.add(instance)
      playSound(CORE_SOUNDS.lockSolved)
    }
  }, [floor, floorRef, locks, openGateKeys])
}
