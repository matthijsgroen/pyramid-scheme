import { describe, expect, it } from "vitest"
import { pwaBuild, PRODUCTION_BASE } from "./pwaIdentity"

describe("pwaBuild", () => {
  it("keeps the production app id, so the installed game still receives its updates", () => {
    expect(pwaBuild(PRODUCTION_BASE)).toEqual({
      selfDestroying: false,
      identity: { name: "Pyramid Scheme", short_name: "Pyramid Scheme", id: "com.matthijsgroen.pyramidscheme" },
    })
  })

  it("builds any other base on the same origin without a manifest, so visiting it cannot take over the installed game", () => {
    expect(pwaBuild("/pyramid-scheme-preview/").identity).toBe(false)
  })

  it("ships any other base a service worker that unregisters itself, clearing the ones visitors already hold", () => {
    expect(pwaBuild("/pyramid-scheme-preview/").selfDestroying).toBe(true)
  })
})
