import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PORTRAITS, portraitFor, POSES } from "./portraits"
import { STORY_POSES, storyExpression } from "./storyPoses"
import type { Speaker } from "./arrivalConversation"

const locale = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join("public/locales", name, "fez.json"), "utf8"))

const hasKey = (doc: Record<string, unknown>, key: string): boolean =>
  typeof key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], doc) === "string"

const speakerOf = (key: string) => key.split(".").at(-1) as Speaker

describe("story poses", () => {
  it.each(["en", "nl"])("names only lines that exist in %s", name => {
    const doc = locale(name)
    expect(Object.keys(STORY_POSES).filter(key => !hasKey(doc, key))).toEqual([])
  })

  it("uses only poses the renderer knows", () => {
    expect(
      Object.keys(STORY_POSES)
        .map(key => storyExpression(key).pose)
        .filter(pose => !POSES.includes(pose))
    ).toEqual([])
  })

  it("names a pose only for a speaker who has it painted", () => {
    expect(Object.keys(STORY_POSES).filter(key => !PORTRAITS[speakerOf(key)]?.[storyExpression(key).pose])).toEqual([])
  })

  it("puts a face only on a line whose speaker has it painted for that pose", () => {
    const undrawn = Object.keys(STORY_POSES).filter(key => {
      const { pose, face } = storyExpression(key)
      return face !== undefined && portraitFor(speakerOf(key), pose, face)?.face === undefined
    })
    expect(undrawn).toEqual([])
  })

  it("leaves a line it does not name at its speaker's default, with no face", () => {
    expect(storyExpression("nowhere.1.fez")).toEqual({ pose: "default" })
  })
})
