import type { FC } from "react"

// Mods contribute full-screen pages to the base horizontal pager (alongside core's Travel +
// Collection). Core renders every registered screen without naming any mod — a screen is a
// prop-less component that sources its own data via hooks (e.g. the mosaic screen's
// useMosaicProgress). See docs/mods/app-plugins-design.md.
export type ModScreen = { id: string; Component: FC }

const registry: ModScreen[] = []

// Registration is by id, and registering the same id twice REPLACES rather than appends. A mod
// registers its screen as a module side effect, so anything that evaluates that module a second time
// — a hot reload, or the module being reached through two paths — used to add a second screen with
// the same id, which React reports as "two children with the same key". Replacing also means a hot
// reload puts the NEW component on screen rather than leaving the old one first in the list.
export const registerModScreen = (screen: ModScreen) => {
  const existing = registry.findIndex(({ id }) => id === screen.id)
  if (existing >= 0) registry[existing] = screen
  else registry.push(screen)
}

export const modScreens = (): readonly ModScreen[] => registry
