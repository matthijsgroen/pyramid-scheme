import { describe, expect, it, vi } from "vitest"
import type { InputAction, InputSignal } from "@/app/input/actions"
import { padKeys, type PadPick } from "./padKeys"

const signal = (action: InputAction, extra: Partial<InputSignal> = {}): InputSignal => ({
  action,
  source: "pad",
  repeat: false,
  released: false,
  target: null,
  ...extra,
})

const at = { row: 1, col: 2 }

const padOf = (size = 4, picked?: PadPick, exhausted?: ReadonlySet<number>) => {
  const pad = { size, picked, exhausted, onPick: vi.fn(), onValue: vi.fn(), onErase: vi.fn(), onTogglePencil: vi.fn() }
  return { pad, press: (action: InputAction, extra?: Partial<InputSignal>) => padKeys(pad)(signal(action, extra), at) }
}

describe(padKeys, () => {
  it("presses a value's key for the square under the cursor, and leaves a digit past the pad alone", () => {
    const { pad, press } = padOf(4)
    expect(press({ kind: "value", value: 3 })).toBe(true)
    expect(pad.onValue).toHaveBeenCalledWith(3, at)
    expect(press({ kind: "value", value: 5 })).toBe(false)
    expect(pad.onValue).toHaveBeenCalledTimes(1)
  })

  it("gives erase to the eraser and alt to the pencil, once for a held key", () => {
    const { pad, press } = padOf()
    press({ kind: "erase" })
    press({ kind: "erase" }, { repeat: true })
    press({ kind: "alt" })
    expect(pad.onErase).toHaveBeenCalledTimes(1)
    expect(pad.onErase).toHaveBeenCalledWith(at)
    expect(pad.onTogglePencil).toHaveBeenCalledTimes(1)
  })

  it.each([
    [undefined, "next", 1],
    [undefined, "prev", 4],
    [2, "next", 3],
    [4, "next", "erase"],
    ["erase", "next", 1],
    [1, "prev", "erase"],
  ] as const)("from %s, %s picks %s", (picked, kind, expected) => {
    const { pad, press } = padOf(4, picked)
    press({ kind })
    expect(pad.onPick).toHaveBeenCalledWith(expected)
  })

  it.each([
    [undefined, "next", 2],
    [undefined, "prev", 3],
    [2, "next", 3],
    [3, "next", "erase"],
    ["erase", "next", 2],
    [2, "prev", "erase"],
  ] as const)("with 1 and 4 used up, from %s, %s picks %s", (picked, kind, expected) => {
    const { pad, press } = padOf(4, picked, new Set([1, 4]))
    press({ kind })
    expect(pad.onPick).toHaveBeenCalledWith(expected)
  })

  it("presses the picked key on confirm, and leaves confirm to the board while nothing is picked", () => {
    const value = padOf(4, 2)
    expect(value.press({ kind: "confirm" })).toBe(true)
    expect(value.pad.onValue).toHaveBeenCalledWith(2, at)

    const eraser = padOf(4, "erase")
    eraser.press({ kind: "confirm" })
    expect(eraser.pad.onErase).toHaveBeenCalledWith(at)

    expect(padOf().press({ kind: "confirm" })).toBe(false)
  })

  it("leaves moves and the shell's actions to the layers around it", () => {
    const { press } = padOf()
    for (const action of [{ kind: "move", dir: "n" }, { kind: "back" }, { kind: "undo" }] as const) {
      expect(press(action)).toBe(false)
    }
  })
})
