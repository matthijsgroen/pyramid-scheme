import { useCallback, useEffect, useRef } from "react"

export const useTimeout = (): [(delay: number, cb: () => void) => void, () => void] => {
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancel = useCallback(() => {
    if (ref.current) {
      clearTimeout(ref.current)
      ref.current = null
    }
  }, [])
  const schedule = useCallback(
    (delay: number, cb: () => void) => {
      cancel()
      ref.current = setTimeout(cb, delay)
    },
    [cancel]
  )
  useEffect(() => cancel, [cancel])
  return [schedule, cancel]
}
