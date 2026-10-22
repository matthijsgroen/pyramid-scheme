import type { Face, Pose } from "./portraits"

/**
 * The expression a story line is drawn with, by its locale key — speaker included, so a line that
 * changes hands drops out of the locales and the spec says so. A line not named here is its speaker's
 * `default`. Kept out of the translations because a face is the same in every language.
 *
 * A line may also wear a face over its pose — `{ face: "worried" }` on the default pose, or
 * `{ pose: "pointUp", face: "worried" }` — drawn as a layer on the figure (`portraitFor`).
 *
 * The scripts mark the same lines in their speaker prefix: `> **Fez (pointUp):** …`,
 * `> **Fez (pointUp, worried):** …` (FORMAT.md).
 */
export const STORY_POSES: Readonly<Record<string, Pose | { pose?: Pose; face: Face }>> = {
  // Act I
  "arrival.starter_1.1.explorer": "pointUp",
  "arrival.starter_1.4.explorer": "pointUp",
  "meeting.starter_1.14.fez": "pointUp",
  "meeting.starter_1.16.fez": "pointUp",
  "arrival.starter_2.1.fez": "pointUp",
  "arrival.starter_2.4.fez": "pointUp",
  "arrival.starter_2.5.fez": "pointUp",
  "arrival.starter_3.1.fez": "pointUp",
  "arrival.starter_3.5.fez": "pointUp",
  "arrival.starter_4.1.fez": "pointUp",
  "arrival.starter_4.3.fez": "pointUp",
  "tomb.starter.12.fez": "pointUp",
  "tomb.starter.16.fez": "pointUp",
  "tomb.starter.2.fez": { face: "surprised" },
  "meeting.starter_1.8.fez": { face: "sheepish" },
  "meeting.starter_1.10.fez": { face: "wistful" },
  "meeting.starter_1.12.fez": { face: "sheepish" },
  "meeting.starter_1.2.explorer": { face: "surprised" },
  "meeting.starter_1.4.explorer": { face: "surprised" },
  "meeting.starter_1.15.explorer": { face: "surprised" },
  "tomb.starter.14.fez": { face: "sheepish" },
  "bond.starter.1.fez": { face: "surprised" },
  "bond.starter.3.fez": { face: "sheepish" },
  // Act II
  "arrival.junior_2.1.fez": "pointUp",
  "arrival.junior_2.2.fez": "pointUp",
  "arrival.junior_4.1.fez": "pointUp",
  "reading.junior.1.explorer": "pointUp",
  "arrival.junior_3.3.fez": { face: "sheepish" },
  // Act III
  "arrival.expert_2.1.fez": "pointUp",
  "arrival.expert_3.1.fez": "pointUp",
  "arrival.expert_4.2.fez": "pointUp",
  "tomb.expertB.3.fez": "pointUp",
  "arrival.expert_3.4.fez": { face: "worried" },
  "bond.expert.1.fez": { face: "worried" },
  "bond.expert.3.fez": { face: "worried" },
  "tomb.expert.13.fez": { face: "sheepish" },
  "tomb.expert.15.fez": { face: "sheepish" },
  "tomb.expertB.1.fez": { face: "surprised" },
  // Act IV
  "arrival.master_1.3.fez": "pointUp",
  "arrival.master_2.4.fez": "pointUp",
  "arrival.master_4.1.fez": "pointUp",
  "arrival.master_3.1.fez": { face: "worried" },
  "arrival.master_3.4.fez": { face: "worried" },
  "arrival.master_3.6.fez": { face: "worried" },
  "bond.master.1.fez": { face: "worried" },
  "reading.master.4.fez": { face: "sheepish" },
  // Act V
  "arrival.wizard_2.1.fez": "pointUp",
  "arrival.wizard_3.5.fez": "pointUp",
  "tomb.wizardC.1.fez": "pointUp",
  "arrival.wizard_1.4.fez": { face: "worried" },
  "tomb.wizardB.1.fez": { face: "worried" },
  "arrival.wizard_2.5.fez": { face: "wistful" },
  "arrival.wizard_2.6.fez": { face: "wistful" },
  "arrival.wizard_2.8.fez": { face: "wistful" },
  "arrival.wizard_3.3.fez": { face: "surprised" },
  "arrival.wizard_3.4.fez": { face: "surprised" },
  "arrival.wizard_4.3.fez": { face: "wistful" },
  "tomb.wizardB.3.fez": { face: "wistful" },
  "tomb.wizardB.8.fez": { face: "wistful" },
  "tomb.wizardC.3.fez": { face: "wistful" },
  "reading.sphinx.7.fez": { face: "surprised" },
  "reading.sphinx.8.fez": { face: "surprised" },
  "reading.sphinx.10.fez": { face: "surprised" },
  "reading.sphinx.11.fez": { face: "wistful" },
  "reading.sphinx.12.fez": { face: "wistful" },
  "reading.sphinx.13.fez": { face: "wistful" },
  "bond.wizard.2.fez": { face: "wistful" },
  "bond.wizard.3.fez": { face: "wistful" },
  "end.1.fez": { face: "wistful" },
}

/** The pose a line is drawn in and the face over it, if any. */
export const storyExpression = (key: string): { pose: Pose; face?: Face } => {
  const named = STORY_POSES[key] ?? "default"
  return typeof named === "string" ? { pose: named } : { pose: named.pose ?? "default", face: named.face }
}
