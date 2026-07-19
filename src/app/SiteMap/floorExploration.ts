import type { FloorGrid } from "@/game/siteTypes"
import { getFamilyPlugin } from "@/app/families/familyRegistry"

// The per-floor "still stuff to find here" summary that drives the Travel marker. Computed from an
// assembled floor grid (cheap, done while the player is inside the site) and persisted so the travel
// screen reads it without re-assembling. Knowledge is only "keys and gates", no mod names.
//
// Content the player would come back for is either a LOOT-BEARING node (its family draws from the
// reward pool — FamilyMeta.rewardPriority > 0, so treasure/puzzle count and gate/trap/shop/tableau
// don't) or a KEY-GATED node (it exposes its own requiredKeyIds — e.g. a tableau's hieroglyphs),
// plus a still-fogged corridor (a branch never entered). A node counts even with an empty slot (the
// player can't tell from outside) and only while unvisited (state !== "completed"). Hidden corridors
// are excluded — the 👁 marker owns them.
//
// Each content node's keys = the tomb-key ward key(s) gating its section + its own requiredKeyIds.
// A node with no keys is `open` (always lights). One with keys becomes a keySet the travel screen
// re-checks against the live held-keys set (ward keys + completed hieroglyphs + whatever future mods
// provide); ALL keys in a bundle must be held. Floor-key gates aren't external keys (found in-floor),
// so their content stays `open`.
export type FloorExploration = { open: boolean; keySets: string[][] }

export const computeFloorExploration = (grid: FloorGrid): FloorExploration => {
  const sectionGateKeys = new Map<string, Set<string>>()
  for (const row of grid.cells)
    for (const cell of row)
      if (cell.type === "room" && !cell.hidden && cell.gateVariant === "tomb-key" && cell.requiredKeyId) {
        const h = cell.sectionHash ?? ""
        ;(sectionGateKeys.get(h) ?? sectionGateKeys.set(h, new Set()).get(h)!).add(cell.requiredKeyId)
      }

  let open = false
  const keySets: string[][] = []
  const seen = new Set<string>()
  const addContent = (sectionHash: string, ownKeys: readonly string[] = []) => {
    const keys = new Set([...(sectionGateKeys.get(sectionHash) ?? []), ...ownKeys])
    if (keys.size === 0) {
      open = true
      return
    }
    const sig = [...keys].sort().join(",")
    if (!seen.has(sig)) {
      seen.add(sig)
      keySets.push(sig.split(","))
    }
  }

  for (const row of grid.cells) {
    for (const cell of row) {
      if (cell.type === "empty" || cell.hidden) continue
      const h = cell.sectionHash ?? ""
      if (cell.type === "corridor") {
        if (cell.state === "fogged") addContent(h)
        continue
      }
      if (cell.state === "completed") continue
      const priority = cell.family ? (getFamilyPlugin(cell.family)?.meta.rewardPriority ?? 0) : 0
      const ownKeys = cell.requiredKeyIds ?? []
      if (priority > 0 || ownKeys.length > 0) addContent(h, ownKeys)
    }
  }

  return { open, keySets }
}
