// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import { readModState } from "@/app/state/useModState"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

vi.mock("@/app/SiteMap/perkContributions", () => ({ useMergedEarnedPerks: () => [] }))

const { useTrapHomeTags, useTrapProgress } = await import("./useTrapProgress")

const loadTrap = async (stored: unknown) => {
  await writeGameData({ "pyramid-scheme-mod-trap": stored })
  const hook = renderHook(() => useTrapProgress())
  await waitFor(() => expect(readModState("trap")).toEqual(stored))
  return hook
}

beforeEach(async () => {
  await clearGameData()
})

describe("mended", () => {
  it("is recorded true when a homecoming refills a missing heart", async () => {
    const { result } = await loadTrap({ health: 2 })
    await waitFor(() => expect(result.current.currentHealth).toBe(2))
    await act(async () => result.current.restoreHealth())
    expect(result.current.mended).toBe(true)
    expect(result.current.currentHealth).toBe(6)
    expect(readModState("trap")).toEqual({ health: 6, mended: true })
  })

  it("is recorded false when the homecoming finds health full", async () => {
    const { result } = await loadTrap({ health: 6, mended: true })
    await waitFor(() => expect(result.current.mended).toBe(true))
    await act(async () => result.current.restoreHealth())
    expect(result.current.mended).toBe(false)
    expect(readModState("trap")).toEqual({ health: 6, mended: false })
  })

  it("reads false from a stored state without the field, which still restores", async () => {
    const { result } = await loadTrap({ health: 3 })
    await waitFor(() => expect(result.current.currentHealth).toBe(3))
    expect(result.current.mended).toBe(false)
    await act(async () => result.current.restoreHealth())
    expect(result.current.currentHealth).toBe(6)
    expect(result.current.mended).toBe(true)
  })

  it("is left as the last homecoming wrote it by a trap hit", async () => {
    const { result } = await loadTrap({ health: 6, mended: true })
    await waitFor(() => expect(result.current.mended).toBe(true))
    await act(async () => result.current.takeTrapDamage())
    expect(readModState<{ mended?: boolean }>("trap")?.mended).toBe(true)
  })
})

describe("the trap's home tags", () => {
  it.each([
    [{ health: 6, mended: true }, ["trap.mended"]],
    [{ health: 6, mended: false }, []],
    [{ health: 6 }, []],
  ])("for %j say %j", async (stored, expected) => {
    await writeGameData({ "pyramid-scheme-mod-trap": stored })
    const { result } = renderHook(() => useTrapHomeTags())
    await waitFor(() => expect(readModState("trap")).toEqual(stored))
    await waitFor(() => expect(result.current).toEqual(expected))
  })
})
