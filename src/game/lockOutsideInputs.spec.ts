import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"
import { lockChecks } from "./lockChecks"
import { walkSpecOf } from "./lockWalkSpec"
import { INPUT_HELD, INPUT_MISSING, deadRegions, openGates, reachableStates, walkLock } from "./lockWalk"
import type { LockState } from "./lockWalk"
import { checkLock, compileLock } from "./lockCompile"
import { solveLock } from "./lockReview"

const parsed = (...lines: string[]) => parseLock(lines.join("\n"), "made")
const specOf = (...lines: string[]) => {
  const { lock, drafts } = parsed(...lines)
  return walkSpecOf(lock, drafts)
}
const statesOf = (...lines: string[]) => {
  const found = reachableStates(specOf(...lines))
  if (found === "tooLarge") throw new Error("too large")
  return found
}

describe("an outside input in the walk", () => {
  it("keeps a gate naming it shut before its arrival and opens it after", () => {
    const spec = specOf("in -[A]- out", "A outside")
    expect(openGates(spec, { A: INPUT_MISSING }).has("in-out")).toBe(false)
    expect(openGates(spec, { A: INPUT_HELD }).has("in-out")).toBe(true)
    const { order } = statesOf("in -[A]- out", "A outside")
    expect(order[0].config.A).toBe(INPUT_MISSING)
    expect(order.filter(state => state.region === "out").every(state => state.config.A === INPUT_HELD)).toBe(true)
  })

  it("offers an arrival from every state, wherever the player stands, changing nothing else", () => {
    const lock = ["in -[A]- hall", "hall -[S+B]- out", "hall -- side", "S toggle @side", "A outside", "B outside"]
    const { order, edges } = statesOf(...lock)
    const arrived = (from: LockState, input: string) => ({
      region: from.region,
      config: { ...from.config, [input]: INPUT_HELD },
    })
    for (const [n, state] of order.entries())
      for (const input of ["A", "B"]) {
        if (state.config[input] !== INPUT_MISSING) continue
        expect(
          edges[n].map(to => order[to]),
          `${input} from ${JSON.stringify(state)}`
        ).toContainEqual(arrived(state, input))
      }
  })

  it("holds every order of arrival: both inputs held is reached by A first and by B first", () => {
    const { order, edges } = statesOf("in -[A+B]- out", "A outside", "B outside")
    const at = (a: string, b: string) => order.findIndex(s => s.region === "in" && s.config.A === a && s.config.B === b)
    const both = at(INPUT_HELD, INPUT_HELD)
    expect(edges[at(INPUT_HELD, INPUT_MISSING)]).toContain(both)
    expect(edges[at(INPUT_MISSING, INPUT_HELD)]).toContain(both)
  })

  it("puts a lit torch in a region an input bars out until the arrival, and lets it be lit after", () => {
    const lock = ["in -- hall", "hall -[A]", "T torch @hall lit", "in -[T]- out", "A outside"]
    const { order } = statesOf(...lock)
    expect(order[0].config.T).toBe("off")
    expect(order.some(state => state.config.A === INPUT_MISSING && state.config.T === "on")).toBe(false)
    expect(order.some(state => state.config.A === INPUT_HELD && state.config.T === "on")).toBe(true)
    expect(walkLock(specOf(...lock)).sound).toBe(true)
  })

  it("refuses a lock that strands once a torch was doused under sand and the sand cleared", () => {
    // The torch holds the way into its own hall: put out under the sand, it cannot be reached to light again.
    const lock = [
      "in -[T]- hall",
      "hall -- out",
      "hall -[R:off|A]",
      "R activator @in",
      "T torch @hall lit",
      "A outside",
    ]
    const { order } = statesOf(...lock)
    expect(order.some(s => s.config.R === "on" && s.config.A === INPUT_HELD && s.config.T === "off")).toBe(true)
    const walked = walkLock(specOf(...lock))
    expect(walked.sound === false && walked.failure.type).toBe("strands")
    // The same lock with the way into the hall left open walks sound: the strand is the doused torch's.
    expect(walkLock(specOf("in -- hall", ...lock.slice(1))).sound).toBe(true)
  })

  it("reads a pocket left only by an arrival as no strand, and one left by nothing as one", () => {
    expect(walkLock(specOf("in -- out", "in >> pocket", "pocket -[A]- in", "A outside")).sound).toBe(true)
    const draft = walkLock(specOf("in -- out", "in >> pocket", "pocket -[D]- in"))
    expect(draft.sound === false && draft.failure.type).toBe("strands")
  })

  it("names the input arriving on the cheapest way through as an action", () => {
    expect(solveLock(specOf("in -[A]- out", "A outside"))?.steps).toEqual(["in", "A:held", "out"])
  })

  it("reports a region no arrival lets anyone stand in as dead, and one an arrival opens as alive", () => {
    // The lever that opens the vault stands inside it: the input's arrival cannot help.
    expect(deadRegions(specOf("in -- out", "in -[A+S]- vault", "S toggle @vault", "A outside", "vault $"))).toEqual([
      "vault",
    ])
    expect(deadRegions(specOf("in -- out", "in -[A]- vault", "A outside", "vault $"))).toEqual([])
  })
})

