import "./registerCoreSounds"
import { type AudioContextLike, type AudioService, createAudioService } from "./audioService"
import { MUSIC_TRACK_URL } from "./musicTrack"
import type { SoundOptions } from "./soundRegistry"

type AudioContextConstructor = new () => AudioContext

const defaultContext = (): AudioContextLike | undefined => {
  const scope = globalThis as typeof globalThis & { webkitAudioContext?: AudioContextConstructor }
  const Context: AudioContextConstructor | undefined = scope.AudioContext ?? scope.webkitAudioContext
  return Context ? new Context() : undefined
}

// Fetching the track once puts the whole file in the service worker's music cache, so it plays offline after.
const warmCache = (url: string) => void fetch(url).catch(() => {})

const onPageHidden = (callback: (hidden: boolean) => void) => {
  if (typeof document === "undefined") return () => {}
  const onChange = () => callback(document.visibilityState === "hidden")
  document.addEventListener("visibilitychange", onChange)
  return () => document.removeEventListener("visibilitychange", onChange)
}

export const audio: AudioService = createAudioService({
  createContext: defaultContext,
  ...(MUSIC_TRACK_URL ? { music: { url: MUSIC_TRACK_URL, createElement: url => new Audio(url), warmCache } } : {}),
  onHidden: onPageHidden,
})

export const playSound = (name: string, options?: SoundOptions): void => audio.play(name, options)

/** Loops `name` until the returned stop is called. */
export const loopSound = (name: string): (() => void) => audio.loop(name)

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
