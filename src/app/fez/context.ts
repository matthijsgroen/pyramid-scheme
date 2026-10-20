import { createContext } from "react"

export type FezConversationResult = "not-loaded" | "complete" | "skipped" | "seen-earlier" | "unmet"

export const FezContext = createContext<{
  showConversation: (
    conversationId: string,
    onComplete?: (result: FezConversationResult) => void,
    options?: { forceReplay?: boolean; story?: boolean }
  ) => void
  /** Someone is talking: whatever else asks for the player's eye waits until the conversation is over. */
  speaking?: boolean
}>({
  showConversation: () => {
    throw new Error("FezContext not provided")
  },
})
