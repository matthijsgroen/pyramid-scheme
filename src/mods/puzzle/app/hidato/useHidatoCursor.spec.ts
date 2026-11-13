// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { InputAction } from "@/app/input/actions"
import { hexagon, hexKey, hexNeighbours } from "@/mods/puzzle/game/hidato/hex"
import { NEIGHBOUR_KEYS, neighbourOf, useHidatoCursor } from "./useHidatoCursor"

const cells = new Set(hexagon(1).map(hexKey))

const setup = (pen?: string) => {
  const calls = { onPress: vi.fn(), onDrag: vi.fn(), onLift: vi.fn() }
  const { result, rerender } = renderHook(
    (props: { pen?: string }) => useHidatoCursor({ cells, start: "0,0", pen: props.pen, ...calls }),
    { initialProps: { pen } }
  )
  const send = (action: InputAction, released = false) => {
    let used = false
    act(() => {
      used = result.current.handle({ action, source: "keys", repeat: false, released, target: null })
    })
    return used
  }
  return { result, rerender, send, ...calls }
}

describe("useHidatoCursor", () => {
  it("reaches each of a cell's six neighbours with exactly one direction", () => {
    const reached = NEIGHBOUR_KEYS.map(({ dir, right }) => neighbourOf("0,0", dir, right))
    expect(new Set(reached)).toEqual(new Set(hexNeighbours({ q: 0, r: 0 }).map(hexKey)))
  })

  it("moves up and down to the left-hand neighbours, and to the right-hand ones with alt held or by veer", () => {
    const { result, send } = setup()
    send({ kind: "move", dir: "n" })
    expect(result.current.at).toBe("0,-1")
    send({ kind: "move", dir: "s" })
    expect(result.current.at).toBe("-1,0")
    send({ kind: "alt" })
    send({ kind: "move", dir: "n" })
    expect(result.current.at).toBe("0,-1")
    send({ kind: "alt" }, true)
    send({ kind: "move", dir: "e" })
    send({ kind: "veer", dir: "s" })
    expect(result.current.at).toBe("1,0")
  })

  it("stays put where the neighbour is off the comb", () => {
    const { result, send } = setup()
    send({ kind: "move", dir: "w" })
    send({ kind: "move", dir: "w" })
    expect(result.current.at).toBe("-1,0")
  })

  it("drags the run into the neighbour while it is picked up, and stands on the run's head", () => {
    const { result, send, onDrag } = setup("0,0")
    send({ kind: "move", dir: "e" })
    expect(onDrag).toHaveBeenCalledWith("1,0")
    expect(result.current.at).toBe("0,0")
    expect(result.current.held).toBe(true)
  })

  it("taps the cell under the cursor on confirm", () => {
    const { send, onPress } = setup()
    send({ kind: "move", dir: "e" })
    send({ kind: "confirm" })
    expect(onPress).toHaveBeenCalledWith("1,0")
  })

  it("puts a picked-up run down on back, and leaves back to the shell without one", () => {
    const { send, onLift } = setup("0,0")
    expect(send({ kind: "back" })).toBe(true)
    expect(onLift).toHaveBeenCalledOnce()
    const free = setup()
    expect(free.send({ kind: "back" })).toBe(false)
  })

  it("carries on from where the run was put down", () => {
    const { result, rerender } = setup()
    rerender({ pen: "1,-1" })
    rerender({ pen: undefined })
    expect(result.current.at).toBe("1,-1")
  })
})
