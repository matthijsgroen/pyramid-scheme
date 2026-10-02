import { describe, expect, it } from "vitest"
import { walkLock } from "./lockWalk"
import { chain, drawLock, embed, lockQuality, solveLock, topologyLock, unreachedRegions } from "./lockSketch"
import { parseLock } from "./lockText"
import type { AuthoredLock } from "./lockSketch"
import {
  LOCK_CATALOGUE,
  overlook,
  cellar,
  keyring,
  doubleBack,
  dropHome,
  lamplighter,
  seesaw,
  twoLamps,
} from "./lockCatalogue"

const walk = (lock: AuthoredLock) => walkLock(topologyLock(lock))
const solution = (lock: AuthoredLock) => solveLock(topologyLock(lock))!.steps
const boardSolves = (lock: AuthoredLock) => solution(lock).filter(step => step.startsWith("Y:")).length

describe.each(Object.entries(LOCK_CATALOGUE))("%s", (_, lock) => {
  it("walks sound", () => {
    expect(walk(lock)).toEqual({ sound: true, states: expect.any(Number) })
  })

  it("draws, with its cheapest way through", () => {
    expect(`${drawLock(topologyLock(lock, { drawn: true }))}\n\n${solution(lock).join(" ▸ ")}`).toMatchSnapshot()
  })
})

describe("what each lock's trick rests on", () => {
  it("twoLamps: one lamp does not open the exit, so the board is solved twice", () => {
    expect(boardSolves(twoLamps)).toBe(2)
  })

  it("dropHome: cannot be left without its drop", () => {
    expect(walk({ ...dropHome, oneWays: [] })).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("lamplighter: the drop saves a board solve", () => {
    expect(boardSolves(lamplighter)).toBe(1)
  })

  it("lamplighter: strands the early dropper without the drop out of the east", () => {
    expect(walk({ ...lamplighter, oneWays: lamplighter.oneWays!.slice(0, 1) })).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "east" } },
    })
  })

  it("seesaw: cannot be solved without the drops", () => {
    expect(walk({ ...seesaw, oneWays: [] })).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("doubleBack: the drop off the left branch is the only way home from S2", () => {
    expect(walk({ ...doubleBack, oneWays: doubleBack.oneWays!.slice(0, 1) })).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
  })

  it("cellar: a cell whose key lies outside it strands whoever drops in without it", () => {
    expect(walk({ ...cellar, keys: { "#blue": { in: "ledge" } } })).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "cell" } },
    })
  })

  it("keyring: a lever that cannot be thrown back keeps the red key in", () => {
    const spec = topologyLock(keyring)
    spec.mechanisms.H.transitions = spec.mechanisms.H.transitions.filter(t => t.from === "left")
    expect(walkLock(spec).sound).toBe(false)
  })

  it("overlook: the drop out of the middle saves whoever drops in before throwing S1", () => {
    const oneWays = overlook.oneWays!.filter(w => w.from !== "middle")
    expect(walk({ ...overlook, oneWays })).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "middle" } },
    })
  })

  it("keys compose: chained, each key opens only its own lock's gates", () => {
    const lock = chain({ a: cellar, b: keyring })
    expect(topologyLock(lock).mechanisms["b.#red"].opens.held).toEqual(["b.in-greenRoom"])
    expect(walk(lock).sound).toBe(true)
  })
})

describe("topologyLock", () => {
  it("refuses a handle throwing a gate that does not name it", () => {
    const switches = { ...doubleBack.switches, S2: { ...doubleBack.switches.S2, right: ["in-leftLower"] } }
    expect(() => topologyLock({ ...doubleBack, switches })).toThrow("handle S2 throws in-leftLower")
  })
})

describe("composition", () => {
  it("chains by making each way out the next way in", () => {
    const lock = chain({ a: twoLamps, b: seesaw })
    expect(lock.gates["b.in-west"].from).toBe("a.out")
    expect(lock.out).toBe("b.out")
    expect(walk(lock).sound).toBe(true)
  })

  it("hangs what the host region carried off the guest's way out", () => {
    const lock = embed(doubleBack, "s2", "f", seesaw)
    expect(lock.gates["leftLower-s2"].to).toBe("s2")
    expect(lock.switches.S2.in).toBe("f.out")
    expect(walk(lock).sound).toBe(true)
  })
})

describe("lockQuality", () => {
  it("finds nothing idle in a lock whose every piece bears load", () => {
    expect(lockQuality(doubleBack)).toEqual([])
  })

  it("calls a drop that only saves actions a shortcut", () => {
    expect(lockQuality(lamplighter)).toEqual(["drop west >> east is an optional shortcut"])
  })

  it("finds the gate the middle's drop makes idle, and passes the variant that shuts purple behind S2", () => {
    expect(lockQuality(overlook)).toEqual(["gate in-s2 does nothing"])
    const variant = parseLock(`
      in -- top
      in -[S2]- s2 -[S1+!S2]- middle
      in -[S2]- out
      top >> s1 >> in
      top >> middle >> in
      S1 lever @s1
      S2 lever @s2
    `)
    expect(lockQuality(variant)).toEqual([])
  })

  it("sends a one-choice board back to being a fork", () => {
    const crossroads = parseLock("in -[Y]- vault\nin -[Y]- out\nY board @in\nvault $")
    expect(lockQuality(crossroads)).toContain(
      "under two actions solve it: a single choice is a switch fork, not a lock"
    )
  })
})

describe("unreachedRegions", () => {
  it("finds every catalogue region reachable", () => {
    for (const lock of Object.values(LOCK_CATALOGUE)) expect(unreachedRegions(topologyLock(lock))).toEqual([])
  })

  it("names a region behind a gate only its own lever opens", () => {
    const lock = parseLock("in -[H]- out\nin -[S]- vault\nH lever @in\nS lever @vault\nvault $")
    expect(unreachedRegions(topologyLock(lock))).toEqual(["vault"])
  })
})
