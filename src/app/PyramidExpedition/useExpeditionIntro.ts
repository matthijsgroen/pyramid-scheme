import { useEffect } from "react"
import type { FezContext } from "@/app/fez/context"
import { arrivalConversationId } from "@/app/fez/arrivalConversation"

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
    if (isTomb) {
      showConversation("tombIntro")
      showConversation("tombTutorial")
      return
    }
    // Where we are, then how the board works — both, never one instead of the other. A journey's own
    // arrival is a story beat and plays whatever the tutorials toggle says; `pyramidIntro` is teaching,
    // plays once ever, and is the only thing that explains the arithmetic. Offering the arrival ALONE
    // left that explanation firing on the one pyramid that has no arrival, which by then was the last
    // journey in the game.
    const arrival = arrivalConversationId(journeyId)
    if (arrival !== "pyramidIntro") showConversation(arrival, undefined, { story: true })
    showConversation("pyramidIntro")
    if (hasBlockedBlocks) showConversation("pyramidBlockedBlocks")
  }, [isTomb, showConversation, hasBlockedBlocks, journeyId])
}
