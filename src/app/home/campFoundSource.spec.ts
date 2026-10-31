// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("campFoundSource", () => {
  beforeEach(() => vi.resetModules())

  it("gives {} with no source", async () => {
    const { useCampFound } = await import("./campFoundSource")
    expect(useCampFound()).toEqual({})
  })

  it("passes on a registered source's value", async () => {
    const { registerCampFoundSource, useCampFound } = await import("./campFoundSource")
    registerCampFoundSource(() => ({ a: true }) as never)
    expect(useCampFound()).toEqual({ a: true })
  })

  it("a second registration replaces the first", async () => {
    const { registerCampFoundSource, useCampFound } = await import("./campFoundSource")
    registerCampFoundSource(() => ({ a: true }) as never)
    registerCampFoundSource(() => ({ b: true }) as never)
    expect(useCampFound()).toEqual({ b: true })
  })
})
