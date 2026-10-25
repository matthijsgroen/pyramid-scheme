import type { FC } from "react"

// Coming home: the player is back at base, either because a journey ended or because they left it.
// Mods own what happens then; core only says when. A contribution is a HOOK (so it can read the
// mod's own state) returning the handler to run. The registry is filled once at module load, so the
// hooks run in the same order every render (rules-of-hooks safe), like rewardContributions.ts.
export type UseHomecoming = () => () => void

const registry: UseHomecoming[] = []

export const registerHomecoming = (useContribution: UseHomecoming) => registry.push(useContribution)

// Runs every handler once, in registration order. No handlers is a no-op.
export const mergeHomecomings =
  (handlers: readonly (() => void)[]): (() => void) =>
  () => {
    for (const handler of handlers) handler()
  }

export const useHomecoming = (): (() => void) => {
  const handlers: (() => void)[] = []
  for (const useContribution of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    handlers.push(useContribution())
  }
  return mergeHomecomings(handlers)
}

// The rest panels on the home: what a mod shows where the player settles in (a chapter note, a count of
// what the camp holds). A panel is a component, so it reads the mod's own state itself; core lists them
// by `order`, lowest first. With none registered the rest area holds nothing.
export type HomecomingPanel = { id: string; order: number; Component: FC }

const panels = new Map<string, HomecomingPanel>()

export const registerHomecomingPanel = (panel: HomecomingPanel) => {
  panels.set(panel.id, panel)
}

export const homecomingPanels = (): HomecomingPanel[] => [...panels.values()].sort((a, b) => a.order - b.order)
