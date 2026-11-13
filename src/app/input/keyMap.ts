import type { InputAction } from "./actions"

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// By physical position (`code`), so WASD is ZQSD on an AZERTY keyboard.
const KEYS: Record<string, InputAction> = {
  ArrowUp: { kind: "move", dir: "n" },
  ArrowRight: { kind: "move", dir: "e" },
  ArrowDown: { kind: "move", dir: "s" },
  ArrowLeft: { kind: "move", dir: "w" },
  KeyW: { kind: "move", dir: "n" },
  KeyD: { kind: "move", dir: "e" },
  KeyS: { kind: "move", dir: "s" },
  KeyA: { kind: "move", dir: "w" },
  // Beside W and below D: with WASD these give each of a hex's six neighbours its own key.
  KeyE: { kind: "veer", dir: "n" },
  KeyX: { kind: "veer", dir: "s" },
  Enter: { kind: "confirm" },
  NumpadEnter: { kind: "confirm" },
  Space: { kind: "confirm" },
  Escape: { kind: "back" },
  Backspace: { kind: "erase" },
  KeyZ: { kind: "undo" },
  KeyN: { kind: "alt" },
  ShiftLeft: { kind: "alt" },
  ShiftRight: { kind: "alt" },
  Delete: { kind: "erase" },
  BracketLeft: { kind: "prev" },
  PageUp: { kind: "prev" },
  BracketRight: { kind: "next" },
  PageDown: { kind: "next" },
  KeyH: { kind: "hint" },
  ...Object.fromEntries(DIGITS.map(value => [`Digit${value}`, { kind: "value", value }])),
  ...Object.fromEntries(DIGITS.map(value => [`Numpad${value}`, { kind: "value", value }])),
}

// A key whose action nothing on top uses means this instead: Backspace erases, and where nothing erases it goes back.
const FALLBACK: Record<string, InputAction> = { Backspace: { kind: "back" } }

type Key = Pick<KeyboardEvent, "code" | "key" | "ctrlKey" | "metaKey" | "altKey">

/**
 * The action a key press means. A press with Ctrl, Cmd or Alt belongs to the browser, except Ctrl/Cmd+Z, which
 * is undo. A key without a `code` (some on-screen keyboards send none) is read by its `key` name.
 */
export const keyAction = (event: Key): InputAction | undefined => {
  const code = event.code || event.key
  if (event.altKey) return undefined
  if (event.ctrlKey || event.metaKey) return code === "KeyZ" ? KEYS.KeyZ : undefined
  return KEYS[code]
}

/** What a key means when nothing on top used its action. */
export const keyFallback = (event: Key): InputAction | undefined => FALLBACK[event.code || event.key]
