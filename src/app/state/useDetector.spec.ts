// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useDetector } from "./useDetector"

// ── Minimal world stub ────────────────────────────────────────────────────────
// Compass scanning is mod-owned now (each mod registers a scanner via detectorScanners); this
// spec imports no mod, so the merged compass scanner is empty and compassResults stays []. The
// hieroglyph compass scan itself is covered by src/mods/hieroglyph/app/compassScanner.spec.ts.

vi.mock("@/data/generatedWorld", () => ({
  generatedWorldConfigs: {
    starter_1: [[{}]],
  },
}))

// The real store is async and shared between instances; this spec is about detector logic, so swap
// it for plain component state and record the keys it was asked to persist.
const { storageKeys } = vi.hoisted(() => ({ storageKeys: [] as string[] }))
vi.mock("@/support/useGameStorage", async () => {
  const { useState } = await vi.importActual<typeof import("react")>("react")
  return {
    useGameStorage: (key: string, initial: unknown) => {
      storageKeys.push(key)
      return useState(initial)
    },
  }
})

// ── activeDetector state ──────────────────────────────────────────────────────

describe("activeDetector", () => {
  it("starts as null", () => {
    const { result } = renderHook(() => useDetector())
    expect(result.current.activeDetector).toBeNull()
  })

  it("setDetector updates the mode", () => {
    const { result } = renderHook(() => useDetector())
    act(() => result.current.setDetector("compass"))
    expect(result.current.activeDetector).toBe("compass")
  })

  // SiteMapScreen is remounted on every site entry, so component state would switch the detector
  // off each time the player walks into another pyramid — it has to be persisted.
  it("keeps the running detector outside the screen that started it", () => {
    renderHook(() => useDetector())
    expect(storageKeys).toContain("activeDetector")
  })

  it("setDetector to null clears the mode", () => {
    const { result } = renderHook(() => useDetector())
    act(() => result.current.setDetector("hiddenPassageway"))
    act(() => result.current.setDetector(null))
    expect(result.current.activeDetector).toBeNull()
  })
})

// ── compassResults ────────────────────────────────────────────────────────────

describe("compassResults", () => {
  it("returns [] when mode is not compass", () => {
    const { result } = renderHook(() => useDetector())
    expect(result.current.compassResults).toHaveLength(0)
  })

  it("returns [] when compass active but no target set (no mod owns the target seam here)", () => {
    const { result } = renderHook(() => useDetector())
    act(() => result.current.setDetector("compass"))
    // No fragment mod imported → compassTarget seam yields null → nothing to scan.
    expect(result.current.compassTarget).toBeNull()
    expect(result.current.compassResults).toHaveLength(0)
  })
})
