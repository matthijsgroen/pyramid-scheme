import type { Lock } from "@/game/lockAuthoring"
import { LESSONS, LOCK_CATALOGUE, findLockEntry } from "@/game/lockCatalogue"

/**
 * A LOCK FROM ITS .lock FILE, for the world spec: the file the designer draws with `yarn lock` is the one the
 * bake reads, so no copy can drift. Named by its bare name, "tier/name" or, for a lesson, "lessons/name". Node
 * only: the spec runs at bake time, never in the app.
 */
export const catalogueLock = (name: string): Lock => {
  const entry = findLockEntry(name)
  const parsed = entry && (entry.lesson ? LESSONS : LOCK_CATALOGUE)[entry.name]
  if (!parsed) throw new Error(`no lock ${name} in src/game/locks`)
  if (parsed.refused.length > 0 || parsed.drafts.length > 0)
    throw new Error(`lock ${name} is not finished: ${[...parsed.refused, ...parsed.drafts].join("; ")}`)
  return parsed.lock
}
