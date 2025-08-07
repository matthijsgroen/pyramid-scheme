import { useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Fez } from "./Fez"
import { useGameStorage } from "@/support/useGameStorage"
import { FezContext, type FezConversationResult } from "./context"

export const FezCompanion: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  )
  const conversationQueue = useRef<
    {
      conversation: string
      onComplete: (result: FezConversationResult) => void
    }[]
  >([])
  const [conversations, setConversations, loaded] = useGameStorage<
    Record<string, boolean>
  >("conversations", {})

  const contextValue = useMemo(
    () => ({
      showConversation: (
        conversationId: string,
        onComplete?: (result: FezConversationResult) => void
      ) => {
        console.log("Showing conversation:", conversationId, conversations)
        if (!loaded) {
          return onComplete?.("not-loaded")
        }
        if (conversations[conversationId]) {
          return onComplete?.("seen-earlier")
        }
        const entry = {
          conversation: conversationId,
          onComplete: (result: FezConversationResult) => {
            console.log("completing conversation:", conversationId, result)
            setConversations((prev) => ({
              ...prev,
              [conversationId]: true,
            })).then(() => {
              // remove from queue
              conversationQueue.current = conversationQueue.current.filter(
                (item) => item !== entry
              )
              onComplete?.(result)
              if (conversationQueue.current.length > 0) {
                setActiveConversation(conversationQueue.current[0].conversation)
              } else {
                setActiveConversation(null)
              }
            })
          },
        }
        conversationQueue.current.push(entry)
        if (conversationQueue.current.length === 1) {
          setActiveConversation(conversationId)
        }
      },
    }),
    [conversations, loaded, setConversations]
  )

  return (
    <>
      <FezContext.Provider value={contextValue}>{children}</FezContext.Provider>
      {createPortal(
        activeConversation && (
          <Fez
            key={activeConversation}
            conversation={activeConversation}
            onComplete={(result) => {
              conversationQueue.current[0].onComplete(result)
            }}
          />
        ),
        document.body
      )}
    </>
  )
}
