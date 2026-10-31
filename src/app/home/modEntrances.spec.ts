import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ModEntrance } from "./modEntrances"

const entrance = (id: string, label: string): ModEntrance => ({
  id,
  object: "window",
  useLabel: () => ({ label }),
  Screen: () => null,
  title: () => label,
})

describe("modEntrances", () => {
  beforeEach(() => vi.resetModules())

  it("holds what was registered", async () => {
    const { registerModEntrance, modEntrances } = await import("./modEntrances")
    registerModEntrance(entrance("x", "X"))
    registerModEntrance(entrance("y", "Y"))
    expect(modEntrances().map(e => e.id)).toEqual(["x", "y"])
  })

  it("keeps one entrance per id, the latest", async () => {
    const { registerModEntrance, modEntrances } = await import("./modEntrances")
    registerModEntrance(entrance("x", "first"))
    registerModEntrance(entrance("x", "second"))
    expect(modEntrances()).toHaveLength(1)
    expect(modEntrances()[0].title(k => k)).toBe("second")
  })
})
