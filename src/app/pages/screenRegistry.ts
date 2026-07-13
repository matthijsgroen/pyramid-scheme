import type { FC } from "react"

// Mods contribute full-screen pages to the base horizontal pager (alongside core's Travel +
// Collection). Core renders every registered screen without naming any mod — a screen is a
// prop-less component that sources its own data via hooks (e.g. the mosaic screen's
// useMosaicProgress). See docs/mods/app-plugins-design.md.
export type ModScreen = { id: string; Component: FC }

const registry: ModScreen[] = []

export const registerModScreen = (screen: ModScreen) => registry.push(screen)

export const modScreens = (): readonly ModScreen[] => registry
