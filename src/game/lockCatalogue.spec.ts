import { describe, expect, it } from "vitest"
import { walkLock } from "./lockWalk"
import { walkSpecOf } from "./lockWalkSpec"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"
import { lockQuality, solveLock, unreachedRegions } from "./lockReview"
import { LESSONS, LOCK_CATALOGUE, LOCK_TEXTS } from "./lockCatalogue"

const walkText = (text: string) => walkLock(walkSpecOf(parseLock(text).lock, parseLock(text).drafts))
/** The lock with one of its lines rewritten — how each trick's load-bearing piece is taken away. */
const edited = (name: string, line: string, replacement: string) => {
  const text = LOCK_TEXTS[name]
  if (!text.includes(line)) throw new Error(`${name} has no line ${line}`)
  return text.replace(line, replacement)
}
const boardSolves = (name: string) =>
  solveLock(walkSpecOf(LOCK_CATALOGUE[name].lock))!.steps.filter(step => step.startsWith("Y:")).length

describe.each(Object.entries(LOCK_CATALOGUE))("%s", (_, { lock, drafts, refused }) => {
  it("walks sound, reaching every region", () => {
    expect(refused).toEqual([])
    expect(drafts).toEqual([])
    const spec = walkSpecOf(lock)
    expect(walkLock(spec)).toEqual({ sound: true, states: expect.any(Number) })
    expect(unreachedRegions(spec)).toEqual([])
  })

  it("draws flat: no line crosses another, and every join finds room", () => {
    expect(drawLock(lock)).not.toMatch(/┼|without crossing/)
  })

  it("draws, with its cheapest way through", () => {
    expect(`${drawLock(lock)}\n\n${solveLock(walkSpecOf(lock))!.steps.join(" ▸ ")}`).toMatchSnapshot()
  })
})

describe("what each lock's trick rests on", () => {
  it("twoLamps: one lamp does not open the exit, so the board is solved twice", () => {
    expect(boardSolves("twoLamps")).toBe(2)
  })

  it("dropHome: cannot be left without its drop", () => {
    expect(walkText(edited("dropHome", "leverRoom >> in", ""))).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
  })

  it("lamplighter: the drop saves a board solve", () => {
    expect(boardSolves("lamplighter")).toBe(1)
  })

  it("lamplighter: strands the early dropper without the drop out of the east", () => {
    expect(walkText(edited("lamplighter", "west >> east >> in", "west >> east"))).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "east" } },
    })
  })

  it("seesaw: cannot be solved without the drops", () => {
    expect(walkText(edited("seesaw", "west >> east >> in", ""))).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
  })

  it("doubleBack: the drop off the left branch is the only way home from S2", () => {
    expect(walkText(edited("doubleBack", "s1 >> leftLower >> in", "s1 >> leftLower"))).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
  })

  it("cellar: a cell whose key lies outside it strands whoever drops in without it", () => {
    expect(walkText(edited("cellar", "blue activator @cell", "blue activator @ledge"))).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "cell" } },
    })
  })

  it("keyring: a lever that cannot be thrown back keeps the red key in", () => {
    expect(walkText(edited("keyring", "H toggle @leverRoom", "H activator @leverRoom a b")).sound).toBe(false)
  })

  it("overlook: the drop out of the middle saves whoever drops in before throwing S1", () => {
    expect(walkText(edited("overlook", "top >> middle >> in", "top >> middle"))).toMatchObject({
      sound: false,
      failure: { type: "strands", at: { region: "middle" } },
    })
  })
})

