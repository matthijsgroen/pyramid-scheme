import { use, useCallback } from "react"
import { FezContext } from "@/app/fez/context"
import { arrivalConversationId } from "@/app/fez/arrivalConversation"

/**
 * Setting off: the journey's own beat, played on the map before the travel happens.
 *
 * **A journey is the place; a pyramid is only a site in it.** Every arrival beat is written about
 * the place — the Valley of the Artisans, the Colossi, the Sphinx — and a journey holds two to four
 * pyramids the player opens in whatever order they like. Fired on the way into one, the beat landed
 * at whichever happened to be first, over a board of numbered blocks with nothing of the place on
 * screen; here the card they just chose is still behind it.
 *
 * Told as story, so the tutorials toggle cannot silence it. A journey with no beat of its own — and
 * a beat already heard — sets off immediately: `showConversation` reports straight back when it has
 * nothing to play, so the caller never has to know which case it was.
 */
export const useJourneyArrival = () => {
  const { showConversation } = use(FezContext)
  return useCallback(
    (journeyId: string, setOff: () => void) => {
      const arrival = arrivalConversationId(journeyId)
      if (arrival === "pyramidIntro") return setOff()
      showConversation(arrival, () => setOff(), { story: true })
    },
    [showConversation]
  )
}
