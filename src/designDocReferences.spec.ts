import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Code names a design FILE, never a paragraph inside one. A § survives only until the doc is
 * reorganised: cutting the lightbeam journal (#224) left 116 code references to sections that no
 * longer existed — §11.8 alone cited 47 times — and nothing failed, so readers kept following them
 * for a month. Half of what is left names no file at all, which does not even say which doc §9 is in.
 *
 * A ratchet, not a ban. Lower the number as citations are converted to a file path; never raise it.
 */
const CITATIONS_ALLOWED = 638

const COMMENT = /^\s*(\/\/|\*|\/\*)/

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    if (!/\.tsx?$/.test(entry.name)) return []
    return [path]
  })

const citations = (path: string): number =>
  readFileSync(path, "utf-8")
    .split("\n")
    .filter(line => COMMENT.test(line))
    .reduce((total, line) => total + (line.match(/§/g)?.length ?? 0), 0)

describe("design doc references", () => {
  it("point at a file, not a paragraph", () => {
    const total = sourceFiles("src")
      .filter(path => !path.endsWith("designDocReferences.spec.ts"))
      .reduce((sum, path) => sum + citations(path), 0)

    expect(total).toBeLessThanOrEqual(CITATIONS_ALLOWED)
  })
})