describe("the notation of an outside input", () => {
  it("reads an input onto the lock, its gates naming it bare", () => {
    const { lock, drafts, refused } = parsed(
      "in -[A]- hall",
      "hall -[S|B]- out",
      "S toggle @hall",
      "A outside",
      "B outside"
    )
    expect(lock.inputs).toEqual(["A", "B"])
    expect(lock.mechanics).not.toHaveProperty("A")
    expect(drafts).toEqual([])
    expect(refused).toEqual([])
  })

  it("leaves a lock without inputs as it was", () => {
    expect(parsed("in -[S]- out", "S toggle @in").lock).not.toHaveProperty("inputs")
  })

  it("refuses an input named with a state as outsideState", () => {
    const { refused } = parsed("in -[A:missing]- out", "A outside")
    expect(refused).toEqual(["line 1: outsideState: an outside input is named bare, and in-out names A:missing"])
    expect(lockChecks(parsed("in -[A:off]- out", "A outside")).sound).toBe(false)
  })

  it("refuses a fourth input as outsideTooMany", () => {
    const { refused } = parsed("in -[A+B+C+D]- out", "A outside", "B outside", "C outside", "D outside")
    expect(refused).toEqual(["line 5: outsideTooMany: a lock carries at most 3 outside inputs, and D is one more"])
    expect(parsed("in -[A+B+C]- out", "A outside", "B outside", "C outside").refused).toEqual([])
  })

  it("refuses an input owning no gate", () => {
    expect(parsed("in -- out", "A outside").refused).toEqual(["line 2: A owns no gate"])
  })

  it("keeps an undeclared owner a draft", () => {
    const { drafts, lock } = parsed("in -[A]- out")
    expect(drafts).toEqual(["A"])
    expect(lock).not.toHaveProperty("inputs")
  })

  it("refuses an input placed twice or also placed as a control", () => {
    expect(() => parsed("in -[A]- out", "A outside", "A outside")).toThrow("line 3: A is placed twice")
    expect(() => parsed("in -[A]- out", "A toggle @in", "A outside")).toThrow("line 3: A is placed twice")
  })
})

describe("the lock checks of a lock with inputs", () => {
  it("compiles alone, and is refused for baking until a web binds its inputs", () => {
    const { lock } = parsed("in -[A]- hall", "hall -[S+B]- out", "S toggle @hall", "A outside", "B outside")
    expect(checkLock(lock)).toEqual([])
    const compiled = compileLock(lock, { toggle: "handle" })
    expect(compiled.ok === false && compiled.faults).toContainEqual({ type: "outsideUnbound", inputs: ["A", "B"] })
  })

  it("lists the inputs as arriving in any order, and where each one's door is first seen", () => {
    const { checks, sound } = lockChecks(
      parsed(
        "in -[A]- court",
        "court -[R|B]- east",
        "court -- side",
        "R toggle @side",
        "east -- out",
        "A outside",
        "B outside"
      )
    )
    expect(checks).toContain("inputs: A, B, arriving in any order")
    expect(checks).toContain("✓ every shut door is seen before its control: A at in, B at court")
    expect(sound).toBe(true)
  })

  it("warns of an input whose door is reached only once it has arrived, and refuses it on a lesson", () => {
    const lock = parsed("in -[C]- hall", "hall -[C]- out", "C outside")
    const warned = lockChecks(lock)
    expect(warned.checks).toContain("⚠ C: its door is reached only once C is held")
    expect(warned.sound).toBe(true)
    const lesson = lockChecks(lock, { lesson: true })
    expect(lesson.checks).toContain("✗ C: its door is reached only once C is held")
    expect(lesson.sound).toBe(false)
  })

  it("asks a door with an input and a floor control to be reached before either is worked or arrives", () => {
    const { checks } = lockChecks(parsed("in -- hall", "hall -[S+C]- out", "S toggle @in", "C outside"))
    expect(checks).toContain("⚠ its control is reached before its door is seen: hall-out")
  })

  it("lets another input arrive on the way to a door", () => {
    const { checks } = lockChecks(parsed("in -[A]- hall", "hall -[B]- out", "A outside", "B outside"))
    expect(checks).toContain("✓ every shut door is seen before its control: A at in, B at hall")
  })
})
