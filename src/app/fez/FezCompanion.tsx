import { useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Fez } from "./Fez"
import { latestGameValue, useGameStorage } from "@/support/useGameStorage"
import { FezContext, type FezConversationResult } from "./context"
import { shouldSkipConversation } from "./shouldSkipConversation"
import { fezMeeting, hasMetFez, type JourneyProgress } from "./fezMeeting"

export const FezCompanion: React.FC<{
  children: React.ReactNode
  /** How far the save has come through a journey — a save past the meeting's pyramid has met Fez. */
  journeyProgress?: (journeyId: string) => JourneyProgress | undefined
}> = ({ children, journeyProgress }) => {
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const conversationQueue = useRef<
    {
      conversation: string
      onComplete: (result: FezConversationResult) => void
    }[]
  >([])
  const [conversations, setConversations, loaded] = useGameStorage<Record<string, boolean>>("conversations", {})
  const [tutorialsEnabled] = useGameStorage<boolean>("tutorialsEnabled", true)

  const contextValue = useMemo(
    () => ({
      showConversation: (
        conversationId: string,
        onComplete?: (result: FezConversationResult) => void,
        options?: { forceReplay?: boolean; story?: boolean }
      ) => {
        if (!loaded) {
          return onComplete?.("not-loaded")
        }
        if (
          shouldSkipConversation({
            alreadySeen: !!conversations[conversationId],
            tutorialsEnabled,
            forceReplay: options?.forceReplay,
            story: options?.story,
          })
        ) {
          return onComplete?.("seen-earlier")
        }
        const entry = {
          conversation: conversationId,
          onComplete: (result: FezConversationResult) => {
            // A conversation dropped because Fez is not met yet stays unheard, so it can play once he is.
            const recorded =
              result === "unmet"
                ? Promise.resolve(latestGameValue<Record<string, boolean>>("conversations") ?? {})
                : setConversations(prev => ({ ...prev, [conversationId]: true }))
            recorded.then(v => {
              // remove from queue
              conversationQueue.current = conversationQueue.current.filter(item => item !== entry)
              onComplete?.(result)
              if (conversationQueue.current.length > 0) {
                const nextConversation = conversationQueue.current[0]
                if (v[nextConversation.conversation]) {
                  nextConversation.onComplete("seen-earlier")
                } else if (result === "unmet" && nextConversation.conversation === conversationId) {
                  // The same beat asked again: it would drop the same way, and re-activating the id
                  // already active mounts nothing, so it would sit at the head of the queue for good.
                  nextConversation.onComplete("unmet")
                } else {
                  setActiveConversation(nextConversation.conversation)
                }
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
    [conversations, loaded, setConversations, tutorialsEnabled]
  )

  const meeting = fezMeeting()
  const beforeMeeting =
    activeConversation !== meeting?.conversation &&
    !hasMetFez({
      meeting,
      heard: conversations,
      progress: meeting && journeyProgress?.(meeting.journeyId),
    })

  return (
    <>
      <FezContext.Provider value={contextValue}>{children}</FezContext.Provider>
      {createPortal(
        activeConversation && (
          <Fez
            key={activeConversation}
            conversation={activeConversation}
            beforeMeeting={beforeMeeting}
            onComplete={result => {
              conversationQueue.current[0].onComplete(result)
            }}
          />
        ),
        document.body
      )}
    </>
  )
}
