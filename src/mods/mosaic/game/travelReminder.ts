/** Every this many returns to the travel screen with pieces still in hand, Fez mentions them. */
export const REMIND_EVERY_RETURNS = 3

/** A handful of loose pieces is not worth a word: Fez speaks up once this many wait to be set in. */
export const REMIND_FROM_PIECES = 5

/**
 * One return to the travel screen: the count to store, and whether Fez reminds the player now.
 *
 * Only returns holding at least `REMIND_FROM_PIECES` pieces count, and fewer starts the count over. A reminder that
 * falls due while Fez cannot speak — someone else is talking, he has not been met, tutorials are off —
 * waits, so it comes on the first return he can give it.
 */
export const travelReturn = ({
  unplaced,
  returns,
  canSpeak,
}: {
  unplaced: number
  returns: number
  canSpeak: boolean
}): { returns: number; remind: boolean } => {
  if (unplaced < REMIND_FROM_PIECES) return { returns: 0, remind: false }
  const counted = Math.min(returns + 1, REMIND_EVERY_RETURNS)
  if (counted < REMIND_EVERY_RETURNS || !canSpeak) return { returns: counted, remind: false }
  return { returns: 0, remind: true }
}
