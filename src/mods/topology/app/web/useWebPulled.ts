import { useMemo } from "react"
import { useModState } from "@/app/state/useModState"
import { pullActivator, webHeldKeys } from "@/game/webKeys"
import type { ShippedActivator, WebPulled } from "@/game/webKeys"

// The topology mod's own saved state: the web activators the player took, by name. It has an add and no remove; the
// keys and the fronts are derived from it, never stored (docs/instructions/sand-pyramid.md, "State and save").
type TopologyState = { webPulled: WebPulled }

const INITIAL: TopologyState = { webPulled: {} }

export type WebPulledAPI = {
  pulled: WebPulled
  pull: (name: string) => void
  /** `web:<name>` for each activator taken, `web:<pot>#1..n` for each pot holding n of its levers. */
  heldKeys: ReadonlySet<string>
}

export const useWebPulled = (activators: readonly ShippedActivator[]): WebPulledAPI => {
  const [state, setState] = useModState<TopologyState>("topology", INITIAL)
  const pulled = useMemo(() => state.webPulled ?? {}, [state.webPulled])
  return useMemo(
    () => ({
      pulled,
      pull: (name: string) =>
        setState(prev => {
          const next = pullActivator(prev.webPulled ?? {}, name)
          return next === prev.webPulled ? prev : { ...prev, webPulled: next }
        }),
      heldKeys: webHeldKeys(pulled, activators),
    }),
    [pulled, activators, setState]
  )
}
