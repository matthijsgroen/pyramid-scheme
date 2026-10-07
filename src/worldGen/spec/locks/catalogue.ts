import type { Lock } from "@/game/lockAuthoring"
import { LOCK_CATALOGUE } from "@/game/lockCatalogue"

/**
 * A LOCK FROM ITS .lock FILE, for the world spec: the file the designer draws with `yarn lock` is the one the
 * bake reads, so no copy can drift. Node only: the spec runs at bake time, never in the app.
 */
export const catalogueLock = (name: string): Lock => {
  const parsed = LOCK_CATALOGUE[name]
  if (!parsed) throw new Error(`no lock ${name} in src/game/locks`)
  if (parsed.refused.length > 0 || parsed.drafts.length > 0)
    throw new Error(`lock ${name} is not finished: ${[...parsed.refused, ...parsed.drafts].join("; ")}`)
  return parsed.lock
}
