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

// A `<name>-blocked.lock` is a designer's lock the walk refuses, kept for them to fix: the catalogue, the world and
// the tests never read it, and `yarn lock <path>` still draws it.
export const lockTextsIn = (folder: string): Record<string, string> =>
  Object.fromEntries(
    readdirSync(folder)
      .filter(file => file.endsWith(".lock") && !file.endsWith("-blocked.lock"))
      .map(file => [file.slice(0, -".lock".length), readFileSync(join(folder, file), "utf8")])
  )
const parsedAll = (texts: Record<string, string>): Record<string, ParsedLock> =>
  Object.fromEntries(Object.entries(texts).map(([name, text]) => [name, parseLock(text, name)]))

export const LOCK_TIERS = ["junior", "expert", "master", "wizard"] as const
export type LockTier = (typeof LOCK_TIERS)[number]

export type LockEntry = { name: string; tier: LockTier; path: string; lesson: boolean; text: string }

const filesUnder = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(join(folder, entry.name)).map(file => `${entry.name}/${file}`) : [entry.name]
  )

/**
 * Every lock under a locks root: one folder per tier, a `lessons/` folder inside a tier for the single-mechanic
 * lessons. A lock goes by its bare file name, so two files with one name are refused, as is a lock outside a tier.
 */
export const lockEntriesIn = (root: string): LockEntry[] => {
  const entries: LockEntry[] = []
  for (const file of filesUnder(root).filter(f => f.endsWith(".lock") && !f.endsWith("-blocked.lock"))) {
    const [tier, ...rest] = file.split("/")
    if (!(LOCK_TIERS as readonly string[]).includes(tier) || rest.length === 0)
      throw new Error(`lock ${file} is not in a tier folder (${LOCK_TIERS.join(", ")})`)
    const path = rest.join("/").slice(0, -".lock".length)
    const name = path.split("/").pop()!
    const twin = entries.find(entry => entry.name === name)
    if (twin) throw new Error(`two locks are called ${name}: ${twin.tier}/${twin.path} and ${tier}/${path}`)
    entries.push({
      name,
      tier: tier as LockTier,
      path,
      lesson: rest.length > 1 && rest[0] === "lessons",
      text: readFileSync(join(root, file), "utf8"),
    })
  }
  return entries
}

/** The names a lock answers to: bare, `tier/name`, `lessons/name`, and the full path. */
export const lockAliases = (entry: Pick<LockEntry, "name" | "tier" | "path">): string[] => [
  entry.name,
  `${entry.tier}/${entry.name}`,
  entry.path,
  `${entry.tier}/${entry.path}`,
]

export const LOCK_ENTRIES = lockEntriesIn(join(here, "locks"))
export const LESSON_TEXTS = Object.fromEntries(LOCK_ENTRIES.filter(e => e.lesson).map(e => [e.name, e.text]))
export const LOCK_CATALOGUE = parsedAll(
  Object.fromEntries(LOCK_ENTRIES.filter(e => !e.lesson).map(e => [e.name, e.text]))
)
export const LESSONS = parsedAll(LESSON_TEXTS)

/** A lock by any name it answers to. */
export const findLockEntry = (name: string): LockEntry | undefined =>
  LOCK_ENTRIES.find(entry => lockAliases(entry).includes(name))

/** Whether the lock going by `name` is one of the single-mechanic lessons. */
export const isLessonLock = (name: string): boolean => findLockEntry(name)?.lesson === true
