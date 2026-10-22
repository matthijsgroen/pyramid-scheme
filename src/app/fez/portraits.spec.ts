import { describe, expect, it } from "vitest"
import { portraitFor } from "./portraits"

describe("portraitFor", () => {
  it("lays a speaker's face over a pose cut to fit it", () => {
    const drawn = portraitFor("fez", "pointUp", "worried")

    expect(drawn?.src).toMatch(/point-fez-base/)
    expect(drawn?.face).toMatch(/fez-face-worried/)
  })

  it("keeps the pose's own painting when no face is asked for", () => {
    expect(portraitFor("fez", "pointUp")?.src).toMatch(/point-fez-250/)
  })

  it("draws the pose alone when the speaker has no such face", () => {
    expect(portraitFor("ipi", "default", "worried")?.face).toBeUndefined()
  })

  it("draws the pose alone when it is a separate painting the face was not cut for", () => {
    expect(portraitFor("fez", "cocktail", "worried")?.face).toBeUndefined()
  })

  it("falls back to the default pose for one nobody has drawn for that speaker", () => {
    expect(portraitFor("ipi", "pointUp")?.src).toMatch(/ghost-ipi/)
  })
})
