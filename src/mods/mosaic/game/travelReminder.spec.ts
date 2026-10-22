import { describe, expect, it } from "vitest"
import { REMIND_EVERY_RETURNS, REMIND_FROM_PIECES, travelReturn } from "./travelReminder"

/** Walks back onto the travel screen `times` times, threading the stored count through. */
const returnsFrom = (times: number, facts: { unplaced: number; canSpeak?: boolean }, returns = 0) => {
  const reminders: boolean[] = []
  for (let i = 0; i < times; i++) {
    const next = travelReturn({ canSpeak: true, ...facts, returns })
    reminders.push(next.remind)
    returns = next.returns
  }
  return { reminders, returns }
}

describe(travelReturn, () => {
  it("reminds on every third return while pieces wait to be set in", () => {
    expect(REMIND_EVERY_RETURNS).toBe(3)
    expect(returnsFrom(6, { unplaced: 5 }).reminders).toEqual([false, false, true, false, false, true])
  })

  it("never reminds with no pieces to set in, however often the player comes back", () => {
    expect(returnsFrom(10, { unplaced: 0 }).reminders).not.toContain(true)
  })

  it("lets a handful of loose pieces be: it speaks up from five", () => {
    expect(REMIND_FROM_PIECES).toBe(5)
    expect(returnsFrom(10, { unplaced: 4 }).reminders).not.toContain(true)
  })

  it("starts counting over once every piece is set in", () => {
    const { returns } = returnsFrom(2, { unplaced: 5 })
    expect(travelReturn({ unplaced: 0, returns, canSpeak: true })).toEqual({ returns: 0, remind: false })
  })

  it("holds a due reminder while Fez cannot speak, and gives it on the next return he can", () => {
    const held = returnsFrom(5, { unplaced: 5, canSpeak: false })
    expect(held.reminders).not.toContain(true)
    expect(travelReturn({ unplaced: 5, returns: held.returns, canSpeak: true })).toEqual({ returns: 0, remind: true })
  })
})
