import { useEffect, useRef, useState } from "react"
import type { WebSimState, WebSimView } from "@/game/webSimulation"
import type { WebEngine, WebEngineCheck } from "./webEngine"
import type { WebSimAction } from "./webHost"

/** How long the text rests before it is checked: a check walks the whole tier. */
export const WEB_CHECK_DELAY = 400

type Sim = { version: number; state: WebSimState; view?: WebSimView }

/** The web text checked on the engine once typing rests, and its pulls played through there. */
export const useWebSimulation = (engine: WebEngine | undefined, text: string, name: string) => {
  const [checked, setChecked] = useState<(WebEngineCheck & { of: string }) | { of: string; error: string }>()
  const [sim, setSim] = useState<Sim>()
  const asked = useRef(0)
  const acting = useRef(false)

  useEffect(() => {
    if (!engine) return
    const timer = setTimeout(() => {
      const ask = ++asked.current
      engine.check(text, name).then(
        answer => {
          if (ask !== asked.current) return
          setChecked({ ...answer, of: text })
          setSim({ version: answer.version, state: answer.state, view: answer.view })
        },
        (error: Error) => ask === asked.current && setChecked({ of: text, error: error.message })
      )
    }, WEB_CHECK_DELAY)
    return () => clearTimeout(timer)
  }, [engine, text, name])

  const act = (action: WebSimAction) => {
    if (!engine || !sim || acting.current) return
    acting.current = true
    engine.act(sim.version, sim.state, action).then(
      answer => {
        acting.current = false
        if (answer) setSim(answer)
      },
      () => (acting.current = false)
    )
  }

  return {
    report: checked && "text" in checked ? checked : undefined,
    error: checked && "error" in checked ? checked.error : undefined,
    checking: checked?.of !== text,
    state: sim?.state,
    view: sim?.view,
    pull: (activator: string) => act({ type: "pull", name: activator }),
    pullAll: () => act({ type: "pullAll" }),
    reset: () => act({ type: "reset" }),
  }
}
