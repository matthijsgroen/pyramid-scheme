import type { AudioContextLike } from "./audioService"

// A Web Audio context that renders nothing and records what was asked of it. It starts suspended, as a
// browser's does before the first gesture.
export const fakeAudioContext = () => {
  const oscillators: { frequency: number; startAt: number }[] = []
  let state: AudioContextState = "suspended"
  let resumes = 0

  const param = (onSet: (value: number) => void = () => undefined) => ({
    value: 0,
    setValueAtTime(value: number) {
      onSet(value)
      return this
    },
    linearRampToValueAtTime() {
      return this
    },
    exponentialRampToValueAtTime() {
      return this
    },
  })

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
    createGain: () => ({ ...node(), gain: param() }),
    createOscillator: () => {
      const recorded = { frequency: 0 }
      const frequency = param(value => {
        recorded.frequency = value
      })
      return {
        ...node(),
        type: "sine",
        frequency,
        start: (startAt: number) => oscillators.push({ frequency: recorded.frequency, startAt }),
        stop: () => undefined,
      }
    },
  } as unknown as AudioContextLike

  return {
    context,
    oscillators,
    get resumes() {
      return resumes
    },
    setState: (s: AudioContextState) => {
      state = s
    },
  }
}
