import type { FC } from "react"

// Mods contribute widgets to the site-map HUD row (the strip beside the money balance). Core
// renders every registered widget in `order` without naming any mod — a widget is a prop-less
// component that reads its own mod state via hooks (e.g. the trap widget's useTrapProgress). See
// docs/mods/app-plugins-design.md.
export type HudWidget = { id: string; order?: number; Component: FC }

const registry: HudWidget[] = []

export const registerHudWidget = (widget: HudWidget) => registry.push(widget)

export const hudWidgets = (): readonly HudWidget[] => [...registry].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
