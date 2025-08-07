import { createContext } from "react"

export type FezConversationResult =
  | "not-loaded"
  | "complete"
  | "skipped"
  | "seen-earlier"

export const FezContext = createContext<{
  showConversation: (
    conversationId: string,
    onComplete?: (result: FezConversationResult) => void
  ) => void
}>({
  showConversation: () => {
    throw new Error("FezContext not provided")
  },
})
