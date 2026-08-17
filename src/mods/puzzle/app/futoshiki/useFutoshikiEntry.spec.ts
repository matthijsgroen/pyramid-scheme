import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { useFutoshikiEntry } from "./useFutoshikiEntry"

describe("useFutoshikiEntry", () => {
  it("starts with nothing picked, so the pad has nowhere to write", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    expect(result.current.selected).toBeUndefined()
  })

  it("picks the square that was tapped", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    act(() => result.current.selectCell(1, 2))
    expect(result.current.selected).toEqual({ row: 1, col: 2 })
  })

  it("tapping the picked square again lets go of it", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    act(() => result.current.selectCell(1, 2))
    act(() => result.current.selectCell(1, 2))
    expect(result.current.selected).toBeUndefined()
  })

  it("moves to another square rather than letting go", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    act(() => result.current.selectCell(1, 2))
    act(() => result.current.selectCell(0, 2))
    expect(result.current.selected).toEqual({ row: 0, col: 2 })
  })

  it("aims at a square without toggling it off, so a hint can land on the picked one", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    act(() => result.current.selectCell(1, 2))
    act(() => result.current.focusCell(1, 2))
    expect(result.current.selected).toEqual({ row: 1, col: 2 })
    act(() => result.current.focusCell(3, 0))
    expect(result.current.selected).toEqual({ row: 3, col: 0 })
  })

  it("switches between writing answers and pencilling notes", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    expect(result.current.pencil).toBe(false)
    act(() => result.current.togglePencil())
    expect(result.current.pencil).toBe(true)
  })

  it("keeps the pencil on while the picked square changes", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    act(() => result.current.togglePencil())
    act(() => result.current.selectCell(2, 2))
    expect(result.current.pencil).toBe(true)
  })

  it("lets go of the square when the board is reset under it", () => {
    const { result } = renderHook(() => useFutoshikiEntry())
    act(() => result.current.selectCell(1, 1))
    act(() => result.current.clearSelection())
    expect(result.current.selected).toBeUndefined()
  })
})
