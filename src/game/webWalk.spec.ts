import { describe, expect, it, vi } from "vitest"
import { mulberry32, shuffle } from "./random"
import { potKey, roomNode } from "./webLine"
import type { ResolvedWeb, WebFloor } from "./webLine"
import { parseWeb } from "./webNotation"
import { visitPyramid, walkWeb, walkWebFloors } from "./webWalk"
import { floor, lockOf, plain, pyramid, refusalTypes, resolve, section, world } from "./webFixtures.testing"
import type { FloorGrid } from "./siteTypes"
import type { walkFloorLock } from "./floorLockWalk"

const walk = (text: string, on: Parameters<typeof resolve>[1]) => {
  const resolved = resolve(text, on)
  return { resolved, walked: walkWeb(resolved) }
}
const W1 = { journey: 1, pyramid: 1 }

describe("pull sets", () => {
  it("holds the same keys for two orders of the same pulls", () => {
    const { walked } = walk(
      "[w1p1]\nsand by a b c\n[w2p1]\nlever a @20%\nlever b @50%\nlever c @80%",
      world({ 1: [plain(7)], 2: [plain(10)] })
    )
    const random = mulberry32(7)
    for (let round = 0; round < 50; round++) {
      const pulled = ["a", "b", "c"].filter(() => random() < 0.5)
      const shuffled = shuffle([...pulled], random)
      expect(walked.heldOf(shuffled)).toEqual(walked.heldOf(pulled))
    }
    expect([...walked.heldOf(["c", "a"])].sort()).toEqual(["web:a", "web:c", potKey("w1p1", 1), potKey("w1p1", 2)])
  })

  it("clears to the nth stop on the nth pull, whichever lever it was", () => {
    const { resolved, walked } = walk(
      "[w1p1]\nsand by a b c\n[w2p1]\nlever a @20%\nlever b @50%\nlever c @80%",
      world({ 1: [plain(7)], 2: [plain(10)] })
    )
    const furthest = (pulled: string[]) => {
      const { reach } = visitPyramid(resolved, W1, walked.heldOf(pulled))
      return Math.max(...[0, 1, 2, 3, 4, 5, 6].filter(i => reach.has(roomNode(0, i))))
    }
    // Doors at seams 0|1, 1|2 and 3|4: the front stands after rooms 0, 1, 3, and is gone with all three.
    expect(furthest([])).toBe(0)
    for (const one of ["a", "b", "c"]) expect(furthest([one])).toBe(1)
    for (const two of [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
    ])
      expect(furthest(two)).toBe(3)
    expect(furthest(["c", "b", "a"])).toBe(6)
    expect(walked.refusals).toEqual([])
    expect(walked.sets).toBe(8)
  })
})

