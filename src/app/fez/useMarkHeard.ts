import { useCallback } from "react"
import { useGameStorage } from "@/support/useGameStorage"

/** Writes conversations down as heard without playing them, into the same record the companion keeps. */
export const useMarkHeard = (): ((ids: readonly string[]) => Promise<unknown>) => {
  const [, setConversations] = useGameStorage<Record<string, boolean>>("conversations", {})
  return useCallback(
    (ids: readonly string[]) =>
      setConversations(prev => ({ ...prev, ...Object.fromEntries(ids.map(id => [id, true])) })),
    [setConversations]
  )
}
