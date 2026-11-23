// A sound is a pure function from options to tones; the audio service renders them. Core and mods
// register by name, and a name nobody registered stays silent, so a mod that is off is silent too.
export type Tone = { frequency: number; start: number; duration: number; gain?: number; wave?: OscillatorType }
export type SoundOptions = { note?: number; delay?: number } // delay in seconds after now
export type SoundDef = (options: SoundOptions) => readonly Tone[]

const sounds = new Map<string, SoundDef>()

// By name: registering a name again replaces the earlier sound.
export const registerSound = (name: string, def: SoundDef): void => {
  sounds.set(name, def)
}

export const soundNamed = (name: string): SoundDef | undefined => sounds.get(name)
