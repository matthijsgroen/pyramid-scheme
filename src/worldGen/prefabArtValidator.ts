import type { Tileset } from "@/game/siteTypes"
import type { Prefab } from "@/game/prefabTypes"
import type { WorldValidator } from "./validate"
import type { FloorConfig, SubSection } from "./types"
import { hasTileArt } from "./tileArt"

type Section = Pick<SubSection, "label" | "prefabs" | "prefabPlacements" | "prefabsByIndex"> &
  Partial<Pick<SubSection, "tileset" | "difficulty">>

/** The prefab names a section places: its counted rooms and its pinned ones. */
const placedNames = (s: Section): string[] => [
  ...(s.prefabPlacements ?? []).map(p => p.room),
  ...Object.values(s.prefabsByIndex ?? {}),
]

/** Every kind a prefab's places may stand. A `patron` place is the floor's statue, and only a floor with a patron has one. */
const kindsNeeded = (prefab: Prefab, patron: string | undefined): { kind: string; viaPatron: boolean }[] => {
  const needed = new Map<string, boolean>()
  for (const place of Object.values(prefab.places))
    for (const k of place.kinds) {
      if (k === "patron" && !patron) continue
      const kind = k === "patron" ? "statue" : k
      needed.set(kind, (needed.get(kind) ?? false) || k === "patron")
    }
  return [...needed].map(([kind, viaPatron]) => ({ kind, viaPatron }))
}

/**
 * Refuses a prefab whose listed kinds have no painted art in the tileset its floor is drawn in, so a floor never
 * shows a missing sprite. A patron statue is `statue-<patron>` where painted, else the plain `statue`.
 */
export const prefabArtValidator: WorldValidator = configs => {
  const missing: string[] = []
  const check = (where: string, floor: FloorConfig, section: Section) => {
    const tier: Tileset = section.tileset ?? floor.tileset ?? section.difficulty ?? floor.difficulty
    const catalogue = { ...floor.prefabs, ...section.prefabs }
    for (const room of new Set(placedNames(section))) {
      const prefab = catalogue[room]
      if (!prefab) continue
      for (const { kind, viaPatron } of kindsNeeded(prefab, floor.patron)) {
        const painted =
          hasTileArt(tier, kind) || (viaPatron && !!floor.patron && hasTileArt(tier, `${kind}-${floor.patron}`))
        if (!painted) missing.push(`[worldSpec] Room prefab art missing: ${room} on ${where} needs ${kind} (${tier})`)
      }
    }
  }
  for (const [siteKey, sites] of Object.entries(configs))
    sites.forEach((floors, siteIndex) =>
      floors.forEach((floor, floorIndex) => {
        const where = `${siteKey}[${siteIndex}] floor ${floorIndex}`
        check(where, floor, floor)
        for (const side of floor.sideSections) {
          check(`${where} ${side.label ?? "side path"}`, floor, side)
          for (const sub of side.sideSections ?? []) check(`${where} ${sub.label ?? "side path"}`, floor, sub)
        }
      })
    )
  if (missing.length > 0) throw new Error(missing.join("\n"))
}
