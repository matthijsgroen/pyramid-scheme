import type { AudioContextLike } from "./audioService"

// A Web Audio context that renders nothing and records what was asked of it. It starts suspended, as a
// browser's does before the first gesture. A decoded buffer is the url's bytes' label, so a test can tell
// which sample a source played.
export const fakeAudioContext = () => {
  const sources: { buffer: string; playbackRate: number; gain: number; startAt: number }[] = []
  const masterGains: number[] = []
  // The gain the music element is routed into, once there is one: its level and every ramp target asked of it.
  const music: { gain?: { value: number; ramps: number[] } } = {}
  let state: AudioContextState = "suspended"
  let resumes = 0
  let decodes = 0

  const node = () => ({ connect: () => undefined, disconnect: () => undefined })

  const context = {
    currentTime: 0,
    get state() {
      return state
    },
    destination: node(),
    resume: async () => {
      resumes += 1
      state = "running"
    },
    decodeAudioData: async (bytes: ArrayBuffer) => {
      decodes += 1
      return new TextDecoder().decode(bytes)
    },
    createGain: () => {
      const gain = {
        value: 1,
        ramps: [] as number[],
        setValueAtTime(value: number) {
          gain.value = value
        },
        cancelScheduledValues() {},
        linearRampToValueAtTime(value: number) {
          gain.ramps.push(value)
          gain.value = value
        },
      }
      const made = {
        ...node(),
        gain,
        connect: (target: unknown) => {
          if (target === context.destination) masterGains.push(gain.value)
          return target
        },
      }
      return made
    },
    createMediaElementSource: () => ({
      ...node(),
      connect: (target: { gain: { value: number; ramps: number[] } }) => {
        music.gain = target.gain
        return target
      },
    }),
    createBufferSource: () => {
      let level = { gain: { value: 1 } }
      const source = {
        buffer: undefined as unknown,
        playbackRate: { value: 1 },
        connect: (target: { gain: { value: number } }) => {
          level = target
          return target
        },
        start: (startAt: number) =>
          sources.push({
            buffer: String(source.buffer),
            playbackRate: source.playbackRate.value,
            gain: level.gain.value,
            startAt,
          }),
      }
      return source
    },
  } as unknown as AudioContextLike & { destination: unknown }

  return {
    context: context as AudioContextLike,
    sources,
    masterGains,
    music,
    get resumes() {
      return resumes
    },
    get decodes() {
      return decodes
    },
    setState: (s: AudioContextState) => {
      state = s
    },
  }
}

/** A fetch that hands back a url's own name as its bytes, resolving only when the test says so. */
export const fakeLoader = () => {
  const pending: (() => void)[] = []
  const calls: string[] = []
  const load = (url: string) => {
    calls.push(url)
    return new Promise<ArrayBuffer>(resolve =>
      pending.push(() => resolve(new TextEncoder().encode(url).buffer as ArrayBuffer))
    )
  }
  return {
    load,
    calls,
    /** Resolves every fetch so far and lets the decodes settle. */
    settle: async () => {
      pending.splice(0).forEach(resolve => resolve())
      for (let i = 0; i < 5; i++) await Promise.resolve()
    },
  }
}

/** An audio element that plays nothing and counts what it was told. */
export const fakeMediaElement = (url: string) => {
  const element = {
    src: url,
    loop: false,
    preload: "" as HTMLMediaElement["preload"],
    paused: true,
    plays: 0,
    pauses: 0,
    play: async () => {
      element.plays += 1
      element.paused = false
    },
    pause: () => {
      element.pauses += 1
      element.paused = true
    },
  }
  return element
}
