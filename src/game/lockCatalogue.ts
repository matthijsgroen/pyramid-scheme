// SMALL MULTI-STEP LOCKS, EACH WITH ONE TRICK, and the single-mechanic LESSONS that teach their parts
// first (docs/game-design/lock-curriculum.md). Each is a `.lock` file in ./locks, written in
// lockNotation.ts's notation; `yarn lock <file>` draws one. Read from disk, so the CLI, the world spec at
// bake time and tests only.
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { parseLock } from "./lockNotation"
import type { ParsedLock } from "./lockNotation"

// A path, never a `new URL(…, import.meta.url)`: under jsdom (the verify sweeps) `URL` is the browser's, and
// resolves against an http origin.
const here = dirname(fileURLToPath(import.meta.url))

const textsIn = (folder: string): Record<string, string> =>
  Object.fromEntries(
    readdirSync(folder)
      .filter(file => file.endsWith(".lock"))
      .map(file => [file.slice(0, -".lock".length), readFileSync(join(folder, file), "utf8")])
  )
const parsedAll = (texts: Record<string, string>): Record<string, ParsedLock> =>
  Object.fromEntries(Object.entries(texts).map(([name, text]) => [name, parseLock(text, name)]))

const LOCK_TEXTS = textsIn(join(here, "locks"))
export const LESSON_TEXTS = textsIn(join(here, "locks", "lessons"))
export const LOCK_CATALOGUE = parsedAll(LOCK_TEXTS)
export const LESSONS = parsedAll(LESSON_TEXTS)
