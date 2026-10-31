import { useEffect } from "react"
import type { FezContext } from "@/app/fez/context"
import { useReportOnce } from "@/app/reactions/useReport"
import type { ArrivalPromptKind } from "./useSiteNavigation"

/** The conversation that explains the glowing pillar: the site's one way out. */
export const EXIT_INTRO = "exitPillar"

/**
 * Explains the pillar where it stands, the first time the player reaches one, so the words come with the
 * thing in view rather than piled onto the meeting before it. Offered on every arrival at an exit: the
 * companion plays a conversation once and skips it after (FezCompanion).
 */
export const useExitIntro = (
  promptKind: ArrivalPromptKind | undefined,
  showConversation: React.ContextType<typeof FezContext>["showConversation"],
  site: { journeyId: string; levelNr: number; exterior?: string }
): void => {
  // Reported at each arrival at the exit; stepping off it re-arms the next one.
  useReportOnce(promptKind === "exit" ? "exit" : undefined, { kind: "exitReached", ...site })
  useEffect(() => {
    if (promptKind === "exit") showConversation(EXIT_INTRO)
  }, [promptKind, showConversation])
}
