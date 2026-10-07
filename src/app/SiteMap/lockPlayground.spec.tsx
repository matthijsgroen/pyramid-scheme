// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { parseLock } from "@/game/lockNotation"
import { walkFloorLock } from "@/game/floorLockWalk"
import { PLAYGROUND_JOURNEY, carvePlayground, defaultBinding, playgroundFloor } from "./playgroundCarve.testing"
import { assemblePlayedFloor } from "./useAssembledFloor"
import { LockPlayground, useCarving } from "./lockPlayground.testing"
import "@/mods/registerModApps"

// jsdom has no layout, so the map's scroll-to-explorer has nothing to call.
beforeAll(() => {
  Element.prototype.scrollTo = () => {}
})

// Wraps the real carve so a spec can count how many seeds the search judges.
vi.mock("./useAssembledFloor", async importOriginal => {
  const original = await importOriginal<typeof import("./useAssembledFloor")>()
  return { ...original, assemblePlayedFloor: vi.fn(original.assemblePlayedFloor) }
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.mocked(assemblePlayedFloor).mockClear()
})

const LEVER = "in -[L]- out\nL toggle @in\nin *\nout *"

describe("the playground's floor", () => {
  it("frees every region and binds the realisations it is given", () => {
    const config = playgroundFloor(parseLock(LEVER, "lever").lock, { toggle: "handle" })
    const lock = config.locks![0].lock
    expect(Object.values(lock.regions)).toEqual([{ takes: "free" }, { takes: "free" }])
    expect(config.realisations).toEqual({ toggle: "handle" })
    expect(config.pathPuzzles).toBe(0)
  })

  it("carves a floor whose lock walks sound, the same grid every time it is carved at that seed", () => {
    const config = playgroundFloor(parseLock(LEVER, "lever").lock, defaultBinding())
    const carved = carvePlayground(config)
    if (!carved.found) throw new Error(JSON.stringify(carved.reasons))
    expect(walkFloorLock(carved.grid)?.sound).toBe(true)
    const again = assemblePlayedFloor(PLAYGROUND_JOURNEY, config, carved.seed, 0)
    expect(again.success && again.grid).toEqual(carved.grid)
    expect(carvePlayground(config)).toEqual(carved)
  })
})

describe("LockPlayground", () => {
  it("lists every lock it is given and draws the first one's floor", async () => {
    const { container } = render(<LockPlayground locks={{ lever: LEVER, second: LEVER }} />)
    expect(screen.getByRole("option", { name: "lever" })).toBeTruthy()
    expect(screen.getByRole("option", { name: "second" })).toBeTruthy()
    await waitFor(() => expect(container.querySelector("[data-explorer]")).not.toBeNull())
  })

  it("says why a lock does not parse instead of drawing a floor", () => {
    const { container } = render(<LockPlayground locks={{ broken: "in -[L]- out\nL lever @nowhere" }} />)
    expect(container.querySelector("[data-playground-refused]")?.textContent).toMatch(/line/)
    expect(container.querySelector("[data-explorer]")).toBeNull()
  })
})

describe("the playground's search for a seed", () => {
  const config = () => playgroundFloor(parseLock(LEVER, "lever").lock, defaultBinding())

  it("judges one seed per task, through the seed step carvePlayground uses", () => {
    vi.useFakeTimers()
    const refuse = { success: false, reasons: [{ type: "layoutNotFound" }] } as unknown as ReturnType<
      typeof assemblePlayedFloor
    >
    vi.mocked(assemblePlayedFloor).mockReturnValue(refuse)
    const floor = config()
    const { result } = renderHook(() => useCarving(floor))
    act(() => vi.advanceTimersToNextTimer())
    expect(vi.mocked(assemblePlayedFloor)).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersToNextTimer())
    expect(vi.mocked(assemblePlayedFloor)).toHaveBeenCalledTimes(2)
    expect(result.current).toEqual({ status: "carving", tried: 2 })
  })

  it("judges no further seed once it is unmounted", () => {
    vi.useFakeTimers()
    const refuse = { success: false, reasons: [{ type: "layoutNotFound" }] } as unknown as ReturnType<
      typeof assemblePlayedFloor
    >
    vi.mocked(assemblePlayedFloor).mockReturnValue(refuse)
    const floor = config()
    const { unmount } = renderHook(() => useCarving(floor))
    act(() => vi.advanceTimersToNextTimer())
    const judged = vi.mocked(assemblePlayedFloor).mock.calls.length
    unmount()
    act(() => vi.runAllTimers())
    expect(vi.mocked(assemblePlayedFloor)).toHaveBeenCalledTimes(judged)
  })

  it("judges no further seed of the old floor once another floor is given", () => {
    vi.useFakeTimers()
    const refuse = { success: false, reasons: [{ type: "layoutNotFound" }] } as unknown as ReturnType<
      typeof assemblePlayedFloor
    >
    vi.mocked(assemblePlayedFloor).mockReturnValue(refuse)
    const first = config()
    const second = config()
    const { rerender } = renderHook(({ floor }) => useCarving(floor), { initialProps: { floor: first } })
    act(() => vi.advanceTimersToNextTimer())
    rerender({ floor: second })
    vi.mocked(assemblePlayedFloor).mockClear()
    act(() => vi.advanceTimersToNextTimer())
    expect(vi.mocked(assemblePlayedFloor).mock.calls.every(call => call[1] === second)).toBe(true)
    expect(vi.mocked(assemblePlayedFloor)).toHaveBeenCalledTimes(1)
  })
})
