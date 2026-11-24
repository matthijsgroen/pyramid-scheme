// A sound is a recorded sample, registered by name; the audio service fetches and plays it. Core and mods
// register by name, and a name nobody registered stays silent, so a mod that is off is silent too.
export type SoundSample = { url: string; gain?: number; playbackRate?: number }
export type SoundOptions = { playbackRate?: number; delay?: number } // delay in seconds after now

const sounds = new Map<string, SoundSample>()

// By name: registering a name again replaces the earlier sound.
export const registerSound = (name: string, sample: SoundSample): void => {
  sounds.set(name, sample)
}

export const soundNamed = (name: string): SoundSample | undefined => sounds.get(name)

/** Whether any sound is registered: with none, the game has nothing to switch off. */
export const hasSounds = (): boolean => sounds.size > 0
