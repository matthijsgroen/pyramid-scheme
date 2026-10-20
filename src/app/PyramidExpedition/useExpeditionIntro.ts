import { useEffect } from "react"
import type { FezContext } from "@/app/fez/context"
import { JOURNEYS_WITH_ARRIVAL, arrivalConversationId } from "@/app/fez/arrivalConversation"

type IntroArgs = {
  journeyId: string
  isTomb: boolean
  /** This board has blocks that can't be opened yet — Fez explains them the first time. */
  hasBlockedBlocks: boolean
  showConversation: React.ContextType<typeof FezContext>["showConversation"]
}

// What Fez says on arrival. Everything here is offered on every visit: Fez remembers which
// conversations the player has already seen and skips those himself (FezCompanion), and queues what
// he does play in call order.
export const useExpeditionIntro = ({ journeyId, isTomb, hasBlockedBlocks, showConversation }: IntroArgs): void => {
  useEffect(() => {
    // The tableau's own lesson waits for the tableau (TombPuzzle): here it is not on screen yet.
    if (isTomb) {
      showConversation("tombIntro")
      return
    }
    // The journey's beat is about the PLACE, so it plays with the place's pyramid on screen. Its id
    // is the journey's, not this pyramid's: heard at whichever pyramid comes first, it is skipped at
    // the rest. Story, so the tutorials toggle cannot silence it. `pyramidIntro` is about this board.
    if (JOURNEYS_WITH_ARRIVAL.has(journeyId))
      showConversation(arrivalConversationId(journeyId), undefined, { story: true })
    showConversation("pyramidIntro")
    if (hasBlockedBlocks) showConversation("pyramidBlockedBlocks")
  }, [journeyId, isTomb, showConversation, hasBlockedBlocks])
}
