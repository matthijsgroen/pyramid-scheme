import { describe, expect, it } from "vitest"
import { drawLock } from "./lockDraw"
import { parseLock } from "./lockNotation"

const draw = (text: string) => {
  const { lock, drafts } = parseLock(text)
  return drawLock(lock, drafts)
}

describe("drawLock", () => {
  it("draws doubleBack", () => {
    expect(
      draw(`
        in -[Y]- leftLower -[S1]- s2
        in -[Y]- rightLower -[S1:a]- s1
        in -[S2]- out
        s1 >> leftLower >> in
        Y fork @in
        S1 toggle @s1
        S2 toggle @s2
        s2 $
      `)
    ).toMatchSnapshot()
  })

  it("names toggle states and marks the gate open at the start", () => {
    const art = draw("in -[S1:a]- hall\nhall -[S1]- out\nS1 toggle @hall")
    expect(art).toContain("□S1:a")
    expect(art).toContain("■S1:b")
  })

  it("shows a region gate in its region's box", () => {
    expect(draw("in -- hall\nhall -- out\nhall -[sluice:wet]\nsluice toggle @in dry wet")).toContain(
      "[hall ▒sluice:wet]"
    )
  })

  it("numbers a sequence's steps and marks its reset door", () => {
    const art = draw("in -- hall\nhall -[P]- out\nP sequence in hall in reset hall-out")
    expect(art).toContain("[in · P1 · P3]")
    expect(art).toContain("[hall · P2]")
    expect(art).toContain("■P↺")
  })

  it("marks a draft owner", () => {
    expect(draw("in -[G]- out")).toContain("■G?")
  })

  it("lists a drop that carries a gate under the map", () => {
    expect(draw("in -[H]- >> hall\nhall -- out\nH toggle @in")).toContain("in -[■H:b]- >> hall")
  })
})
