import { hasSounds, type SoundOptions, type SoundSample, soundNamed } from "./soundRegistry"

export type AudioContextLike = Pick<
  AudioContext,
  | "currentTime"
  | "state"
  | "resume"
  | "createBufferSource"
  | "createGain"
  | "createMediaElementSource"
  | "decodeAudioData"
  | "destination"
>

export type MediaElementLike = Pick<HTMLAudioElement, "play" | "pause" | "paused" | "loop" | "src" | "preload">

export type AudioService = {
  play: (name: string, options?: SoundOptions) => void
  unlock: () => void // call inside a user gesture
  setEffects: (on: boolean) => void
  setMusic: (on: boolean) => void
  duck: () => () => void // returns release
}

/** Every effect passes through one master gain, kept low so effects sit under the ambience. */
export const EFFECTS_GAIN = 0.35
/** The music plays low: loud audio is intrusive. */
export const MUSIC_GAIN = 0.4
/** While an encounter is open the music drops to this share of its level, calm rather than gone. */
export const DUCK_LEVEL = 0.3
export const DUCK_FADE_S = 0.6

const fetchBytes = async (url: string): Promise<ArrayBuffer> => (await fetch(url)).arrayBuffer()

export const createAudioService = ({
  createContext,
  lookup = soundNamed,
  load = fetchBytes,
  anySound = hasSounds,
  music: track,
  onHidden,
}: {
  createContext: () => AudioContextLike | undefined
  lookup?: (name: string) => SoundSample | undefined
  load?: (url: string) => Promise<ArrayBuffer>
  /** Whether any effect could play at all: with none registered, effects alone never make a context. */
  anySound?: () => boolean
  music?: { url: string; createElement: (url: string) => MediaElementLike; warmCache?: (url: string) => void }
  /** Tells the service when the page is hidden or shown; returns its cleanup. */
  onHidden?: (callback: (hidden: boolean) => void) => () => void
}): AudioService => {
  let effects = true
  let music = false
  let tapped = false
  let created = false
  let hidden = false
  let ducks = 0
  let context: AudioContextLike | undefined
  let master: GainNode | undefined
  let element: MediaElementLike | undefined
  let musicGain: GainNode | undefined
  let warmed = false
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

  const ensureContext = () => {
    const wanted = (effects && anySound()) || (music && track !== undefined)
    if (created || !tapped || !wanted) return
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

  const musicLevel = () => MUSIC_GAIN * (ducks > 0 ? DUCK_LEVEL : 1)

  // The element is made the first time music plays, never before: a player who keeps Music off downloads nothing.
  const musicElement = (ctx: AudioContextLike, { url, createElement, warmCache }: NonNullable<typeof track>) => {
    if (element) return element
    element = createElement(url)
    element.loop = true
    element.preload = "auto"
    musicGain = ctx.createGain()
    musicGain.gain.value = musicLevel()
    ctx.createMediaElementSource(element as HTMLMediaElement).connect(musicGain)
    musicGain.connect(ctx.destination)
    if (!warmed) {
      warmed = true
      warmCache?.(url)
    }
    return element
  }

  const syncMusic = () => {
    if (!context || !track) return
    if (music && !hidden) {
      const playing = musicElement(context, track)
      if (playing.paused) void playing.play().catch(() => {})
    } else if (element && !element.paused) element.pause()
  }

  const rampMusic = () => {
    if (!context || !musicGain) return
    const now = context.currentTime
    musicGain.gain.cancelScheduledValues(now)
    musicGain.gain.setValueAtTime(musicGain.gain.value, now)
    musicGain.gain.linearRampToValueAtTime(musicLevel(), now + DUCK_FADE_S)
  }

  onHidden?.(isHidden => {
    hidden = isHidden
    syncMusic()
  })

  return {
    unlock: () => {
      tapped = true
      ensureContext()
      if (context && context.state !== "running") void context.resume().catch(() => {})
      syncMusic()
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
    // Switched on in Settings, which is itself a tap, so the context can start here once a tap has happened.
    setMusic: on => {
      music = on
      ensureContext()
      if (context && music && context.state !== "running") void context.resume().catch(() => {})
      syncMusic()
    },
    duck: () => {
      ducks += 1
      rampMusic()
      let released = false
      return () => {
        if (released) return
        released = true
        ducks -= 1
        rampMusic()
      }
    },
  }
}
