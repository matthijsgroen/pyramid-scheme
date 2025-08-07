import { useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Fez } from "./Fez"
import { useGameStorage } from "@/support/useGameStorage"
import { FezContext } from "./context"

export const FezCompanion: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [activeConversation, setActiveConversation] = useState<string | null>(
    null
  )
  const resolver = useRef<() => void>(() => {})
  const [conversations, setConversations, loaded] = useGameStorage<
    Record<string, boolean>
  >("conversations", {})

  const contextValue = useMemo(
    () => ({
      showConversation: async (conversationId: string) => {
        if (!loaded) {
          return Promise.resolve()
        }
        if (conversations[conversationId]) {
          return Promise.resolve()
        }
        return new Promise<void>((resolve) => {
          resolver.current = resolve
          setActiveConversation(conversationId)
        })
      },
    }),
    [conversations, loaded]
  )

  return (
    <>
      <FezContext.Provider value={contextValue}>{children}</FezContext.Provider>
      {createPortal(
        activeConversation && (
          <Fez
            conversation={activeConversation}
            onComplete={() => {
              setConversations((prev) => ({
                ...prev,
                [activeConversation]: true,
              })).then(() => {
                setActiveConversation(null)
                resolver.current()
              })
            }}
          />
        ),
        document.body
      )}
    </>
  )
}
