import { describe, expect, it } from "vitest"
import { walkLock } from "./lockWalk"
import { walkSpecOf } from "./lockWalkSpec"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"
import { lockQuality, solveLock, unreachedRegions } from "./lockReview"
import { LOCK_CATALOGUE, LOCK_TEXTS } from "./lockCatalogue"

const walkText = (text: string) => walkLock(walkSpecOf(parseLock(text).lock, parseLock(text).drafts))
/** The lock with one of its lines rewritten — how each trick's load-bearing piece is taken away. */
const edited = (name: keyof typeof LOCK_TEXTS, line: string, replacement: string) => {
  const text = LOCK_TEXTS[name]
  if (!text.includes(line)) throw new Error(`${name} has no line ${line}`)
  return text.replace(line, replacement)
}
const boardSolves = (name: keyof typeof LOCK_TEXTS) =>
  solveLock(walkSpecOf(LOCK_CATALOGUE[name].lock))!.steps.filter(step => step.startsWith("Y:")).length

describe.each(Object.entries(LOCK_CATALOGUE))("%s", (_, { lock, drafts }) => {
  it("walks sound, reaching every region", () => {
    expect(drafts).toEqual([])
    const spec = walkSpecOf(lock)
    expect(walkLock(spec)).toEqual({ sound: true, states: expect.any(Number) })
    expect(unreachedRegions(spec)).toEqual([])
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
