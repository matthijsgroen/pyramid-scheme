import { DEFAULT_CONTROL_ROLE, DOOR_FACE_ROLE } from "../encounterFallback"
import { controlKindOf } from "../obstacles"
import type { ResolveEncounter } from "../siteAssembler"
import type { FloorConfig } from "../siteTypes"

/**
 * A MECHANIC WHOSE REALISATION NO REGISTERED MOD PROVIDES. Core owns every control kind; a mod only dresses
 * one. With the mod that dresses it gone the floor is refused by name, never carved with a default standing
 * in, so the walls are never what a mod's absence decided. `mechanic` is the authored id, `kind` the control
 * kind it is an instance of (or "door-face" for the reader a door waits behind), `realisation` the family or
 * role that nothing answers to.
 */
export type RealisationMissing = { type: "realisationMissing"; mechanic: string; kind: string; realisation: string }

const answered = (resolve: ResolveEncounter, encounter: string | undefined, role: string): boolean =>
  resolve(encounter, role).ownerMod !== undefined

/**
 * EVERY CONTROL OF THE FLOOR WHOSE REALISATION THE BUILD CANNOT ANSWER, asked from the config alone so it is
 * known before a wall is carved. A control names its realisation (`encounter`) or stands as the default
 * control role; a fork-switch must name one. A sequence authored longhand names none and is read at the door's
 * face (`doorFacesMissing`); one a lock placed carries its bound realisation and is asked like any other.
 */
export const realisationsMissing = (
  config: Pick<FloorConfig, "controls" | "handles">,
  resolveEncounter: ResolveEncounter
): RealisationMissing[] => [
  ...(config.controls ?? []).flatMap((control): RealisationMissing[] => {
    if (control.control === "sequence" && control.encounter === undefined) return []
    const role = control.control === "fork-switch" ? "puzzle" : DEFAULT_CONTROL_ROLE
    return answered(resolveEncounter, control.encounter, role)
      ? []
      : [
          {
            type: "realisationMissing",
            mechanic: control.id,
            kind: controlKindOf(control),
            realisation: control.encounter ?? role,
          },
        ]
  }),
  ...(config.handles ?? []).flatMap((handle): RealisationMissing[] =>
    answered(resolveEncounter, undefined, DEFAULT_CONTROL_ROLE)
      ? []
      : [{ type: "realisationMissing", mechanic: handle.in, kind: "toggle", realisation: DEFAULT_CONTROL_ROLE }]
  ),
]

/** THE DOORS THAT NEED A READABLE FACE when nothing answers to it: one entry per door, named by the key it waits on. */
export const doorFacesMissing = (
  doorKeys: readonly string[],
  resolveEncounter: ResolveEncounter
): RealisationMissing[] =>
  answered(resolveEncounter, undefined, DOOR_FACE_ROLE)
    ? []
    : doorKeys.map(mechanic => ({
        type: "realisationMissing",
        mechanic,
        kind: DOOR_FACE_ROLE,
        realisation: DOOR_FACE_ROLE,
      }))
