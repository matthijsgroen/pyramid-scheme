import { describe, expect, it } from "vitest"
import { faceFor } from "./faceFor"

const FACES = { scribe: ["papyrus"], funerary: ["default"] }
const KNOWN = ["default", "papyrus"]

/** As many rooms as a journey has, addressed the way the world addresses them. */
const rooms = (count: number) => Array.from({ length: count }, (_unused, index) => `a1b2c3#2/${index}`)

describe("faceFor", () => {
  it("wears the face its role names", () => {
    expect(faceFor(FACES, "scribe", undefined, KNOWN, 0, "a1b2c3#2/0")).toBe("papyrus")
  })

  it("wears the face a theme names outright, which is the lab's way in", () => {
    expect(faceFor(FACES, undefined, "papyrus", KNOWN, 0, "a1b2c3#2/0")).toBe("papyrus")
  })

  it("reads a role that only answers default as an answer, not as silence", () => {
    const everyRoom = rooms(60).map(room => faceFor(FACES, "funerary", undefined, KNOWN, 0, room))
    expect(new Set(everyRoom)).toEqual(new Set(["default"]))
  })

  it("gives a room nobody dressed a face of its own now and then", () => {
    const faces = rooms(300).map(room => faceFor(FACES, "puzzle", undefined, KNOWN, 0, room))
    const themed = faces.filter(face => face !== "default").length
    expect(themed).toBeGreaterThan(60)
    expect(themed).toBeLessThan(150)
  })

  it("hands the same room the same face every time it is opened", () => {
    const twice = rooms(40).map(room => [
      faceFor(FACES, undefined, undefined, KNOWN, 0, room),
      faceFor(FACES, undefined, undefined, KNOWN, 0, room),
    ])
    for (const [first, second] of twice) expect(second).toBe(first)
  })

  it("spreads an undressed room over every face a family has, not just the first", () => {
    const known = ["default", "granary", "lamps", "cellar"]
    const drawn = new Set(rooms(300).map(room => faceFor({}, undefined, undefined, known, 0, room)))
    expect(drawn).toEqual(new Set(["default", "granary", "lamps", "cellar"]))
  })

  it("leaves a family with nothing but a plain board plain", () => {
    const everyRoom = rooms(60).map(room => faceFor({}, undefined, undefined, ["default"], 0, room))
    expect(new Set(everyRoom)).toEqual(new Set(["default"]))
  })

  it("stays on the plain board where nothing says which room this is", () => {
    expect(faceFor(FACES, undefined, undefined, KNOWN)).toBe("default")
  })
})
