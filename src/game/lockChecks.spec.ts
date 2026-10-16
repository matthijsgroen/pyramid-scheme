import { describe, expect, it } from "vitest"
import { parseLock } from "./lockNotation"
import { doorsSeenLate, lockChecks } from "./lockChecks"
import { walkSpecOf } from "./lockWalkSpec"

const parsed = (...lines: string[]) => parseLock(lines.join("\n"), "made")
const late = (...lines: string[]) => {
  const { lock, drafts } = parsed(...lines)
  return doorsSeenLate(lock, walkSpecOf(lock, drafts))
}

const sideRoom = ["in -- hall", "hall -[H]- out", "hall -- side", "H toggle @side"]
const atTheDoor = ["in -- hall", "hall -[H]- out", "hall -- side", "H toggle @hall"]
const behindTheStart = ["in -- hall", "hall -[H]- out", "H toggle @in"]

describe("the door is seen before its control", () => {
  it("passes a lever in a side room off the hall its door stands in", () => {
    expect(late(...sideRoom)).toEqual([])
  })

  it("names a door whose lever stands beside it, or where the player starts", () => {
    expect(late(...atTheDoor)).toEqual(["hall-out"])
    expect(late(...behindTheStart)).toEqual(["hall-out"])
  })

  it("names a door two torches open when either torch is met first", () => {
    const twoRooms = [
      "in -- hall",
      "hall -[A+B]- out",
      "hall -- east",
      "hall -- west",
      "A torch @east",
      "B torch @west",
    ]
    expect(late(...twoRooms)).toEqual([])
    expect(late("in -- hall", "hall -[A+B]- out", "hall -- east", "A torch @east", "B torch @in")).toEqual(["hall-out"])
  })

  it("lets another mechanism open the way to the door", () => {
    expect(late("in -[K]- hall", "in -- k", "hall -[H]- out", "hall -- side", "K toggle @k", "H toggle @side")).toEqual(
      []
    )
  })

  it("reads a sequence's tiles as its control, not the door it resets beside", () => {
    expect(late("in -- a", "in -- b", "in -[P]- out", "P sequence a b reset in-out")).toEqual([])
    expect(late("in -- a", "a -[P]- out", "in -- b", "P sequence a b reset a-out")).toEqual(["a-out"])
  })

  it("reads a plate's room as the control of the door it holds, not the shelf the stone starts on", () => {
    const shelfAtStart = ["in -- yard", "yard -[p]- out", "yard -- side", "p plate @side", "s plate @in stone"]
    expect(late(...shelfAtStart)).toEqual([])
    expect(late("in -- yard", "yard -[p]- out", "p plate @yard", "s plate @in stone")).toEqual(["yard-out"])
  })

  it("passes a door opened by the board beside it, which stands in its own junction", () => {
    expect(late("in -[Y]- left", "in -[Y]- right", "in -[S]- out", "Y fork @in", "S toggle @left", "right $")).toEqual(
      []
    )
  })

  it("skips a gate open at the start", () => {
    expect(late("in -- hall", "hall -[H:a]- out", "H toggle @hall")).toEqual([])
  })
})

describe("the door check in the lock's verdict", () => {
  it("refuses a lesson whose control is met before its door", () => {
    const { checks, sound } = lockChecks(parsed(...behindTheStart), { lesson: true })
    expect(checks).toContain("✗ its control is reached before its door is seen: hall-out")
    expect(sound).toBe(false)
  })

  it("only warns of it on any other lock", () => {
    const { checks, sound } = lockChecks(parsed(...behindTheStart))
    expect(checks).toContain("⚠ its control is reached before its door is seen: hall-out")
    expect(sound).toBe(true)
  })

  it("says every door is seen first when it is", () => {
    const { checks, sound } = lockChecks(parsed(...sideRoom), { lesson: true })
    expect(checks).toContain("✓ every shut door is seen before its control")
    expect(sound).toBe(true)
  })
})

describe("the pipe in the lock's verdict", () => {
  it("prints the regions a pipe joins", () => {
    const { checks } = lockChecks(
      parsed("in -[unladen]- hall", "hall -[p]- out", "p plate @hall", "shelf plate @in stone", "P pipe @in @hall")
    )
    expect(checks).toContain("pipe P: in ⇄ hall")
  })
})
