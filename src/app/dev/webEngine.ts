import type { WebSimState } from "@/game/webSimulation"
import type { WebActAnswer, WebCheckAnswer, WebHost, WebSimAction } from "./webHost"

/** A check's answer as the editor gets it: with how long carving the wizard floors took, once per session. */
export type WebEngineCheck = WebCheckAnswer & { worldMs?: number }

/** Where the web mode's checks and pulls run: a worker in the app, the page itself in a story or a test. */
export type WebEngine = {
  check: (text: string, name: string) => Promise<WebEngineCheck>
  act: (version: number, state: WebSimState, action: WebSimAction) => Promise<WebActAnswer | undefined>
  dispose: () => void
}

type WebWorkerAsk =
  | { type: "check"; text: string; name: string }
  | { type: "act"; version: number; state: WebSimState; action: WebSimAction }
export type WebWorkerRequest = { id: number } & WebWorkerAsk
export type WebWorkerAnswer = { id: number; answer?: WebEngineCheck | WebActAnswer; error?: string }

/** An engine on a host in this thread, for a made-up world. */
export const inThreadEngine = (host: WebHost): WebEngine => ({
  check: async (text, name) => host.check(text, name),
  act: async (version, state, action) => host.act(version, state, action),
  dispose: () => {},
})

/** An engine in a web worker: the baked world is carved there once per editor session, and typing never waits on a
 * check. */
export const workerEngine = (): WebEngine => {
  const worker = new Worker(new URL("./webCheck.worker.ts", import.meta.url), { type: "module" })
  let next = 0
  const waiting = new Map<number, { resolve: (answer: never) => void; reject: (error: Error) => void }>()
  worker.onmessage = ({ data }: MessageEvent<WebWorkerAnswer>) => {
    const asked = waiting.get(data.id)
    waiting.delete(data.id)
    if (data.error !== undefined) asked?.reject(new Error(data.error))
    else asked?.resolve(data.answer as never)
  }
  // A worker that fails to load or throws outside a message answers nothing, then or later: every question waiting,
  // and every one asked after, is told why. A tab opened before a deploy asks for a worker file that deploy removed.
  let failed: Error | undefined
  worker.onerror = event => {
    failed = new Error(event.message || "the web worker did not load: reload the page")
    for (const asked of waiting.values()) asked.reject(failed)
    waiting.clear()
  }
  const ask = <T>(request: WebWorkerAsk) =>
    new Promise<T>((resolve, reject) => {
      if (failed) return reject(failed)
      const id = next++
      waiting.set(id, { resolve, reject })
      worker.postMessage({ ...request, id })
    })
  return {
    check: (text, name) => ask({ type: "check", text, name }),
    act: (version, state, action) => ask({ type: "act", version, state, action }),
    dispose: () => worker.terminate(),
  }
}
