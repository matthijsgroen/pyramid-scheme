// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"
import type { ReactNode } from "react"
import { PuzzleRoomContext, usePuzzleState, useClearPuzzleState } from "./puzzleState"
import { clearGameData, writeGameData } from "@/support/useGameStorage"

type Board = { moves: number[] }
const create = (): Board => ({ moves: [] })
const BOARD = { cells: 9 }

const inRoom =
  (room: string | undefined) =>
  ({ children }: { children: ReactNode }) => <PuzzleRoomContext value={room}>{children}</PuzzleRoomContext>

// The storage read lands on its own microtask; settle it before reading the restored board back.
const settle = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}

const playIn = async (room: string | undefined, move: number, board: unknown = BOARD) => {
  const { result, unmount } = renderHook(() => usePuzzleState(create, board), { wrapper: inRoom(room) })
  await settle()
  await act(async () => {
    result.current[1](prev => ({ moves: [...prev.moves, move] }))
  })
  unmount()
}

const boardIn = async (room: string | undefined, board: unknown = BOARD) => {
  const { result } = renderHook(() => usePuzzleState(create, board), { wrapper: inRoom(room) })
  await settle()
  await settle()
  return result
}

describe("usePuzzleState", () => {
  beforeEach(async () => {
    await clearGameData()
  })

  it("hands an unfinished board back to the room it was left in", async () => {
    await playIn("room-a", 1)

    const result = await boardIn("room-a")
    expect(result.current[0].moves).toEqual([1])
  })

  it("starts another room fresh, whatever is still stored", async () => {
    await playIn("room-a", 1)

    const result = await boardIn("room-b")
    expect(result.current[0].moves).toEqual([])
  })

  it("starts the same room fresh when the board under it is not the one the state was played on", async () => {
    await playIn("room-a", 1, { cells: 9 })

    const result = await boardIn("room-a", { cells: 16 })
    expect(result.current[0].moves).toEqual([])
  })

  it("plays the next move onto a fresh board, not onto the state of the board it replaced", async () => {
    await playIn("room-a", 1, { cells: 9 })
    await playIn("room-a", 2, { cells: 16 })

    const result = await boardIn("room-a", { cells: 16 })
    expect(result.current[0].moves).toEqual([2])
  })

  it("does not trust a record written before boards were stamped, and starts fresh", async () => {
    await writeGameData({ puzzleState: { room: "room-a", state: { moves: [7] } } })

    const result = await boardIn("room-a", { cells: 16 })
    expect(result.current[0].moves).toEqual([])
  })

  it("keeps a board with no room in memory only", async () => {
    await playIn(undefined, 1)

    const result = await boardIn(undefined)
    expect(result.current[0].moves).toEqual([])
  })

  it("forgets the board once the room resolves", async () => {
    await playIn("room-a", 1)

    const { result: clear } = renderHook(() => useClearPuzzleState())
    await settle()
    await act(async () => {
      clear.current()
    })

    const result = await boardIn("room-a")
    expect(result.current[0].moves).toEqual([])
  })
})
