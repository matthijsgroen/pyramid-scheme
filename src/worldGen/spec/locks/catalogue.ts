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

/** The same lock with every region taking `free`, for a bench floor: what it holds is the topology, and the
 * carve seats none of a lock's `puzzles`/`nothing`/`reward` appetites on a floor with no content. */
export const freeRegions = (lock: Lock): Lock => ({
  ...lock,
  regions: Object.fromEntries(Object.keys(lock.regions).map(region => [region, { takes: "free" as const }])),
})
