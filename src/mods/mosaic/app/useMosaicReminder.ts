import { use, useEffect, useRef } from "react"
import { FezContext } from "@/app/fez/context"
import { useModState } from "@/app/state/useModState"
import { useGameStorage } from "@/support/useGameStorage"
import { travelReturn } from "../game/travelReminder"

/** What Fez says about the mosaic the first time a piece turns up, and the nudge he repeats later. */
export const MOSAIC_INTRO = "mosaicIntro"
export const MOSAIC_REMINDER = "mosaicReminder"

/**
 * Counts this return to the travel screen and, when it is due, has Fez remind the player of the pieces
 * still in hand (`travelReturn`). A tutorial like the explanation it follows, so the tutorials setting
 * silences it too: it only ever points at a screen.
 *
 * The explanation is asked first. It normally played at the find, so it reports `seen-earlier` and the
 * reminder follows; a player who found a piece before meeting Fez hears the explanation here instead.
 */
export const useMosaicReminder = ({ unplaced, ready }: { unplaced: number; ready: boolean }) => {
  const fez = use(FezContext)
  const [tutorialsEnabled, , tutorialsLoaded] = useGameStorage<boolean>("tutorialsEnabled", true)
  const [{ returns }, setReminder, reminderLoaded] = useModState<{ returns: number }>("mosaicReminder", {
    returns: 0,
  })
  // Once per mount: the screen mounts each time the player comes back to it.
  const counted = useRef(false)

  useEffect(() => {
    if (counted.current || !ready || !tutorialsLoaded || !reminderLoaded) return
    counted.current = true
    const canSpeak = fez.met !== false && !fez.speaking && tutorialsEnabled
    const next = travelReturn({ unplaced, returns, canSpeak })
    void setReminder({ returns: next.returns })
    if (!canSpeak || unplaced === 0) return
    fez.showConversation(MOSAIC_INTRO, result => {
      if (result === "seen-earlier" && next.remind)
        fez.showConversation(MOSAIC_REMINDER, undefined, { forceReplay: true })
    })
  }, [ready, tutorialsLoaded, reminderLoaded, fez, tutorialsEnabled, unplaced, returns, setReminder])
}
