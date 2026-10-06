/** Everyone who can hold a line. The dead speak in the tombs; the living carry everywhere else. */
export type Speaker = "fez" | "explorer" | "ipi" | "henut" | "priest" | "pharaoh"

/** The dead. Drawn faded, and they never appear outside a tomb. */
export const GHOSTS: readonly Speaker[] = ["ipi", "henut", "priest", "pharaoh"]

/** One line of a conversation: who says it, and where its text lives. */
export type SpokenLine = { speaker: Speaker; key: string }

/**
 * The journeys Fez and the explorer have something of their own to say about.
 *
 * Declared here rather than discovered from the translations because a beat is a fact about the
 * script, not about the language in front of the player — an untranslated journey still has one.
 */
export const JOURNEYS_WITH_ARRIVAL: ReadonlySet<string> = new Set<string>([
  "starter_1",
  "starter_2",
  "starter_3",
  "starter_4",
  "junior_1",
  "junior_2",
  "junior_3",
  "junior_4",
  "expert_1",
  "expert_2",
  "expert_3",
  "expert_4",
  "master_1",
  "master_2",
  "master_3",
  "master_4",
  "wizard_1",
  "wizard_2",
  "wizard_3",
  "wizard_4",
])

/** Whether a translation key has a line behind it. */
export type HasLine = (key: string) => boolean

const SPEAKERS: readonly Speaker[] = ["fez", "explorer", ...GHOSTS]

/** The conversation played on arriving at a journey: its own, or the shared pyramid intro. */
export const arrivalConversationId = (journeyId: string): string =>
  JOURNEYS_WITH_ARRIVAL.has(journeyId) ? `arrival.${journeyId}` : "pyramidIntro"

/**
 * A scene read straight out of the translations, in order: `<conversation>.<n>.<speaker>`.
 *
 * Who speaks is the last segment of the key, so a scene carries its own staging and needs no second
 * table to stay in step with it. Any conversation id works — `arrival.starter_1`, `tomb.starter` —
 * which is what lets a beat cost keys rather than code.
 *
 * Stops at the first gap instead of scanning past it: a beat missing its third line is an authoring
 * mistake, and swallowing it would hide the mistake and play the fourth line out of order.
 */
export const spokenLines = (conversation: string, hasLine: HasLine): SpokenLine[] => {
  const lines: SpokenLine[] = []
  for (let line = 1; ; line++) {
    const spoken = SPEAKERS.map(speaker => ({
      speaker,
      key: `${conversation}.${line}.${speaker}`,
    })).find(candidate => hasLine(candidate.key))
    if (!spoken) return lines
    lines.push(spoken)
  }
}
