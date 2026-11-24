import { useEffect } from "react"
import { audio } from "./audio"
import type { AudioService } from "./audioService"

/** Holds the music down while `active`: an encounter or a board is thinking time. */
export const useDuckMusic = (active: boolean, service: AudioService = audio): void => {
  useEffect(() => (active ? service.duck() : undefined), [active, service])
}
