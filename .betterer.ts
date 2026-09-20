import { BettererFileTest } from "@betterer/betterer"
import { readFile } from "node:fs/promises"

const COMMENT = /^\s*(\/\/|\*|\/\*)/

// A comparator that draws from the seeded stream leaves the order to however many comparisons the
// engine makes, so the same seed builds a different thing on JavaScriptCore than on V8 — a board that
// cannot be solved, or a maze a save was not written against. `shuffle(items, rand)` draws once per
// element whatever the engine does.
const RANDOM_COMPARATOR = /\.sort\(\([^)]*\) =>[^)\n]*\b(?:rand|random|rng)\b/g
const COMPARATOR_MESSAGE =
  "Shuffle with shuffle(items, rand) from @/game/random — a sort comparator that draws from the seeded stream is engine-dependent."

const SECTION_MESSAGE =
  "Name the design file and say the claim. A § resolves only until the doc is reorganised, and nothing tells you when it stops."

// Guards that only ever get better: each one reports an issue per occurrence, per file, and
// .betterer.results pins what is still outstanding. Lower it by fixing one and running
// `yarn betterer:update`; a new occurrence fails, even if another was fixed elsewhere.
export default {
  "design doc references name a file, not a paragraph": () =>
    new BettererFileTest(async (filePaths, fileTestResult) => {
      for (const filePath of filePaths) {
        const fileText = await readFile(filePath, "utf8")
        const file = fileTestResult.addFile(filePath, fileText)
        let offset = 0
        for (const line of fileText.split("\n")) {
          if (COMMENT.test(line)) {
            for (const match of line.matchAll(/§/g)) {
              const start = offset + (match.index ?? 0)
              file.addIssue(start, start + 1, SECTION_MESSAGE)
            }
          }
          offset += line.length + 1
        }
      }
    }).include("./src/**/*.ts", "./src/**/*.tsx"),

  "a seeded shuffle draws once per element, never inside a comparator": () =>
    new BettererFileTest(async (filePaths, fileTestResult) => {
      for (const filePath of filePaths) {
        const fileText = await readFile(filePath, "utf8")
        const file = fileTestResult.addFile(filePath, fileText)
        for (const match of fileText.matchAll(RANDOM_COMPARATOR)) {
          const start = match.index ?? 0
          file.addIssue(start, start + match[0].length, COMPARATOR_MESSAGE)
        }
      }
    }).include("./src/**/*.ts", "./src/**/*.tsx"),
}
