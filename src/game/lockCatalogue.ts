// SMALL MULTI-STEP LOCKS, EACH WITH ONE TRICK, and the single-mechanic LESSONS that teach their parts
// first (docs/game-design/lock-curriculum.md). Each is a `.lock` file in ./locks, written in
// lockNotation.ts's notation; `yarn lock <file>` draws one. Read from disk, so the CLI and tests only.
import { readFileSync, readdirSync } from "node:fs"
import { parseLock } from "./lockNotation"
import type { ParsedLock } from "./lockNotation"

const textsIn = (folder: URL): Record<string, string> =>
  Object.fromEntries(
    readdirSync(folder)
      .filter(file => file.endsWith(".lock"))
      .map(file => [file.slice(0, -".lock".length), readFileSync(new URL(file, folder), "utf8")])
  )
const parsedAll = (texts: Record<string, string>): Record<string, ParsedLock> =>
  Object.fromEntries(Object.entries(texts).map(([name, text]) => [name, parseLock(text, name)]))

const LOCK_TEXTS = textsIn(new URL("./locks/", import.meta.url))
export const LESSON_TEXTS = textsIn(new URL("./locks/lessons/", import.meta.url))
export const LOCK_CATALOGUE = parsedAll(LOCK_TEXTS)
export const LESSONS = parsedAll(LESSON_TEXTS)
