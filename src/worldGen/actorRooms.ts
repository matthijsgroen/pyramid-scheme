// A room pinned to a node whose encounter has somebody in it must be fit for them (prefabChecks.fitsActor): they stand
// north of its stop. Run once the encounters are resolved to families; a room placed by `rooms` needs no fit.
import { fitsActor } from "../game/prefabChecks"
import type { Prefab } from "../game/prefabTypes"
import type { ResolveEncounter } from "../game/siteAssembler"
import type { SiteConfig } from "./types"
import { RoomFault } from "./dsl"

type Pinning = {
  encounter?: string | string[]
  encountersByIndex?: Record<number, string | string[]>
  prefabs?: Record<string, Prefab>
  prefabsByIndex?: Record<number, string>
}
type Section = Pinning & { sideSections?: Section[] }

const unfitIn = (section: Pinning, resolve: ResolveEncounter, where: string): string[] =>
  Object.entries(section.prefabsByIndex ?? {}).flatMap(([index, name]) => {
    const encounter = section.encountersByIndex?.[Number(index)] ?? section.encounter
    const prefab = section.prefabs?.[name]
    if (!prefab || !resolve(encounter, "puzzle").actor || fitsActor(prefab)) return []
    return [
      `${where}#${Number(index) + 1}: room ${name} has no bare cell north of its stop off every walk for somebody`,
    ]
  })

const sectionFaults = (section: Section, resolve: ResolveEncounter, where: string): string[] => [
  ...unfitIn(section, resolve, where),
  ...(section.sideSections ?? []).flatMap((sub, i) => sectionFaults(sub, resolve, `${where}.${i}`)),
]

/** Throws a RoomFault naming every pinned room an encounter with somebody stands in that is not fit for them. */
export const refuseUnfitActorRooms = (configs: Record<string, SiteConfig[]>, resolve: ResolveEncounter): void => {
  const faults = Object.entries(configs).flatMap(([journeyId, sites]) =>
    sites.flatMap((floors, level) =>
      floors.flatMap((floor, fi) => {
        const at = `journey=${journeyId} pyramid=${level + 1} floor=${fi} node=`
        return [
          ...unfitIn(floor, resolve, `${at}main`),
          ...floor.sideSections.flatMap((section, si) => sectionFaults(section, resolve, `${at}s${si}`)),
        ]
      })
    )
  )
  if (faults.length > 0) throw new RoomFault(faults.join("\n"))
}
