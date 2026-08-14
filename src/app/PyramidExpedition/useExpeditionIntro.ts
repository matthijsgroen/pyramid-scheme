import { useEffect, useRef } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import type { FezContext } from "@/app/fez/context"

type IntroArgs = {
  isTomb: boolean
  /** This board has blocks that can't be opened yet — Fez explains them the first time. */
  hasBlockedBlocks: boolean
  showConversation: React.ContextType<typeof FezContext>["showConversation"]
}

// What Fez says on arrival. A tomb gets its tutorial once ever — read from a ref taken at mount, so
// storing "seen" mid-conversation can't re-trigger this effect and cut him off mid-sentence.
export const useExpeditionIntro = ({ isTomb, hasBlockedBlocks, showConversation }: IntroArgs): void => {
  const [tombTutorialSeen, setTombTutorialSeen] = useGameStorage<boolean>("tombTutorialSeen", false)
  const tombTutorialSeenAtMount = useRef(tombTutorialSeen)

  useEffect(() => {
    if (isTomb) {
      if (!tombTutorialSeenAtMount.current) {
        showConversation("tombIntro", () => {
          setTombTutorialSeen(true)
          showConversation("tombTutorial")
        })
      } else {
        showConversation("tombIntro")
      }
      return
    }
    showConversation("pyramidIntro")
    if (hasBlockedBlocks) showConversation("pyramidBlockedBlocks")
  }, [isTomb, showConversation, setTombTutorialSeen, hasBlockedBlocks])
}
