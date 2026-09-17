import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * One place decides how tall a screen is: `--screen-height` in index.css, which adds the top safe
 * area back to `dvh` for an installed iOS copy. A box that measures the viewport itself instead
 * skips that correction and ends a status bar short of the bottom — a bug that has shipped twice.
 * Stories run in Storybook's own frame, where a viewport unit is the honest measure.
 */
const VIEWPORT_HEIGHT = /\b(?:max-h-|min-h-|h-)?(?:100)?(?:dvh|svh|lvh)\b|\bh-screen\b/

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (!/\.tsx?$/.test(entry.name) || entry.name.includes(".stories.")) return []
    return [path]
  })

describe("screen height", () => {
  it("is read from --screen-height, never measured off the viewport", () => {
    const offenders = sourceFiles("src")
      .filter(path => !path.endsWith("screenHeight.spec.ts"))
      .filter(path => VIEWPORT_HEIGHT.test(readFileSync(path, "utf-8")))

    expect(offenders).toEqual([])
  })
})
