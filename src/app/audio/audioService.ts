import { type SoundDef, type SoundOptions, soundNamed, type Tone } from "./soundRegistry"

export type AudioContextLike = Pick<
  AudioContext,
  "currentTime" | "state" | "resume" | "createOscillator" | "createGain" | "destination"
>

export type AudioService = {
  play: (name: string, options?: SoundOptions) => void
  unlock: () => void // call inside a user gesture
  setEffects: (on: boolean) => void
  setMusic: (on: boolean) => void
  duck: () => () => void // returns release
}

const ATTACK = 0.01
const RELEASE = 0.08
const DEFAULT_GAIN = 0.2

export const createAudioService = ({
  createContext,
  lookup = soundNamed,
}: {
  createContext: () => AudioContextLike | undefined
  lookup?: (name: string) => SoundDef | undefined
}): AudioService => {
  let effects = true
  let music = false
  let created = false
  let context: AudioContextLike | undefined

  const renderTone = (ctx: AudioContextLike, tone: Tone, at: number) => {
    const startAt = at + tone.start
    const peak = tone.gain ?? DEFAULT_GAIN
    const oscillator = ctx.createOscillator()
    oscillator.type = tone.wave ?? "sine"
    oscillator.frequency.setValueAtTime(tone.frequency, startAt)
    // A short attack and release on its own gain node, so a tone neither clicks in nor out.
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0, startAt)
    envelope.gain.linearRampToValueAtTime(peak, startAt + ATTACK)
    envelope.gain.setValueAtTime(peak, startAt + Math.max(ATTACK, tone.duration - RELEASE))
    envelope.gain.linearRampToValueAtTime(0, startAt + tone.duration)
    oscillator.connect(envelope)
    envelope.connect(ctx.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + tone.duration + 0.01)
  }

  return {
    unlock: () => {
      if (!created && (effects || music)) {
        created = true
        try {
          context = createContext()
        } catch {
          context = undefined
        }
      }
      if (context && context.state !== "running") void context.resume().catch(() => {})
    },
    play: (name, options = {}) => {
      if (!context || !effects) return
      const def = lookup(name)
      if (!def) return
      const at = context.currentTime + (options.delay ?? 0)
      for (const tone of def(options)) renderTone(context, tone, at)
    },
    setEffects: on => {
      effects = on
    },
    setMusic: on => {
      music = on
    },
    duck: () => () => {},
  }
}
