import { useEffect, useRef } from "react"

export type LevelParallax = {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
  currentLevelRef: React.RefObject<HTMLDivElement | null>
  nextLevelRef: React.RefObject<HTMLDivElement | null>
  futureLevelRef: React.RefObject<HTMLDivElement | null>
}

// The three stacked boards drift at different rates as the player scrolls, so the pyramid ahead
// reads as further away. Written straight to the DOM rather than through state: a scroll handler
// that re-renders three boards per frame drops frames on a phone.
//
// Parallax is suspended while a level transition runs — the transition owns the same transforms, and
// a scroll mid-flight would fight it.
export const useLevelParallax = (startNextLevel: boolean): LevelParallax => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentLevelRef = useRef<HTMLDivElement>(null)
  const nextLevelRef = useRef<HTMLDivElement>(null)
  const futureLevelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    const handleScroll = () => {
      const scrollX = scrollContainer.scrollLeft
      const scrollY = scrollContainer.scrollTop

      if (futureLevelRef.current) {
        const baseTransform = startNextLevel ? "translateX(25%) scale(0.2)" : "translateX(35%) scale(0)"
        futureLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * 0.25}px, ${scrollY * 0.25}px) ${baseTransform}`
      }

      if (nextLevelRef.current) {
        const baseTransform = startNextLevel ? "translateX(0) scale(1)" : "translateX(25%) scale(0.2)"
        nextLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * 0.5}px, ${scrollY * 0.5}px) ${baseTransform}`
      }

      if (currentLevelRef.current) {
        const baseTransform = startNextLevel ? "translateX(-200%) scale(3)" : "scale(1)"
        currentLevelRef.current.style.transform = startNextLevel
          ? baseTransform
          : `translate(${scrollX * -0.1}px, ${scrollY * -0.1}px) ${baseTransform}`
      }
    }

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
    handleScroll()

    return () => scrollContainer.removeEventListener("scroll", handleScroll)
  }, [startNextLevel])

  return { scrollContainerRef, currentLevelRef, nextLevelRef, futureLevelRef }
}
