import type { SoundDef, Tone } from "./soundRegistry"

// D Hijaz from D4: the flat second and raised third give the game's musical sounds their colour.
const ROOT = 293.66
const HIJAZ = [0, 1, 4, 5, 7, 8, 10] as const

export const scaleFrequency = (step: number): number => {
  const octave = Math.floor(step / HIJAZ.length)
  const degree = step - octave * HIJAZ.length
  return ROOT * 2 ** ((octave * 12 + HIJAZ[degree]) / 12)
}

// Two detuned notes between the scale's degrees, low and dull, so a wrong step sounds off rather than sad.
const OFF = ROOT * 2 ** (-6 / 12)
export const WRONG_TONE: SoundDef = () => [
  { frequency: OFF, start: 0, duration: 0.22, gain: 0.14, wave: "triangle" },
  { frequency: OFF * 1.03, start: 0, duration: 0.22, gain: 0.1, wave: "triangle" },
]

const note = (step: number, start: number, duration: number, gain = 0.18): Tone => ({
  frequency: scaleFrequency(step),
  start,
  duration,
  gain,
  wave: "triangle",
})

/** Scale steps played in turn; the last one rings a little longer. */
export const motif =
  (steps: readonly number[], spacing = 0.11): SoundDef =>
  () =>
    steps.map((step, i) => note(step, i * spacing, i === steps.length - 1 ? spacing * 4 : spacing * 1.6))

const chord = (steps: readonly number[], start: number, duration: number): Tone[] =>
  steps.map(step => note(step, start, duration, 0.1))

export const SOLVED: SoundDef = () => [...motif([0, 2, 4])({}), ...chord([0, 4, 7], 0.33, 0.6)]

export const LEVEL_COMPLETE: SoundDef = motif([0, 2, 4, 7])

export const JOURNEY_COMPLETE: SoundDef = () => [
  ...motif([0, 2, 4, 5, 7, 9], 0.13)({}),
  ...chord([0, 4, 7, 14], 0.78, 1.4),
]

export const LOCK_SOLVED: SoundDef = () => [note(4, 0, 0.18), note(7, 0.09, 0.5)]
