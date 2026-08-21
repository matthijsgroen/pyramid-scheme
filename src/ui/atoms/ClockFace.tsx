import type { FC } from "react"
import {
  digitalTime,
  facePoint,
  hourHandBearing,
  HOURS_ON_FACE,
  minuteHandBearing,
  type Minutes,
} from "@/game/clock/clockFace"

type Props = {
  time: Minutes
  className?: string
}

const Hand: FC<{ bearing: number; length: number; width: number; className: string }> = ({
  bearing,
  length,
  width,
  className,
}) => {
  const [x, y] = facePoint(bearing, length)
  // A hand overhangs the centre so it reads as one object pivoting, not two spokes meeting.
  const [tailX, tailY] = facePoint(bearing, -0.06)
  return <line x1={tailX} y1={tailY} x2={x} y2={y} strokeWidth={width} strokeLinecap="round" className={className} />
}

/**
 * An analog twelve-hour face. Every family that reads a clock draws this one, so a time can never look
 * different in two places.
 *
 * The numerals are on the dial because learning to read a clock is what these boards are for: a bare face
 * makes the player count marks instead, which is a different skill.
 */
export const ClockFace: FC<Props> = ({ time, className }) => (
  <svg viewBox="-1.15 -1.15 2.3 2.3" className={className} aria-hidden>
    <circle r={1.08} className="fill-stone-600" />
    <circle r={1} className="fill-stone-100" />
    {Array.from({ length: HOURS_ON_FACE * 5 }, (_unused, tick) => {
      const bearing = (tick / (HOURS_ON_FACE * 5)) * 360
      const onNumeral = tick % 5 === 0
      const [x1, y1] = facePoint(bearing, onNumeral ? 0.86 : 0.92)
      const [x2, y2] = facePoint(bearing, 0.97)
      return (
        <line
          key={tick}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          strokeWidth={onNumeral ? 0.035 : 0.014}
          className={onNumeral ? "stroke-stone-700" : "stroke-stone-400"}
        />
      )
    })}
    {Array.from({ length: HOURS_ON_FACE }, (_unused, index) => {
      const hour = index + 1
      const [x, y] = facePoint((hour / HOURS_ON_FACE) * 360, 0.72)
      return (
        <text
          key={hour}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={0.2}
          className="fill-stone-700 font-semibold"
        >
          {hour}
        </text>
      )
    })}
    <Hand bearing={hourHandBearing(time)} length={0.5} width={0.085} className="stroke-stone-900" />
    <Hand bearing={minuteHandBearing(time)} length={0.88} width={0.05} className="stroke-sky-700" />
    <circle r={0.055} className="fill-stone-900" />
  </svg>
)

/** The same time in digits, so a board can ask for the two readings to be matched up. */
export const DigitalTime: FC<{ time: Minutes; className?: string }> = ({ time, className }) => (
  <span className={className}>{digitalTime(time)}</span>
)