describe("refusals of the walk", () => {
  it("refuses a lever only its own pull clears", () => {
    const { walked } = walk(
      "[w1p1]\nsand by a b\nlever a @90%\n[w2p1]\nlever b @end",
      world({ 1: [plain(5)], 2: [plain(3)] })
    )
    expect(walked.refusals).toContainEqual(expect.objectContaining({ type: "ownFront", n: 3 }))
    // Under its own sand where the other lever clears it: allowed.
    const { walked: fine } = walk(
      "[w1p1]\nsand 50% 100% by a b\nlever a @30%\n[w2p1]\nlever b @end",
      world({ 1: [plain(5)], 2: [plain(3)] })
    )
    expect(fine.refusals).toEqual([])
  })

  it("refuses a three-lever cycle across journeys, naming the whole chain", () => {
    const text = [
      "[w1p1]",
      "lever sun @end",
      "moon opens 50%",
      "[w2p1]",
      "lever moon @end",
      "star opens 50%",
      "[w3p1]",
      "lever star @end",
      "sun opens 50%",
    ].join("\n")
    const { walked } = walk(text, world({ 1: [plain(5)], 2: [plain(5)], 3: [plain(5)] }))
    const deadlock = walked.refusals.find(r => r.type === "deadlock")!
    expect(deadlock.message.split("\n")).toEqual([
      "deadlock",
      "  sun (w1p1 f0 @end) waits on moon opens 50% [w1p1]",
      "  moon (w2p1 f0 @end) waits on star opens 50% [w2p1]",
      "  star (w3p1 f0 @end) waits on sun opens 50% [w3p1]",
    ])
  })

  it("names the journey's order in a chain", () => {
    const { walked } = walk("[w1p2]\nlever sun @end\n[w1p1]\nsun opens 50%", world({ 1: [plain(5), plain(5)] }))
    expect(
      walked.refusals
        .find(r => r.type === "deadlock")!
        .message.split("\n")
        .slice(1)
    ).toEqual([
      "  sun (w1p2 f0 @end) waits on w1p1 finished, the journey's order",
      "  w1p1 finished waits on sun opens 50% [w1p1]",
    ])
  })

  it("refuses a front that leaks round a side corridor of a lock", () => {
    const lock = lockOf("in -- a", "a -- hall", "in -- hall", "hall -- out")
    const on = world({
      1: [pyramid(floor(4, { locks: { L: lock }, regions: ["L.in", "L.a", "L.hall", "L.out"] }))],
      2: [plain(3)],
    })
    const { walked } = walk("[w1p1]\nsand from 10%: 100% by a\n[w2p1]\nlever a @end", on)
    expect(walked.refusals).toEqual([
      expect.objectContaining({ type: "frontLeaks", n: 2, message: expect.stringContaining("by L in–hall") }),
    ])
  })

  it("refuses a front that leaks through a drop of the floor", () => {
    // s0 hangs off room 0, before the front at seam 1|2; its last room drops to room 4, past it.
    const leaky = (drops: WebFloor["drops"]) =>
      world({ 1: [pyramid(floor(6, { sections: [section("s0", 1, 2)], drops }))], 2: [plain(3)] })
    const text = "[w1p1]\nsand from 40%: 100% by a\n[w2p1]\nlever a @end"
    expect(walk(text, leaky([{ from: { section: "s0", room: 1 }, to: { room: 4 } }])).walked.refusals).toEqual([
      expect.objectContaining({ type: "frontLeaks", n: 2, message: expect.stringContaining("drop") }),
    ])
    // The same drop the other way round lands before the front.
    expect(walk(text, leaky([{ from: { room: 4 }, to: { section: "s0", room: 1 } }])).walked.refusals).toEqual([])
  })

  it("walks a lock nested in its host's nest spot through the spot", () => {
    const host = lockOf("in -&> hall", "hall -- out")
    const inner = lockOf("in -- vault", "vault -- out", "vault $")
    const on = world({
      1: [
        pyramid(
          floor(3, {
            locks: { H: host, N: inner },
            nesting: { N: "H" },
            regions: ["H.in", "H.hall", "H.out"],
          })
        ),
      ],
      2: [plain(3)],
    })
    const { resolved, walked } = walk("[w1p1]\nlever a @N.vault\n[w2p1]\nsand by a", on)
    expect(resolved.refusals).toEqual([])
    expect(walked.refusals).toEqual([])
    expect(walked.closure.activators).toEqual(["a"])
  })

  it("refuses a floor that can be played into waiting on a key whose activator lies behind that pyramid", () => {
    const text = "[w1p1]\nankh opens side @50%\n[w1p2]\nkey ankh @end"
    const on = world({ 1: [pyramid(floor(5, { sections: [section("s0", 3)] })), plain(3)] })
    const resolved = resolve(text, on)
    // The graph cannot be played into a state, so a floor walk stands in: some state of w1p1 waits on ankh.
    const visit = vi.fn((at: { journey: number; pyramid: number }, held: ReadonlySet<string>) => {
      if (at.pyramid !== 1) return undefined
      const graph = visitPyramid(resolved, at, held)
      return { ...graph, waitsOn: held.has("web:ankh") ? new Set<string>() : new Set(["web:ankh"]) }
    })
    const walked = walkWeb(resolved, { visit })
    expect(walked.refusals).toEqual([
      {
        type: "waitsBehind",
        n: 2,
        message: "w1p1 f0 can be left waiting on web:ankh, which is held only once w1p1 is finished",
      },
    ])
    // Without the waiting state the web is sound: the side passage is opened on a return.
    expect(walkWeb(resolved).refusals).toEqual([])
  })

  it("refuses a web of 17 activators", () => {
    const names = Array.from({ length: 17 }, (_, i) => `a${i}`)
    const text = `[w1p1]\nsand by ${names.join(" ")}\n[w2p1]\n${names.map((n, i) => `lever ${n} @${i * 5}%`).join("\n")}`
    expect(refusalTypes(resolve(text, world({ 1: [plain(40)], 2: [plain(40)] })))).toEqual(["webTooLarge"])
  })

  it("warns of a door that cannot be seen before its key is held", () => {
    const { walked } = walk(
      "[w1p1]\nsand by ankh\nankh opens 60%\n[w2p1]\nkey ankh @end",
      world({ 1: [plain(6)], 2: [plain(3)] })
    )
    expect(walked.refusals).toEqual([])
    expect(walked.warnings).toEqual(["⚠ ankh opens 60% (line 3): its door is reached only once web:ankh is held"])
  })
})