describe("what the newer locks' tricks rest on", () => {
  it("relay: the drop is the only way home once the airlocks have shut", () => {
    expect(walkText(edited("relay", "r3 -[C]- >> in", ""))).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("relay: a drop open before the last torch strands whoever takes it early", () => {
    expect(walkText(edited("relay", "r3 -[C]- >> in", "r3 >> in")).sound).toBe(false)
  })

  it("clockwork: the lever shuts its own way back, so the drop is needed", () => {
    expect(walkText(edited("clockwork", "west >> in", ""))).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("observatory: the drop to west saves a board solve", () => {
    expect(boardSolves("observatory")).toBe(2)
    expect(lockQuality(LOCK_CATALOGUE.observatory.lock)).toEqual(["drop east>west is an optional shortcut"])
  })

  it("tide: an exit beyond the water strands whoever comes back with the halls the wrong way", () => {
    expect(walkText(edited("tide", "in -[K]- out", "mid -[K]- out")).sound).toBe(false)
  })

  it("sluice: water that moves only once strands whoever moves it before taking the gold", () => {
    expect(walkText(edited("sluice", "S toggle @hub hall vault", "S activator @hub hall vault"))).toMatchObject({
      sound: false,
      failure: { type: "strands" },
    })
  })

  it("plates: the door opens only at the end of the order", () => {
    expect(solveLock(walkSpecOf(LOCK_CATALOGUE.plates.lock))!.steps.filter(step => step.startsWith("P:"))).toEqual([
      "P:1",
      "P:2",
      "P:3",
      "P:done",
    ])
  })
})

describe("what the stone locks' tricks rest on", () => {
  it("twoStones: a stone spent twice — the first holds the vault, then presses the exit", () => {
    const steps = solveLock(walkSpecOf(LOCK_CATALOGUE.twoStones.lock))!.steps
    expect(steps.indexOf("lift from door")).toBeGreaterThan(steps.indexOf("stone on door"))
    expect(steps).toContain("lift from door")
  })

  it("twoStones: with the vault's plate inside, both stones can never be out", () => {
    const inside = edited("twoStones", "door plate @yard", "door plate @vault stone").replace(
      "ledge plate @yard stone",
      "ledge plate @yard"
    )
    expect(walkText(inside)).toEqual({ sound: false, failure: { type: "unsolvable" } })
  })

  it("masonsRamp: without the narrow passage nobody climbs back from the workshop", () => {
    expect(walkText(edited("masonsRamp", "yard -[unladen]- workshop", "")).sound).toBe(false)
  })

  it("masonsRamp: a passage wide enough for a stone needs no ramp at all", () => {
    expect(
      lockQuality(parseLock(edited("masonsRamp", "yard -[unladen]- workshop", "yard -- workshop")).lock)
    ).toContain("gate yard-chute does nothing")
  })

  it("counterweight: without the zipline the lift never opens", () => {
    expect(walkText(edited("counterweight", "gallery -[unladen]- >> chamber", ""))).toEqual({
      sound: false,
      failure: { type: "unsolvable" },
    })
  })
})

describe.each(Object.entries(LESSONS))("lesson %s", (_, { lock, drafts }) => {
  it("walks sound, reaching every region, in under two actions", () => {
    expect(drafts).toEqual([])
    const spec = walkSpecOf(lock)
    expect(walkLock(spec).sound).toBe(true)
    expect(unreachedRegions(spec)).toEqual([])
    expect(solveLock(spec)!.actions).toBeLessThan(3)
  })
})

describe("the catalogue's quality", () => {
  it("finds nothing idle in doubleBack, and the shortcut in lamplighter", () => {
    expect(lockQuality(LOCK_CATALOGUE.doubleBack.lock)).toEqual([])
    expect(lockQuality(LOCK_CATALOGUE.lamplighter.lock)).toEqual(["drop west>east is an optional shortcut"])
  })

  it("finds overlook's idle gate, and passes the variant that shuts the way behind S2", () => {
    expect(lockQuality(LOCK_CATALOGUE.overlook.lock)).toEqual(["gate in-s2 does nothing"])
    const variant = parseLock(edited("overlook", "in -[S2]- s2 -[S1]- middle", "in -[S2]- s2 -[S1+S2:a]- middle"))
    expect(lockQuality(variant.lock)).toEqual([])
  })
})
