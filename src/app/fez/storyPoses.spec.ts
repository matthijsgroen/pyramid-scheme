import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { POSES } from "./portraits"
import { STORY_POSES, storyExpression } from "./storyPoses"

const locale = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join("public/locales", name, "fez.json"), "utf8"))

const hasKey = (doc: Record<string, unknown>, key: string): boolean =>
  typeof key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], doc) === "string"

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

  it("leaves a line it does not name at its speaker's default, with no face", () => {
    expect(storyExpression("nowhere.1.fez")).toEqual({ pose: "default" })
  })
})
