import { useEffect } from "react"
import { audio } from "./audio"
import { DUCK_FADE_S, type AudioService } from "./audioService"

/** Holds the music down while `active`, fading it out over `fadeS`: a board or a trap is thinking time. */
export const useDuckMusic = (active: boolean, fadeS = DUCK_FADE_S, service: AudioService = audio): void => {
  useEffect(() => (active ? service.duck(fadeS) : undefined), [active, fadeS, service])
}
