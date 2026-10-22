import { useEffect } from "react"
import type { FezContext } from "@/app/fez/context"
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
  showConversation: React.ContextType<typeof FezContext>["showConversation"]
): void => {
  useEffect(() => {
    if (promptKind === "exit") showConversation(EXIT_INTRO)
  }, [promptKind, showConversation])
}
