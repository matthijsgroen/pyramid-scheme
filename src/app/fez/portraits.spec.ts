import { describe, expect, it } from "vitest"
import { portraitFor } from "./portraits"

describe("portraitFor", () => {
  it("lays a speaker's face over a pose base", () => {
    const drawn = portraitFor("fez", "pointUp", "worried")

    expect(drawn?.src).toMatch(/fez-pose-point/)
    expect(drawn?.face).toMatch(/fez-face-worried/)
    expect(drawn?.drawn).toEqual({ base: "point", face: "worried" })
  })

  it("draws a pose name's own face when the line names none: pointUp is the point base, excited", () => {
    expect(portraitFor("fez", "pointUp")?.drawn).toEqual({ base: "point", face: "excited" })
  })

  it("stands a whole painting in for a pose and face that cannot be composed yet", () => {
    const drawn = portraitFor("fez", "glassesPoint")

    expect(drawn?.src).toMatch(/glasses-point-fez-250/)
    expect(drawn?.face).toBeUndefined()
  })

  it("composes a pose and face once both are drawn: pointUp is the point base under the excited face", () => {
    const drawn = portraitFor("fez", "pointUp")

    expect(drawn?.src).toMatch(/fez-pose-point-250/)
    expect(drawn?.face).toMatch(/fez-face-excited-250/)
  })

  it("draws the pose with its own face when the speaker has no such face", () => {
    const drawn = portraitFor("ipi", "default", "worried")

    expect(drawn?.face).toBeUndefined()
    expect(drawn?.drawn).toEqual({ base: "default", face: "default" })
  })

  it("keeps the pose and drops the face when the two cannot be drawn together", () => {
    const drawn = portraitFor("fez", "cocktail", "worried")

    expect(drawn?.src).toMatch(/cocktail-fez/)
    expect(drawn?.drawn).toEqual({ base: "cocktail", face: "default" })
  })

  it("falls back to the default pose for one nobody has drawn for that speaker", () => {
    const drawn = portraitFor("ipi", "pointUp")

    expect(drawn?.src).toMatch(/ghost-ipi/)
    expect(drawn?.drawn).toEqual({ base: "default", face: "default" })
  })
})
