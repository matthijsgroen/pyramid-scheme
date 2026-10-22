import { describe, expect, it } from "vitest"
import type { Speaker } from "./arrivalConversation"
import { PORTRAITS, portraitFor, POSE_PARTS, type Face, type Pose } from "./portraits"
import { STORY_POSES, storyExpression } from "./storyPoses"
import { TUTORIAL_LINES } from "./tutorialLines"

const hasFace = (speaker: Speaker, face: Face) =>
  face === "default" ||
  PORTRAITS[speaker]?.faces?.[face] !== undefined ||
  Object.keys(PORTRAITS[speaker]?.paintings ?? {}).some(combination => combination.endsWith(`+${face}`))

/** Drawn in another pose base than the line names, or without a face the speaker has art for. */
const misdrawn = (speaker: Speaker, pose: Pose, face?: Face) => {
  const asked = { base: POSE_PARTS[pose].base, face: face ?? POSE_PARTS[pose].face }
  const drawn = portraitFor(speaker, pose, face)?.drawn
  return drawn?.base !== asked.base || (drawn.face !== asked.face && hasFace(speaker, asked.face))
}

describe("every portrait a line asks for", () => {
  it("is drawn in its pose and face for every story line", () => {
    const wrong = Object.keys(STORY_POSES).filter(key => {
      const { pose, face } = storyExpression(key)
      return misdrawn(key.split(".").at(-1) as Speaker, pose, face)
    })
    expect(wrong).toEqual([])
  })

  it("is drawn in its pose and face for every tutorial and shop line", () => {
    const wrong = Object.values(TUTORIAL_LINES)
      .flat()
      .filter(([pose, , speaker, face]) => misdrawn(speaker ?? "fez", pose, face))
      .map(([, key]) => key)
    expect(wrong).toEqual([])
  })

  it("is drawn for the shop screen, which shows Fez with his cocktail", () => {
    expect(misdrawn("fez", "cocktail")).toBe(false)
  })
})
