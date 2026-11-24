import { hasSounds, type SoundOptions, type SoundSample, soundNamed } from "./soundRegistry"

export type AudioContextLike = Pick<
  AudioContext,
  "currentTime" | "state" | "resume" | "createBufferSource" | "createGain" | "decodeAudioData" | "destination"
>

export type AudioService = {
  play: (name: string, options?: SoundOptions) => void
  unlock: () => void // call inside a user gesture
  setEffects: (on: boolean) => void
  setMusic: (on: boolean) => void
  duck: () => () => void // returns release
}

/** Every effect passes through one master gain, kept low so effects sit under the ambience. */
export const EFFECTS_GAIN = 0.35

const fetchBytes = async (url: string): Promise<ArrayBuffer> => (await fetch(url)).arrayBuffer()

export const createAudioService = ({
  createContext,
  lookup = soundNamed,
  load = fetchBytes,
  anySound = hasSounds,
}: {
  createContext: () => AudioContextLike | undefined
  lookup?: (name: string) => SoundSample | undefined
  load?: (url: string) => Promise<ArrayBuffer>
  /** Whether anything could play at all: with nothing registered, no context is ever made. */
  anySound?: () => boolean
}): AudioService => {
  let effects = true
  let music = false
  let created = false
  let context: AudioContextLike | undefined
  let master: GainNode | undefined
  const buffers = new Map<string, AudioBuffer>()
  const loading = new Set<string>()

  // A sample is fetched and decoded on its first play; that play, and any while it decodes, stay silent.
  const fetchSample = (ctx: AudioContextLike, url: string) => {
    loading.add(url)
    load(url)
      .then(bytes => ctx.decodeAudioData(bytes))
      .then(buffer => buffers.set(url, buffer))
      .catch(() => {})
      .finally(() => loading.delete(url))
  }

  return {
    unlock: () => {
      if (!created && (effects || music) && anySound()) {
        created = true
        try {
          context = createContext()
          if (context) {
            master = context.createGain()
            master.gain.value = EFFECTS_GAIN
            master.connect(context.destination)
          }
        } catch {
          context = undefined
        }
      }
      if (context && context.state !== "running") void context.resume().catch(() => {})
    },
    play: (name, options = {}) => {
      // A suspended or interrupted context would hold the sound and fire it late on resume.
      if (!context || !master || !effects || context.state !== "running") return
      const sample = lookup(name)
      if (!sample) return
      const buffer = buffers.get(sample.url)
      if (!buffer) {
        if (!loading.has(sample.url)) fetchSample(context, sample.url)
        return
      }
      const source = context.createBufferSource()
      source.buffer = buffer
      source.playbackRate.value = options.playbackRate ?? sample.playbackRate ?? 1
      const level = context.createGain()
      level.gain.value = sample.gain ?? 1
      source.connect(level)
      level.connect(master)
      source.start(context.currentTime + (options.delay ?? 0))
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
