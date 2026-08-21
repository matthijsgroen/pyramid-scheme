/**
 * Clock time and the geometry of a twelve-hour face — shared by every family that reads a clock, so the
 * hands, the graduations and the digital readout can never disagree about what a time looks like.
 */

export const MINUTES_PER_HOUR = 60
export const HOURS_ON_FACE = 12
/** A full turn of the hour hand. Times are taken modulo this: the face carries no morning/afternoon. */
export const MINUTES_ON_FACE = HOURS_ON_FACE * MINUTES_PER_HOUR

/** A time of day, in minutes. */
export type Minutes = number

const wrap = (value: number, span: number) => ((value % span) + span) % span

/** Bearing of the hour hand, in degrees clockwise from the 12 — it creeps between the numerals, as a real one does. */
export const hourHandBearing = (time: Minutes) => (wrap(time, MINUTES_ON_FACE) / MINUTES_ON_FACE) * 360

export const minuteHandBearing = (time: Minutes) => (wrap(time, MINUTES_PER_HOUR) / MINUTES_PER_HOUR) * 360

/** A point on the face for a bearing and a radius, in SVG coordinates (y grows downward). */
export const facePoint = (bearing: number, radius: number): [number, number] => {
  const radians = (bearing * Math.PI) / 180
  return [radius * Math.sin(radians), -radius * Math.cos(radians)]
}

/** The bearing of an offset from the centre of the face, in the same clockwise-from-12 degrees. */
export const bearingOf = (dx: number, dy: number) => wrap((Math.atan2(dx, -dy) * 180) / Math.PI, 360)

/** The digital reading of a time: a twelve-hour clock, so noon and midnight both read 12:00. */
export const digitalTime = (time: Minutes) => {
  const minutes = wrap(time, MINUTES_ON_FACE)
  const hour = Math.floor(minutes / MINUTES_PER_HOUR)
  return `${hour === 0 ? HOURS_ON_FACE : hour}:${String(minutes % MINUTES_PER_HOUR).padStart(2, "0")}`
}

/**
 * The time you get by reading the two hands the wrong way round — 3:45 read as 9:15.
 *
 * The commonest mistake a child makes on an analog face, which makes it the sharpest distractor a board can
 * carry. Undefined when the minute hand is not on a numeral, since then there is no hour to mistake it for.
 */
export const handsSwapped = (time: Minutes): Minutes | undefined => {
  const minutes = wrap(time, MINUTES_ON_FACE)
  const minute = minutes % MINUTES_PER_HOUR
  if (minute % 5 !== 0) return undefined
  const hour = Math.floor(minutes / MINUTES_PER_HOUR)
  return wrap((minute / 5) * MINUTES_PER_HOUR + hour * 5, MINUTES_ON_FACE)
}
