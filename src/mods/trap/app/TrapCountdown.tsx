import { useEffect, useRef, useState, type FC } from "react"

type Props = {
  /** Seconds on the clock; 0 means untimed, and then nothing is drawn and nothing fails. */
  timeLimit: number
  onExpire: () => void
}

/** The bar that runs out: every trap challenge is timed, and every one shows the time it has left. */
export const TrapCountdown: FC<Props> = ({ timeLimit, onExpire }) => {
  const [width, setWidth] = useState(100)
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (timeLimit <= 0) return
    const frame = requestAnimationFrame(() => setWidth(0))
    const timer = setTimeout(() => onExpireRef.current(), timeLimit * 1000)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [timeLimit])

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-700">
      <div
        className="h-full rounded-full bg-amber-400 transition-all ease-linear"
        style={{ width: `${width}%`, transitionDuration: `${timeLimit}s` }}
      />
    </div>
  )
}
