import { useCallback } from "react"
import { useGameStorage } from "@/support/useGameStorage"

/**
 * Whether the tap hint over one target still shows, and the call that retires it.
 *
 * Retired for good once the player taps the target, and never shown before the save has loaded, so a
 * returning player does not see it flash on the way in.
 */
export const useTapHint = (id: string): [show: boolean, tapped: () => void] => {
  const [tapped, setTapped, loaded] = useGameStorage<Record<string, boolean>>("tapHints", {})
  const retire = useCallback(() => {
    void setTapped(prev => (prev[id] ? prev : { ...prev, [id]: true }))
  }, [id, setTapped])
  return [loaded && !tapped[id], retire]
}
