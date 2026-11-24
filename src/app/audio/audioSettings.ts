import { useEffect } from "react"
import { useGameStorage } from "@/support/useGameStorage"
import { audio, resumeAudioOnGesture } from "./audio"
import type { AudioService } from "./audioService"

// A missing key means the default, for new and existing players alike.
export const SOUND_EFFECTS_KEY = "soundEffects" // default true
export const MUSIC_KEY = "music" // default false

export const useSoundEffectsSetting = () => useGameStorage<boolean>(SOUND_EFFECTS_KEY, true)
export const useMusicSetting = () => useGameStorage<boolean>(MUSIC_KEY, false)

/** The music track's url; with none, there is no music to switch on. */
export const MUSIC_TRACK_URL: string | undefined = undefined

/** Mounted once: hands the stored switches to the service and lets a tap start its audio. */
export const useAudioSettings = (service: AudioService = audio): void => {
  const [effects] = useSoundEffectsSetting()
  const [music] = useMusicSetting()

  useEffect(() => service.setEffects(effects), [service, effects])
  useEffect(() => service.setMusic(music), [service, music])
  useEffect(() => resumeAudioOnGesture(window, service), [service])
}
