import type { Lock } from "@/game/lockAuthoring"
import { LESSONS, LOCK_CATALOGUE } from "@/game/lockCatalogue"

const LESSON_PREFIX = "lessons/"

/**
 * A LOCK FROM ITS .lock FILE, for the world spec: the file the designer draws with `yarn lock` is the one the
 * bake reads, so no copy can drift. Named by its path under src/game/locks, so a lesson is "lessons/torch". Node
 * only: the spec runs at bake time, never in the app.
 */
export const catalogueLock = (name: string): Lock => {
  const parsed = name.startsWith(LESSON_PREFIX) ? LESSONS[name.slice(LESSON_PREFIX.length)] : LOCK_CATALOGUE[name]
  if (!parsed) throw new Error(`no lock ${name} in src/game/locks`)
  if (parsed.refused.length > 0 || parsed.drafts.length > 0)
    throw new Error(`lock ${name} is not finished: ${[...parsed.refused, ...parsed.drafts].join("; ")}`)
  return parsed.lock
}
