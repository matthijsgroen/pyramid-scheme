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
    showConversation("pyramidIntro")
    if (hasBlockedBlocks) showConversation("pyramidBlockedBlocks")
  }, [isTomb, showConversation, hasBlockedBlocks])
}
