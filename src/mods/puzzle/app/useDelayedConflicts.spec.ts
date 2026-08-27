import { afterEach, describe, expect, it } from "vitest"
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { cellAt, eclipseConflicts, type EclipsePuzzle, type Mark } from "@/mods/puzzle/game/eclipse/eclipse"
import { useDelayedConflicts } from "./useDelayedConflicts"

const SIZE = 4
const S: Mark = "sun"
const M: Mark = "moon"

const puzzle: EclipsePuzzle = { size: SIZE, given: new Array(SIZE * SIZE).fill(undefined), links: [] }

const row = (...marks: (Mark | undefined)[]) => {
  const all: (Mark | undefined)[] = new Array(SIZE * SIZE).fill(undefined)
  marks.forEach((mark, col) => (all[cellAt(SIZE, 0, col)] = mark))
  return all
}

const tap = (marks: (Mark | undefined)[], quietMs: number) =>
  renderHook(
    ({ marks }: { marks: (Mark | undefined)[] }) =>
      useDelayedConflicts(marks, marks => eclipseConflicts(puzzle, { marks }), quietMs),
    {
      // A board opens on its givens, which never break a rule; what has to wait is what the player then taps.
      initialProps: { marks },
    }
  )

// This project doesn't enable RTL's automatic cleanup, and this hook leaves a timer running: without an
// unmount it fires once Vitest has torn jsdom down, failing the run from outside any test.
afterEach(cleanup)

describe("useDelayedConflicts", () => {
  it("says nothing about a square the player is still tapping through", () => {
    const { result, rerender } = tap(row(S, S), 10_000)
    // One tap makes it a sun — three in a row — but the next tap may make it a moon.
    rerender({ marks: row(S, S, S) })
    expect([...result.current]).toEqual([])
  })

  it("draws it once the square is left alone", async () => {
    const { result, rerender } = tap(row(S, S), 20)
    rerender({ marks: row(S, S, S) })
    await waitFor(() => expect(result.current.size).toBeGreaterThan(0))
    expect([...result.current]).toContain(cellAt(SIZE, 0, 1))
  })

  it("takes it back when the next tap moves the square on", async () => {
    const { result, rerender } = tap(row(S, S), 20)
    rerender({ marks: row(S, S, S) })
    rerender({ marks: row(S, S, M) })
    await waitFor(() => expect(result.current.size).toBe(0))
  })

  it("keeps a red the player has already earned while they tap elsewhere", async () => {
    const { result, rerender } = tap(row(S, S), 20)
    rerender({ marks: row(S, S, S) })
    await waitFor(() => expect(result.current.size).toBeGreaterThan(0))

    const elsewhere = row(S, S, S)
    elsewhere[cellAt(SIZE, 3, 3)] = M
    rerender({ marks: elsewhere })
    expect([...result.current]).toContain(cellAt(SIZE, 0, 1))
  })
})
