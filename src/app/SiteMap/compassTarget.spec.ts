import { describe, it, expect, beforeEach, vi } from "vitest"

// The seam is a module singleton, so each test re-imports it fresh to isolate the provider state.
beforeEach(() => vi.resetModules())

describe("compassTarget seam", () => {
  it("yields null when no mod has registered a target provider (mod off)", async () => {
    const { useCompassTarget } = await import("./compassTarget")
    expect(useCompassTarget()).toBeNull()
  })

  it("reads the registered provider's value", async () => {
    const { registerCompassTarget, useCompassTarget } = await import("./compassTarget")
    registerCompassTarget(() => "d3")
    expect(useCompassTarget()).toBe("d3")
  })

  it("passes through a null target (hunting nothing) from a registered provider", async () => {
    const { registerCompassTarget, useCompassTarget } = await import("./compassTarget")
    registerCompassTarget(() => null)
    expect(useCompassTarget()).toBeNull()
  })
})
