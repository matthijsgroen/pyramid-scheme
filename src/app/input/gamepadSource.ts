import type { Direction } from "@/game/siteTypes"
import type { InputAction, InputSignal } from "./actions"

// The standard mapping, by position: the bottom face button confirms whatever its label says.
const BUTTONS: Record<number, InputAction> = {
  0: { kind: "confirm" },
  1: { kind: "back" },
  2: { kind: "undo" },
  3: { kind: "alt" },
  4: { kind: "prev" },
  5: { kind: "next" },
  8: { kind: "hint" },
  9: { kind: "menu" },
}
const DPAD: Record<number, Direction> = { 12: "n", 13: "s", 14: "w", 15: "e" }
const DIRECTIONS: Direction[] = ["n", "e", "s", "w"]

/** How far the stick must lean before it is a direction; drift below this is nothing. */
export const STICK_THRESHOLD = 0.5
/** Polls a held direction waits before it repeats (about 400ms at 60 frames a second). */
export const REPEAT_DELAY = 24
/** Polls between repeats after that (about 130ms at 60 frames a second). */
export const REPEAT_EVERY = 8

type Pad = Pick<Gamepad, "index" | "connected" | "axes"> & {
  /** The browser's name for the pad; absent on a pad that gives none. */
  id?: string
  buttons: readonly Pick<GamepadButton, "pressed" | "value">[]
}

type Options = {
  target?: Window
  pads?: () => readonly (Pad | null)[]
  requestFrame?: (poll: () => void) => number
  cancelFrame?: (id: number) => void
}

// The stick's direction is its stronger axis, so a diagonal lean is one direction, never two.
const stickDirection = ({ axes }: Pad): Direction | undefined => {
  const [x = 0, y = 0] = axes
  if (Math.max(Math.abs(x), Math.abs(y)) < STICK_THRESHOLD) return undefined
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? "e" : "w"
  return y > 0 ? "s" : "n"
}

const isDown = (pad: Pad, index: number) => {
  const button = pad.buttons[index]
  return !!button && (button.pressed || button.value > 0.5)
}

/** Every control held on `pad` this poll, keyed so the same control is the same key next poll. */
const heldControls = (pad: Pad) => {
  const held = new Map<string, InputAction>()
  for (const [index, action] of Object.entries(BUTTONS)) if (isDown(pad, Number(index))) held.set(index, action)
  const stick = stickDirection(pad)
  for (const dir of DIRECTIONS) {
    const dpad = Object.entries(DPAD).some(([index, d]) => d === dir && isDown(pad, Number(index)))
    if (dpad || stick === dir) held.set(`move:${dir}`, { kind: "move", dir })
  }
  return held
}

/**
 * Turns connected game pads into input signals for `deliver`. Polls once a frame while at least one pad is
 * connected, and not at all without one. A press is delivered once, on the poll it goes down; a held direction
 * repeats after `REPEAT_DELAY` polls and then every `REPEAT_EVERY`; letting go is delivered as a release.
 * A press comes with the `id` of the pad that made it, so the brand can follow the pad in hand.
 */
export const listenToGamepads = (
  deliver: (signal: InputSignal, padId?: string) => void,
  {
    target = window,
    pads = () => target.navigator.getGamepads?.() ?? [],
    requestFrame = poll => target.requestAnimationFrame(poll),
    cancelFrame = id => target.cancelAnimationFrame(id),
  }: Options = {}
) => {
  // Per pad index: each control held, with the polls it has been held for.
  const state = new Map<number, Map<string, { action: InputAction; polls: number }>>()
  let frame: number | undefined

  const send = (action: InputAction, repeat: boolean, released: boolean, padId?: string) =>
    deliver({ action, source: "pad", repeat, released, target: target.document.activeElement }, padId)

  const letGo = (index: number) => {
    for (const { action } of state.get(index)?.values() ?? []) send(action, false, true)
    state.delete(index)
  }

  const connected = () => pads().filter((pad): pad is Pad => !!pad && pad.connected)

  const poll = () => {
    frame = undefined
    const now = connected()
    for (const index of state.keys()) if (!now.some(pad => pad.index === index)) letGo(index)
    if (now.length === 0) return

    for (const pad of now) {
      const before = state.get(pad.index) ?? new Map()
      const after = heldControls(pad)
      for (const [key, { action }] of before) if (!after.has(key)) send(action, false, true)
      const next = new Map<string, { action: InputAction; polls: number }>()
      for (const [key, action] of after) {
        const polls = (before.get(key)?.polls ?? -1) + 1
        next.set(key, { action, polls })
        if (polls === 0) send(action, false, false, pad.id)
        else if (action.kind === "move" && polls >= REPEAT_DELAY && (polls - REPEAT_DELAY) % REPEAT_EVERY === 0)
          send(action, true, false, pad.id)
      }
      state.set(pad.index, next)
    }
    frame = requestFrame(poll)
  }

  const start = () => {
    frame ??= requestFrame(poll)
  }
  const disconnected = (event: Event) => {
    const index = (event as GamepadEvent).gamepad?.index
    if (index !== undefined) letGo(index)
  }

  target.addEventListener("gamepadconnected", start)
  target.addEventListener("gamepaddisconnected", disconnected)
  // A pad connected before this listener (a reload) is already there to poll.
  if (connected().length > 0) start()

  return () => {
    target.removeEventListener("gamepadconnected", start)
    target.removeEventListener("gamepaddisconnected", disconnected)
    if (frame !== undefined) cancelFrame(frame)
    frame = undefined
    state.clear()
  }
}
