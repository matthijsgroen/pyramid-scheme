import { describe, expect, it } from "vitest"
import { pwaIdentity, PRODUCTION_BASE } from "./pwaIdentity"

describe("pwaIdentity", () => {
  it("keeps the production id, so the installed game still receives its updates", () => {
    expect(pwaIdentity(PRODUCTION_BASE)).toEqual({
      id: "com.matthijsgroen.pyramidscheme",
      name: "Pyramid Scheme",
      short_name: "Pyramid Scheme",
    })
  })

  it("gives a build at another base on the same origin its own app, so visiting it cannot take over the installed game", () => {
    const preview = pwaIdentity("/pyramid-scheme-preview/")
    expect(preview.id).not.toBe(pwaIdentity(PRODUCTION_BASE).id)
    expect(preview.id).toBe("/pyramid-scheme-preview/")
  })

  it("names a build at another base as the preview, so its home-screen icon cannot be mistaken for the game", () => {
    expect(pwaIdentity("/pyramid-scheme-preview/").name).toBe("Pyramid Scheme (preview)")
    expect(pwaIdentity("/pyramid-scheme-preview/").short_name).toBe("PS preview")
  })
})
