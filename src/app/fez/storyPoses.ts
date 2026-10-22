import type { Pose } from "./portraits"

/**
 * The expression a story line is drawn with, by its locale key — speaker included, so a line that
 * changes hands drops out of the locales and the spec says so. A line not named here is its speaker's
 * `default`. Kept out of the translations because a face is the same in every language.
 *
 * The scripts mark the same lines in their speaker prefix: `> **Fez (pointUp):** …` (FORMAT.md).
 */
export const STORY_POSES: Readonly<Record<string, Pose>> = {
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
  // Act II
  "arrival.junior_2.1.fez": "pointUp",
  "arrival.junior_2.2.fez": "pointUp",
  "arrival.junior_4.1.fez": "pointUp",
  "reading.junior.1.explorer": "pointUp",
  // Act III
  "arrival.expert_2.1.fez": "pointUp",
  "arrival.expert_3.1.fez": "pointUp",
  "arrival.expert_4.2.fez": "pointUp",
  "tomb.expertB.3.fez": "pointUp",
  // Act IV
  "arrival.master_1.3.fez": "pointUp",
  "arrival.master_2.4.fez": "pointUp",
  "arrival.master_4.1.fez": "pointUp",
  // Act V
  "arrival.wizard_2.1.fez": "pointUp",
  "arrival.wizard_3.5.fez": "pointUp",
  "tomb.wizardC.1.fez": "pointUp",
}

export const storyPose = (key: string): Pose => STORY_POSES[key] ?? "default"
