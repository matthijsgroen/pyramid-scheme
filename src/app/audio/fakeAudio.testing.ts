import type { AudioContextLike } from "./audioService"

// A Web Audio context that renders nothing and records what was asked of it. It starts suspended, as a
// browser's does before the first gesture. A decoded buffer is the url's bytes' label, so a test can tell
// which sample a source played.
export const fakeAudioContext = () => {
  const sources: { buffer: string; playbackRate: number; gain: number; startAt: number }[] = []
  const masterGains: number[] = []
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
      const gain = { value: 1 }
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
