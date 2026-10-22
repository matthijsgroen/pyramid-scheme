// The web mode's checks off the page: the wizard floors carved once per editor session, then each check and pull
// answered in turn.
import { bakedWebWorld, checkWeb } from "@/mods/webCheck"
import type { BakedWebWorld } from "@/mods/webCheck"
import type { WebWorkerAnswer, WebWorkerRequest } from "./webEngine"
import { webHost } from "./webHost"

let baked: BakedWebWorld | undefined
let worldMs: number | undefined

const world = (): BakedWebWorld => {
  if (!baked) {
    const started = performance.now()
    baked = bakedWebWorld()
    worldMs = Math.round(performance.now() - started)
  }
  return baked
}

const host = webHost((text, name) => checkWeb(text, name, world()))

self.onmessage = ({ data }: MessageEvent<WebWorkerRequest>) => {
  const reply = (answer: WebWorkerAnswer) => self.postMessage(answer)
  try {
    if (data.type === "check") reply({ id: data.id, answer: { ...host.check(data.text, data.name), worldMs } })
    else reply({ id: data.id, answer: host.act(data.version, data.state, data.action) })
  } catch (error) {
    reply({ id: data.id, error: (error as Error).message })
  }
}
