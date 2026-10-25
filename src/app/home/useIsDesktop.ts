import { useEffect, useState } from "react"

// Tailwind's `lg`: the camp keeps the journeys beside it from here on, and below it opens them as a popup.
const DESKTOP_QUERY = "(min-width: 1024px)"

export const useIsDesktop = (): boolean => {
  const [matches, setMatches] = useState(() => !!window.matchMedia?.(DESKTOP_QUERY).matches)
  useEffect(() => {
    const query = window.matchMedia?.(DESKTOP_QUERY)
    if (!query) return
    const onChange = () => setMatches(query.matches)
    query.addEventListener("change", onChange)
    return () => query.removeEventListener("change", onChange)
  }, [])
  return matches
}