describe("the cheapest route", () => {
  it("counts the visits and returns of a small web exactly", () => {
    // w1p1 gives sun before its door; sun clears w2p1; w2p2 gives moon, which opens the rest of w1p1.
    const text = "[w1p1]\nlever sun @20%\nmoon opens 60%\n[w2p1]\nsand by sun\n[w2p2]\nkey moon @end"
    const { walked } = walk(text, world({ 1: [plain(6)], 2: [plain(4), plain(4)] }))
    expect(walked.refusals).toEqual([])
    expect(walked.cheapest).toEqual({ visits: 4, returns: 1, route: ["w1p1 sun", "w2p1", "w2p2 moon", "w1p1"] })
    // Standing at w2p1's sand before sun is pulled costs one more return.
    expect(walked.cheapestSeeing).toMatchObject({ visits: 5, returns: 2 })
  })
})

describe("why any pull order works", () => {
  // Random made-up webs over three small journeys: a pot over one, doors and levers scattered.
  const randomWeb = (seed: number): ResolvedWeb => {
    const random = mulberry32(seed)
    const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]
    const names = ["a", "b", "c", "d", "e"].slice(0, 2 + Math.floor(random() * 4))
    const on = world({ 1: [plain(8), plain(6)], 2: [plain(7)], 3: [plain(6), plain(5)] })
    const blocks = ["w1p1", "w1p2", "w2p1", "w3p1", "w3p2"]
    const lines: string[] = []
    const potJourney = pick(["w1", "w2", "w3"])
    const potLevers = names.filter(() => random() < 0.6)
    if (potLevers.length > 0) lines.push(`[${potJourney}]`, `sand by ${potLevers.join(" ")}`)
    for (const name of names) {
      lines.push(`[${pick(blocks)}]`, `lever ${name} @${Math.floor(random() * 100)}%`)
      if (!potLevers.includes(name) || random() < 0.3)
        lines.push(`[${pick(blocks)}]`, `${name} opens ${10 + Math.floor(random() * 85)}%`)
    }
    return resolve(lines.join("\n"), on)
  }

  it("climbs every pull order to the closure from no pulls", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const resolved = randomWeb(seed)
      if (resolved.refusals.length > 0) continue
      const walked = walkWeb(resolved)
      const random = mulberry32(seed * 31)
      for (let order = 0; order < 5; order++) {
        // A player pulls one lever in reach at a time, chosen at random, until none is left.
        const pulled: string[] = []
        for (;;) {
          const held = walked.heldOf(pulled)
          const inReach = resolved.activators.filter(a => {
            if (pulled.includes(a.name)) return false
            for (let p = 1; p < a.at.pyramid; p++)
              if (!visitPyramid(resolved, { journey: a.at.journey, pyramid: p }, held).exit) return false
            return visitPyramid(resolved, a.at, held).reach.has(a.node)
          })
          if (inReach.length === 0) break
          pulled.push(inReach[Math.floor(random() * inReach.length)].name)
        }
        expect(new Set(pulled)).toEqual(new Set(walked.closure.activators))
      }
    }
  })

  it("reaches no less with more keys held", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const resolved = randomWeb(seed)
      const walked = walkWeb(resolved)
      const names = resolved.activators.map(a => a.name)
      const random = mulberry32(seed)
      const fewer = names.filter(() => random() < 0.5)
      const more = [...fewer, ...names.filter(n => !fewer.includes(n) && random() < 0.5)]
      for (const at of [W1, { journey: 2, pyramid: 1 }, { journey: 3, pyramid: 2 }]) {
        const small = visitPyramid(resolved, at, walked.heldOf(fewer)).reach
        const large = visitPyramid(resolved, at, walked.heldOf(more)).reach
        for (const node of small) expect(large.has(node)).toBe(true)
      }
    }
  })
})

describe("re-entry on the floors of web journeys", () => {
  it("walks only the floors of the journeys a web names, each with re-entry", () => {
    const grid = (siteId: string) => ({ siteId }) as FloorGrid
    const floors = { wizard_1: [[grid("w1p1f0"), grid("w1p1f1")]], wizard_2: [[grid("w2p1f0")]] }
    const walkFloor = vi.fn<typeof walkFloorLock>((g: FloorGrid) =>
      g.siteId === "w1p1f1"
        ? { sound: false as const, failure: { type: "strands" as const, at: { region: "in", config: {} } } }
        : { sound: true as const, states: 1 }
    )
    const result = walkWebFloors(parseWeb("[w1p1]\nlever a @end"), floors, walkFloor)
    expect(walkFloor.mock.calls.map(([g, options]) => [g.siteId, options])).toEqual([
      ["w1p1f0", { reentry: true }],
      ["w1p1f1", { reentry: true }],
    ])
    expect(result.walked).toBe(2)
    expect(result.failures).toEqual([expect.stringMatching(/^wizard_1 pyramid 1 floor 1: /)])
  })
})
