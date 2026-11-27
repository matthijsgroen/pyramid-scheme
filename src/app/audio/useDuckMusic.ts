import { createContext, use, useEffect } from "react"
import { audio } from "./audio"
import type { AudioService } from "./audioService"

/** Holds the music down while `active`: an encounter or a board is thinking time. */
export const useDuckMusic = (active: boolean, service: AudioService = audio): void => {
  useEffect(() => (active ? service.duck() : undefined), [active, service])
}

/** Lets the music back in before the encounter that holds it down closes. Outside an encounter it does nothing. */
export const MusicReturnsContext = createContext<() => void>(() => {})

/** Lets the music back in once `done`: a solved board showing its time is no longer thinking time. */
export const useMusicReturns = (done: boolean): void => {
  const musicReturns = use(MusicReturnsContext)
  useEffect(() => {
    if (done) musicReturns()
  }, [done, musicReturns])
}
