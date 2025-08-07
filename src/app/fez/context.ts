import { createContext } from "react"

export const FezContext = createContext<{
  showConversation: (conversationId: string) => Promise<void>
}>({
  showConversation: async (_conversationId) => {
    // Implementation for showing the conversation
  },
})
