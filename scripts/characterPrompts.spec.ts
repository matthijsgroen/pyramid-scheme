import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * `yarn repaint` composes these prompts rather than copying them: the document states its house style once
 * and every entry opens with a `[preamble]` token that the script swaps the real text into.
 *
 * That only holds while the document keeps writing them that way. An entry that opens with anything else
 * is pasted into the generator WITHOUT the house style — the one failure that does not announce itself,
 * because the prompt still reads like a prompt and the return still looks like art, just not like this
 * game's art. Hence three assertions on the document, in the same spirit as `repaintQueue.spec.ts`.
 */
const DOC = join(__dirname, "..", "docs", "game-design", "story", "character-art-prompts.md")

const sections = readFileSync(DOC, "utf8").split(/^## /m)
const section = (n: string) => sections.find(s => s.startsWith(n)) ?? ""
const quotedLines = (text: string) => text.split("\n").filter(line => line.startsWith(">"))
const entries = [section("1."), section("2.")].flatMap(body => body.split(/^### /m).slice(1))

describe("the character art prompts", () => {
  it("names a 250px sprite file in every heading, which is where the import writes", () => {
    expect(entries.map(block => /^`([\w-]+)-250\.png`/.test(block))).not.toContain(false)
  })

  it("opens every prompt with the token the script substitutes the house style into", () => {
    const opens = entries.map(block => /^\[preamble( \+ ghost preamble)?\]/.test(quotedLines(block)[0]?.slice(2) ?? ""))
    expect(opens).not.toContain(false)
  })

  it("has a house style to substitute, and a ghost rider before the ghosts", () => {
    expect(quotedLines(section("0.")).length).toBeGreaterThan(0)
    expect(quotedLines(section("2.").split(/^### /m)[0]).join("\n")).toContain("Ghost preamble")
  })
})

describe("a landed file marked for re-rolling", () => {
  it("states a reason on one line, which is what the queue prints beside it", () => {
    for (const block of entries) {
      const marked = /\*\*Re-roll:\*\*\s*([^\n]+)/.exec(block)
      if (!marked) continue
      expect(marked[1].trim().length).toBeGreaterThan(10)
    }
  })
})
