import { type AudioContextLike, type AudioService, createAudioService } from "./audioService"
import type { SoundOptions } from "./soundRegistry"

type AudioContextConstructor = new () => AudioContext

const defaultContext = (): AudioContextLike | undefined => {
  const scope = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextConstructor }
  const Context: AudioContextConstructor | undefined = scope.AudioContext ?? scope.webkitAudioContext
  return Context ? new Context() : undefined
}

export const audio: AudioService = createAudioService({ createContext: defaultContext })

export const playSound = (name: string, options?: SoundOptions): void => audio.play(name, options)

const GESTURES = ["pointerdown", "keydown"] as const

// Browsers allow audio only after a user gesture, so every tap or key press offers the service a
// chance to start (or, after the system suspended it, resume) its context.
export const resumeAudioOnGesture = (target: EventTarget, service: AudioService = audio): (() => void) => {
  const onGesture = () => service.unlock()
  for (const type of GESTURES) target.addEventListener(type, onGesture, { capture: true })
  return () => {
    for (const type of GESTURES) target.removeEventListener(type, onGesture, { capture: true })
  }
}
