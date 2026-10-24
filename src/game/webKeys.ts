// THE KEYS A PLAYER HOLDS FROM THE WEB, from the activators they took (docs/instructions/sand-pyramid.md, "State and
// save"): the record is the pulled set, which only grows; the keys are derived from it, never stored.
import { potKey, webKey } from "./webLine"
import type { ResolvedWeb } from "./webLine"

/** An activator as the world ships it: its name, and the pots it counts in. */
export type ShippedActivator = { name: string; pots: readonly string[] }

/** The pulled set: one entry per activator taken, however often it was taken. */
export type WebPulled = Readonly<Record<string, true>>

/** The pulled set with one more activator in it; the same set when it is already there. Nothing is ever taken out. */
export const pullActivator = (pulled: WebPulled, name: string): WebPulled =>
  pulled[name] ? pulled : { ...pulled, [name]: true }

/** `web:<name>` for each activator taken, and `web:<pot>#1..n` for each pot holding n of its levers. */
export const webHeldKeys = (pulled: WebPulled, activators: readonly ShippedActivator[]): Set<string> => {
  const held = new Set<string>()
  const counts = new Map<string, number>()
  for (const activator of activators) {
    if (!pulled[activator.name]) continue
    held.add(webKey(activator.name))
    for (const pot of activator.pots) counts.set(pot, (counts.get(pot) ?? 0) + 1)
  }
  for (const [pot, count] of counts) for (let k = 1; k <= count; k++) held.add(potKey(pot, k))
  return held
}

/** A resolved web's activators as the world ships them: each with the pots it counts in. */
export const activatorsOfWeb = (resolved: Pick<ResolvedWeb, "activators" | "pots">): ShippedActivator[] =>
  resolved.activators.map(({ name }) => ({
    name,
    pots: resolved.pots.filter(pot => pot.levers.includes(name)).map(pot => pot.name),
  }))
