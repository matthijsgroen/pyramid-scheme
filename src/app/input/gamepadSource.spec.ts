// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { InputSignal } from "./actions"
import { listenToGamepads, REPEAT_DELAY, REPEAT_EVERY } from "./gamepadSource"

type FakePad = { index: number; connected: boolean; buttons: { pressed: boolean; value: number }[]; axes: number[] }

const makePad = (index = 0): FakePad => ({
  index,
  connected: true,
  buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
  axes: [0, 0, 0, 0],
})

let pads: (FakePad | null)[] = []
let frames: (() => void)[] = []
const deliver = vi.fn((_signal: InputSignal) => {})
let stop = () => {}

const step = (count = 1) => {
  for (let i = 0; i < count; i++) frames.splice(0).forEach(poll => poll())
}
const connect = (pad: FakePad) => {
  pads.push(pad)
  window.dispatchEvent(new Event("gamepadconnected"))
}
const disconnect = (pad: FakePad) => {
  pad.connected = false
  pads = pads.filter(p => p !== pad)
  const event = Object.assign(new Event("gamepaddisconnected"), { gamepad: pad })
  window.dispatchEvent(event)
}
const press = (pad: FakePad, button: number, down = true) => {
  pad.buttons[button] = { pressed: down, value: down ? 1 : 0 }
}
const signals = () => deliver.mock.calls.map(([signal]) => signal)
const pressesOf = () => signals().filter(signal => !signal.released)

beforeEach(() => {
  pads = []
  frames = []
  deliver.mockClear()
  stop = listenToGamepads(deliver, {
    pads: () => pads,
    requestFrame: poll => frames.push(poll),
    cancelFrame: () => {
      frames = []
    },
  })
})
afterEach(() => stop())

describe("a game pad as an input source", () => {
  it("does not poll while no pad is connected", () => {
    expect(frames).toHaveLength(0)
  })

  it("delivers a press once, on the poll it goes down, as a pad signal", () => {
    const pad = makePad()
    connect(pad)
    press(pad, 0)
    step(5)
    expect(signals()).toEqual([
      { action: { kind: "confirm" }, source: "pad", repeat: false, released: false, target: document.body },
    ])
  })

  it("maps the face buttons, shoulders, Select and Start by position", () => {
    const pad = makePad()
    connect(pad)
    for (const button of [0, 1, 2, 3, 4, 5, 8, 9]) press(pad, button)
    step()
    expect(pressesOf().map(signal => signal.action.kind)).toEqual([
      "confirm",
      "back",
      "undo",
      "alt",
      "prev",
      "next",
      "hint",
      "menu",
    ])
  })

  it("repeats a held direction after the delay, then every few polls, counted in polls", () => {
    const pad = makePad()
    connect(pad)
    press(pad, 15)
    step(REPEAT_DELAY + 2 * REPEAT_EVERY + 1)
    expect(pressesOf().map(signal => signal.repeat)).toEqual([false, true, true, true])
    expect(pressesOf().every(signal => signal.action.kind === "move" && signal.action.dir === "e")).toBe(true)
  })

  it("does not repeat a held button", () => {
    const pad = makePad()
    connect(pad)
    press(pad, 1)
    step(REPEAT_DELAY + 3 * REPEAT_EVERY)
    expect(pressesOf()).toHaveLength(1)
  })

  it("lets a direction go when it is released, and repeats no more", () => {
    const pad = makePad()
    connect(pad)
    press(pad, 12)
    step(3)
    press(pad, 12, false)
    step(REPEAT_DELAY * 2)
    expect(signals()).toEqual([
      expect.objectContaining({ action: { kind: "move", dir: "n" }, released: false }),
      expect.objectContaining({ action: { kind: "move", dir: "n" }, released: true }),
    ])
  })

  it("reads the stick past the threshold as its stronger direction, and ignores drift", () => {
    const pad = makePad()
    connect(pad)
    pad.axes = [0.2, -0.3]
    step(3)
    expect(signals()).toEqual([])
    pad.axes = [-0.9, 0.6]
    step()
    expect(pressesOf().map(signal => signal.action)).toEqual([{ kind: "move", dir: "w" }])
  })

  it("treats the d-pad and the stick held the same way as one direction", () => {
    const pad = makePad()
    connect(pad)
    press(pad, 13)
    step()
    pad.axes = [0, 1]
    press(pad, 13, false)
    step()
    expect(signals()).toHaveLength(1)
  })

  it("stops polling once the last pad disconnects, letting go of what it held", () => {
    const pad = makePad()
    connect(pad)
    press(pad, 14)
    step()
    disconnect(pad)
    step()
    expect(frames).toHaveLength(0)
    expect(signals().at(-1)).toEqual(expect.objectContaining({ action: { kind: "move", dir: "w" }, released: true }))
  })

  it("starts polling at once for a pad connected before it listened", () => {
    stop()
    pads = [makePad()]
    stop = listenToGamepads(deliver, { pads: () => pads, requestFrame: poll => frames.push(poll) })
    expect(frames).toHaveLength(1)
  })
})
