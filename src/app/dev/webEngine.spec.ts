import { afterEach, describe, expect, it, vi } from "vitest"
import { createWebSimState } from "@/game/webSimulation"
import { workerEngine } from "./webEngine"

class DeadWorker {
  static last: DeadWorker | undefined
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  posted: unknown[] = []
  constructor() {
    DeadWorker.last = this
  }
  postMessage(data: unknown) {
    this.posted.push(data)
  }
  terminate() {}
}

describe("workerEngine", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("rejects a check asked after the worker failed to load, instead of waiting forever", async () => {
    vi.stubGlobal("Worker", DeadWorker)
    const engine = workerEngine()
    DeadWorker.last!.onerror!(new Event("error"))

    await expect(engine.check("[w3]", "editor.web")).rejects.toThrow("reload the page")
    await expect(engine.act(1, createWebSimState(), { type: "reset" })).rejects.toThrow("reload the page")
    expect(DeadWorker.last!.posted).toEqual([])
  })

  it("rejects a check that was waiting when the worker failed", async () => {
    vi.stubGlobal("Worker", DeadWorker)
    const engine = workerEngine()
    const asked = engine.check("[w3]", "editor.web")
    DeadWorker.last!.onerror!(new Event("error"))

    await expect(asked).rejects.toThrow("reload the page")
  })
})
