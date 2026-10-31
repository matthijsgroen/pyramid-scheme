import type { FC } from "react"

// A mod's claim on the camp's window. Only the window is claimable: the chest and the map table are
// core's. `useLabel` is a hook so the label and badge can read the mod's own state; `title` is the
// popup title, run through the caller's `t`. With no entrance registered the window offers nothing.
export type ModEntrance = {
  id: string
  object: "window"
  useLabel: () => { label: string; badge?: number }
  Screen: FC
  title: (t: (key: string) => string) => string
}

const entrances = new Map<string, ModEntrance>()

// By id: registering an id again replaces the earlier entrance.
export const registerModEntrance = (entrance: ModEntrance) => {
  entrances.set(entrance.id, entrance)
}

export const modEntrances = (): ModEntrance[] => [...entrances.values()]
