import { describe, expect, it } from "vitest"
import type { SiteConfig } from "./siteTypes"
import type { WebWorld } from "./webLine"
import { walkWeb } from "./webWalk"
import { plain, resolve, world } from "./webFixtures.testing"
import { createWebSimState, pullEveryReachable, pullWebActivator, resetWebSim, webSimView } from "./webSimulation"
import type { WebSimSource, WebSimState } from "./webSimulation"

const sourceOf = (text: string, on: WebWorld, configs: WebSimSource["configs"] = {}): WebSimSource => {
  const resolved = resolve(text, on)
  expect(resolved.refusals).toEqual([])
  return { resolved, walked: walkWeb(resolved), configs }
}
const pull = (source: WebSimSource, ...names: string[]): WebSimState =>
  names.reduce((state, name) => pullWebActivator(state, source, name), createWebSimState())
const pyramidOf = (source: WebSimSource, state: WebSimState, name: string) =>
  webSimView(source, state)
    .journeys.flatMap(j => j.pyramids)
    .find(p => p.name === name)!

// A pot over w1p1's seven rooms; its stops land on seams 0|1, 1|2 and 3|4, at 0.5, 1.5 and 3.5 of six steps.
const POT = "[w1p1]\nsand by a b c\n[w2p1]\nlever a @20%\nlever b @50%\nlever c @80%"
const POT_WORLD = world({ 1: [plain(7)], 2: [plain(10)] })

// w1p2's key lies behind w1p1's sand, which a lever in w2p1 clears; the key opens a seal on w2p2.
const CHAIN = "[w1p1]\nsand by a\n[w2p1]\nlever a @end\n[w1p2]\nkey b @end\n[w2p2]\nb opens 50%"
const CHAIN_WORLD = world({ 1: [plain(5), plain(5)], 2: [plain(5), plain(5)] })

describe("a pull", () => {
  it("moves its pot's front to the next stop, whichever lever it was", () => {
    const source = sourceOf(POT, POT_WORLD)
    expect(webSimView(source, createWebSimState()).pots[0]).toMatchObject({ pulled: 0, front: (0.5 / 6) * 100 })
    for (const lever of ["a", "b", "c"]) {
      const state = pull(source, lever)
      expect(webSimView(source, state).pots[0]).toMatchObject({ pulled: 1, front: (1.5 / 6) * 100 })
      expect(state.log).toEqual([expect.objectContaining({ name: lever, pots: [{ pot: "w1p1", front: 25 }] })])
      expect(pyramidOf(source, state, "w1p1")).toMatchObject({
        sandFrom: 25,
        status: { kind: "stops", pct: expect.closeTo(100 / 6) },
      })
    }
    expect(webSimView(source, pull(source, "c", "a")).pots[0].front).toBeCloseTo((3.5 / 6) * 100)
  })

  it("opens its pot once every lever is pulled, and the pyramid then finishes", () => {
    const source = sourceOf(POT, POT_WORLD)
    const state = pull(source, "b", "c", "a")
    expect(webSimView(source, state).pots[0].front).toBeUndefined()
    expect(state.log[2].pots).toEqual([{ pot: "w1p1" }])
    expect(pyramidOf(source, state, "w1p1")).toMatchObject({ status: { kind: "finishes" }, cleared: 100 })
    expect(pyramidOf(source, state, "w1p1").sandFrom).toBeUndefined()
  })

  it("reports the activator it put in reach, and marks it fresh", () => {
    const source = sourceOf(CHAIN, CHAIN_WORLD)
    const start = createWebSimState()
    expect(webSimView(source, start).reachable).toEqual(["a"])
    expect(pyramidOf(source, start, "w1p2").status).toEqual({ kind: "closed" })

    const state = pullWebActivator(start, source, "a")
    expect(state.log[0].fresh).toEqual(["b"])
    expect(state.fresh).toEqual(["b"])
    const pin = pyramidOf(source, state, "w1p2").pins.find(p => p.name === "b")
    expect(pin).toMatchObject({ state: "reachable", fresh: true, look: "key", pct: 100 })
  })

  it("opens the seal its key names", () => {
    const source = sourceOf(CHAIN, CHAIN_WORLD)
    const shut = pull(source, "a")
    expect(pyramidOf(source, shut, "w2p2").seals).toEqual([expect.objectContaining({ key: "b", open: false })])
    expect(pyramidOf(source, shut, "w2p2").status.kind).toBe("stops")

    const open = pullWebActivator(shut, source, "b")
    expect(open.log[1].seals).toEqual(["w2p2"])
    expect(pyramidOf(source, open, "w2p2").seals[0].open).toBe(true)
    expect(pyramidOf(source, open, "w2p2").status).toEqual({ kind: "finishes" })
  })

  it("changes nothing for an activator out of reach", () => {
    const source = sourceOf(CHAIN, CHAIN_WORLD)
    const start = createWebSimState()
    expect(pullWebActivator(start, source, "b")).toBe(start)
  })
})

describe("pulling everything in reach", () => {
  it("pulls what was in reach and leaves what that freed for the next press", () => {
    const source = sourceOf(CHAIN, CHAIN_WORLD)
    const once = pullEveryReachable(createWebSimState(), source)
    expect(once.pulled).toEqual(["a"])
    expect(once.fresh).toEqual(["b"])
    expect(pullEveryReachable(once, source).pulled).toEqual(["a", "b"])
  })
})

describe("reset", () => {
  it("clears the pulls, the log and what was fresh", () => {
    const source = sourceOf(CHAIN, CHAIN_WORLD)
    pull(source, "a", "b")
    const state = resetWebSim()
    expect(state).toEqual(createWebSimState())
    expect(webSimView(source, state).reachable).toEqual(["a"])
  })
})

describe("the journey's buried percentage", () => {
  it("reads the doors laid on the authoring, and is gone once the pot is open", () => {
    const pyramid = (doors: { key: string; seam: number }[]) =>
      [
        {
          pathPuzzles: 6,
          exitOrStaircase: "exit",
          webDoors: doors.map(door => ({ key: door.key, at: { seam: door.seam } })),
        },
      ] as unknown as SiteConfig
    const configs = {
      wizard_1: [
        pyramid([
          { key: "web:w1p1#1", seam: 0 },
          { key: "web:w1p1#2", seam: 1 },
          { key: "web:w1p1#3", seam: 3 },
        ]),
      ],
    }
    const source = sourceOf(POT, POT_WORLD, configs)
    const buried = (state: WebSimState) => webSimView(source, state).journeys.find(j => j.journey === 1)?.buried
    expect(buried(createWebSimState())).toBe(86)
    expect(buried(pull(source, "a"))).toBe(71)
    expect(buried(pull(source, "a", "b", "c"))).toBeUndefined()
  })
})
