import { describe, expect, it } from "vitest"
import { portraitFor, portraitPart } from "./portraits"

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

  it("carries a pose base's foreground, to be drawn over whichever face lies on it", () => {
    const drawn = portraitFor("fez", "cocktail", "worried")

    expect(drawn?.src).toMatch(/fez-pose-cocktail-250/)
    expect(drawn?.face).toMatch(/fez-face-worried/)
    expect(drawn?.front).toMatch(/fez-pose-cocktail-front-250/)
  })

  it("has no foreground for a base whose pose reaches in front of no face", () => {
    expect(portraitFor("fez", "pointUp")?.front).toBeUndefined()
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

  it("keeps the pose and drops the face when the speaker has no such face", () => {
    const drawn = portraitFor("explorer", "pointUp", "worried")

    expect(drawn?.src).toMatch(/explorer-pose-point/)
    expect(drawn?.face).toBeUndefined()
    expect(drawn?.drawn).toEqual({ base: "point", face: "default" })
  })

  it("falls back to the default pose for one nobody has drawn for that speaker", () => {
    const drawn = portraitFor("ipi", "pointUp")

    expect(drawn?.src).toMatch(/ghost-ipi/)
    expect(drawn?.drawn).toEqual({ base: "default", face: "default" })
  })
})

describe("portraitPart", () => {
  it("draws a composition as a base and face", () => {
    const part = portraitPart("fez", "point", "cool")

    expect(part?.src).toMatch(/fez-pose-point/)
    expect(part?.face).toMatch(/fez-face-cool/)
  })

  it("gives nothing for a pair that cannot be composed, rather than giving way", () => {
    expect(portraitPart("ipi", "point", "default")).toBeUndefined()
  })
})
