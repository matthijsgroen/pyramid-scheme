/**
 * The journeys Fez has something of his own to say about, in arrival order.
 *
 * Declared here rather than discovered from the translations because a beat is a fact about the
 * script, not about the language in front of the player — an untranslated journey still has one.
 */
export const JOURNEYS_WITH_ARRIVAL: ReadonlySet<string> = new Set<string>([])

/** Whether a translation key has a line behind it. */
export type HasLine = (key: string) => boolean

const lineKey = (journeyId: string, line: number) => `arrival.${journeyId}.${line}`

/** The conversation Fez plays on arriving at a journey: its own, or the shared pyramid intro. */
export const arrivalConversationId = (journeyId: string): string =>
  JOURNEYS_WITH_ARRIVAL.has(journeyId) ? `arrival.${journeyId}` : "pyramidIntro"

/**
 * The lines of one journey's arrival, in order.
 *
 * Stops at the first gap instead of scanning past it: a beat missing its third line is an authoring
 * mistake, and swallowing it would hide the mistake and play the fourth line out of order.
 */
export const arrivalLineKeys = (journeyId: string, hasLine: HasLine): string[] => {
  const keys: string[] = []
  for (let line = 1; hasLine(lineKey(journeyId, line)); line++) keys.push(lineKey(journeyId, line))
  return keys
}
