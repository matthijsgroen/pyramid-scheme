import type { FC } from "react"
import type { CombinedJourneyState } from "@/app/state/useJourneys"

// Mods contribute extra content inside a journey's card on the travel screen (the tableau
// inventory preview, say). Core renders every registered slot on every card it draws and names no
// mod; a slot is handed the journey's state and decides for itself whether it has anything to show,
// returning null when it doesn't. Same shape as the site-map HUD registry — see
// docs/mods/app-plugins-design.md.
export type JourneyCardSlot = {
  id: string
  order?: number
  Component: FC<{ journeyInfo: CombinedJourneyState }>
}

const registry: JourneyCardSlot[] = []

export const registerJourneyCardSlot = (slot: JourneyCardSlot) => registry.push(slot)

export const journeyCardSlots = (): readonly JourneyCardSlot[] =>
  [...registry].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
