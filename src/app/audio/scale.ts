// D Hijaz from D4: the flat second and raised third give the sequence tiles their colour. A sample recorded
// on D4 plays step 0 at its own rate.
const HIJAZ = [0, 1, 4, 5, 7, 8, 10] as const

export const scaleSemitones = (step: number): number => {
  const octave = Math.floor(step / HIJAZ.length)
  return octave * 12 + HIJAZ[step - octave * HIJAZ.length]
}

/** The playback rate that pitches a D4 sample to the scale's `step`. */
export const scaleRate = (step: number): number => 2 ** (scaleSemitones(step) / 12)
