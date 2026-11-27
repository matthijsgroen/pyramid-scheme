import { useEffect, useRef } from "react"
import { playSound } from "./audio"

/** Plays `name` each time `active` turns true; mounting already true plays nothing, so a reload stays quiet. */
export const usePlayOnRise = (active: boolean, name: string, play: (name: string) => void = playSound): void => {
  const was = useRef(active)
  useEffect(() => {
    const rose = active && !was.current
    was.current = active
    if (rose) play(name)
  }, [active, name, play])
}
