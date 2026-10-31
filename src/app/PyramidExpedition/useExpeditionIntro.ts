import { useEffect } from "react"
import type { FezContext } from "@/app/fez/context"
import { useReportOnce } from "@/app/reactions/useReport"
import { JOURNEYS_WITH_ARRIVAL, arrivalConversationId } from "@/app/fez/arrivalConversation"

type IntroArgs = {
  journeyId: string
  isTomb: boolean
  /** This board has blocks that can't be opened yet — Fez explains them the first time. */
  hasBlockedBlocks: boolean
  levelNr: number
  /** The level's authored exterior (`caveMouth`, `cavern`); absent for a plain pyramid. */
  exterior?: string
  showConversation: React.ContextType<typeof FezContext>["showConversation"]
}

// What Fez says on arrival. Everything here is offered on every visit: Fez remembers which
// conversations the player has already seen and skips those himself (FezCompanion), and queues what
// he does play in call order.
export const useExpeditionIntro = ({
  journeyId,
  isTomb,
  hasBlockedBlocks,
  levelNr,
  exterior,
  showConversation,
}: IntroArgs): void => {
  useEffect(() => {
    // A tomb's arrival is its cave's story beat (the siteArrived report below), and the tableau's own
    // lesson waits for the tableau (TombPuzzle).
    if (isTomb) return
    // The journey's beat is about the PLACE, so it plays with the place's pyramid on screen. Its id
    // is the journey's, not this pyramid's: heard at whichever pyramid comes first, it is skipped at
    // the rest. Story, so the tutorials toggle cannot silence it. `pyramidIntro` is about this board.
    if (JOURNEYS_WITH_ARRIVAL.has(journeyId))
      showConversation(arrivalConversationId(journeyId), undefined, { story: true })
    showConversation("pyramidIntro")
    if (hasBlockedBlocks) showConversation("pyramidBlockedBlocks")
  }, [journeyId, isTomb, showConversation, hasBlockedBlocks])
  // Told once per level shown: a re-render, or the blocks changing, is not another arrival. After the
  // offers above, since effects run in order: what a listener queues on arrival follows the welcome.
  useReportOnce(`${journeyId}:${levelNr}`, { kind: "siteArrived", journeyId, levelNr, exterior })
}
