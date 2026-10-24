import { useLayoutEffect, useState, type RefObject } from "react"
import type { WallPlacement } from "@/ui/atoms/TombDoor"

/**
 * Where the encounter frame's wall lies behind a door standing in it, so the door shows the very stone it is
 * cut from. The frame lays its square panel over the whole card with `cover`, centred and pinned to the top
 * (EncounterModal); the card is the element holding `[data-encounter-content]`. Outside a frame — a story, a
 * test — there is nothing to line up with and the door keeps its own placement.
 */
export const useWallBehind = (door: RefObject<HTMLElement | null>): WallPlacement | undefined => {
  const [placement, setPlacement] = useState<WallPlacement>()
  useLayoutEffect(() => {
    const element = door.current
    const card = element?.closest("[data-encounter-content]")?.parentElement
    if (!element || !card) return
    const measure = () => {
      const cardBox = card.getBoundingClientRect()
      const doorBox = element.getBoundingClientRect()
      // The background starts inside the card's border, and a square panel laid with `cover` is as wide as
      // the card's longer side.
      const side = Math.max(card.clientWidth, card.clientHeight)
      const left = cardBox.left + card.clientLeft + (card.clientWidth - side) / 2 - doorBox.left
      const top = cardBox.top + card.clientTop - doorBox.top
      const size = `${side}px ${side}px`
      const position = `${left}px ${top}px`
      setPlacement(was => (was?.size === size && was.position === position ? was : { size, position }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(card)
    observer.observe(element)
    return () => observer.disconnect()
  }, [door])
  return placement
}
