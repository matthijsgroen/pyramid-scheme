import { createWebSimState, pullEveryReachable, pullWebActivator, resetWebSim, webSimView } from "@/game/webSimulation"
import type { WebSimSource, WebSimState, WebSimView } from "@/game/webSimulation"

/** What a web's check hands the host: `yarn lock <web>`'s report, and what to play its pulls through on. */
export type WebChecked = { text: string; sound: boolean; simulate?: () => WebSimSource }

export type WebSimAction = { type: "pull"; name: string } | { type: "pullAll" } | { type: "reset" }

/** A check's answer: the report, a fresh simulation's state and view (none where the web did not resolve), the
 * check's number, and how long it took. */
export type WebCheckAnswer = {
  version: number
  text: string
  sound: boolean
  state: WebSimState
  view?: WebSimView
  ms: number
}
export type WebActAnswer = { version: number; state: WebSimState; view: WebSimView }

export type WebHost = {
  check: (text: string, name: string) => WebCheckAnswer
  /** Undefined when the check it was asked for has been replaced by a newer one. */
  act: (version: number, state: WebSimState, action: WebSimAction) => WebActAnswer | undefined
}

/** Holds the last check's simulation source, so each pull walks only what changed. Shared by the web worker and an
 * in-thread host. */
export const webHost = (checkText: (text: string, name: string) => WebChecked): WebHost => {
  let version = 0
  let source: WebSimSource | undefined
  return {
    check: (text, name) => {
      const started = performance.now()
      const checked = checkText(text, name)
      version++
      source = checked.simulate?.()
      const state = createWebSimState()
      return {
        version,
        text: checked.text,
        sound: checked.sound,
        state,
        ...(source ? { view: webSimView(source, state) } : {}),
        ms: Math.round(performance.now() - started),
      }
    },
    act: (asked, state, action) => {
      if (asked !== version || !source) return undefined
      const next =
        action.type === "pull"
          ? pullWebActivator(state, source, action.name)
          : action.type === "pullAll"
            ? pullEveryReachable(state, source)
            : resetWebSim()
      return { version, state: next, view: webSimView(source, next) }
    },
  }
}
