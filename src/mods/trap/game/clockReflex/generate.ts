import type { Difficulty } from "@/data/difficultyLevels"
import { handsSwapped, MINUTES_ON_FACE, MINUTES_PER_HOUR, type Minutes } from "@/game/clock/clockFace"
import { mulberry32, shuffle } from "@/game/random"

export type ClockQuestion = {
  /** The time the face shows. */
  time: Minutes
  answer: Minutes
  /** Four readings, shuffled; one of them is the time on the face. */
  choices: Minutes[]
}

/** How fine the minute hand is read at each tier — half hours first, single minutes only at the top. */
const MINUTE_STEP: Record<Difficulty, number> = {
  starter: 30,
  junior: 15,
  expert: 5,
  master: 5,
  wizard: 1,
}

const onFace = (time: Minutes) => ((time % MINUTES_ON_FACE) + MINUTES_ON_FACE) % MINUTES_ON_FACE

/**
 * The wrong readings worth offering: each is a mistake someone actually makes, in the order they are worth
 * making the player rule out.
 *
 * A distractor that nobody would pick costs the trap its whole point — the player recognises the shape of
 * the answer instead of reading the hands.
 */
const misreadings = (time: Minutes, step: number): (Minutes | undefined)[] => [
  // Hour hand and minute hand read the wrong way round: 3:45 as 9:15.
  handsSwapped(time),
  // The hour hand read as the numeral it is approaching rather than the one it has passed: 9:50 as 10:50.
  time + MINUTES_PER_HOUR,
  time - MINUTES_PER_HOUR,
  // The minute hand counted one graduation out.
  time + step,
  time - step,
  // Minutes counted backwards round the face: :20 as :40.
  time - (time % MINUTES_PER_HOUR) + (MINUTES_PER_HOUR - (time % MINUTES_PER_HOUR)),
]

export const generate = (seed: number, difficulty: Difficulty): ClockQuestion => {
  const random = mulberry32(seed)
  const step = MINUTE_STEP[difficulty]
  const time = Math.floor(random() * (MINUTES_ON_FACE / step)) * step
  const choices = [time]
  // The swap goes in first when the face has one: it is the misreading the trap is really asking about, and
  // leaving it to chance means most boards never offer it.
  const [swap, ...rest] = misreadings(time, step)
  for (const misreading of [swap, ...shuffle(rest, random)]) {
    if (choices.length === 4) break
    if (misreading === undefined) continue
    const choice = onFace(misreading)
    // A wrong reading off the tier's grid rules itself out — on a board of half hours, 6:40 is not a
    // misreading anyone has to think about.
    if (choice % step !== 0 || choices.includes(choice)) continue
    choices.push(choice)
  }
  return { time, answer: time, choices: shuffle(choices, random) }
}
