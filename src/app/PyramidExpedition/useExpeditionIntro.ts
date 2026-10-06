import { useEffect } from "react"
import type { FezContext } from "@/app/fez/context"

type IntroArgs = {
  isTomb: boolean
  /** This board has blocks that can't be opened yet — Fez explains them the first time. */
  hasBlockedBlocks: boolean
  showConversation: React.ContextType<typeof FezContext>["showConversation"]
}

// What Fez says on arrival. Everything here is offered on every visit: Fez remembers which
// conversations the player has already seen and skips those himself (FezCompanion), and queues what
// he does play in call order.
export const useExpeditionIntro = ({ isTomb, hasBlockedBlocks, showConversation }: IntroArgs): void => {
  useEffect(() => {
    if (isTomb) {
      showConversation("tombIntro")
      showConversation("tombTutorial")
      return
    }
    // Only the teaching. The journey's own arrival beat is about the PLACE and plays on the map as
    // the player sets off (`useJourneyArrival`) — here it landed over a board of numbered blocks,
    // in whichever of the journey's pyramids happened to be opened first. `pyramidIntro` is about
    // this board, plays once ever, and is the only thing that explains the arithmetic.
    showConversation("pyramidIntro")
    if (hasBlockedBlocks) showConversation("pyramidBlockedBlocks")
  }, [isTomb, showConversation, hasBlockedBlocks])
}
