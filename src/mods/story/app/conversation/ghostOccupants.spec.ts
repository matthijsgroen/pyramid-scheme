import { describe, expect, it } from "vitest"
import { ghostOccupant } from "./ghostOccupants"

const lines: Record<string, true> = { "x.1.ipi": true, "x.2.fez": true, "y.1.fez": true }
const hasLine = (key: string) => lines[key] === true
const unpainted = () => undefined

describe(ghostOccupant, () => {
  it("stands the scene's ghost in the room, see-through like the dead in a conversation", () => {
    expect(ghostOccupant("x", hasLine, unpainted)).toMatchObject({ id: "ipi", translucent: true })
  })

  it("stands in as the ghost's portrait until a map figure is painted", () => {
    expect(ghostOccupant("x", hasLine, unpainted)?.kind).toBe("bust")
  })

  it("draws the painted figure once there is one", () => {
    expect(ghostOccupant("x", hasLine, speaker => `${speaker}.png`)).toMatchObject({ kind: "sprite", src: "ipi.png" })
  })

  it("shows nobody where only the living speak, or nothing is played", () => {
    expect(ghostOccupant("y", hasLine, unpainted)).toBeUndefined()
    expect(ghostOccupant(undefined, hasLine, unpainted)).toBeUndefined()
  })
})
