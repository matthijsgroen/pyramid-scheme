import type { LockFault } from "../lockCompile"
import type { MechanicKind } from "./mechanicKind"

/**
 * The realisation a sequence written `procession` is dressed as: the lock word binds it, so no floor binding is asked
 * for it (`processionRebound` refuses one that names another). Core names only the id; the puzzle mod registers it,
 * and with the mod off the sequence is unrealised like any other.
 */
export const PROCESSION_REALISATION = "procession-door"

/** The binding key a floor would name a procession's realisation under, which only `PROCESSION_REALISATION` may fill. */
export const PROCESSION_ROLE = "procession"

/** How many steps a procession may have: one bar each, a two-bar board is read rather than solved, and one cast has
 * six signs. */
export const PROCESSION_STEPS = { min: 3, max: 6 } as const

/** Progress along tiles walked in order, with a reset: its one state that opens anything is `done`. */
export const SEQUENCE: MechanicKind = {
  control: "sequence",
  built: true,
  gates: "opens",
  faults: (id, mechanic): LockFault[] =>
    Object.keys(mechanic.opens ?? {})
      .filter(state => state !== "done")
      .map(state => ({ type: "sequenceStateNotDone", mechanic: id, state })),
  seats: control =>
    control.control === "sequence" ? control.steps.map(step => ({ region: step.in, seat: "threshold" as const })) : [],
  compile: (id, mechanic, { name, binding }) => {
    if (mechanic.control !== "sequence") return { controls: [] }
    const encounter = mechanic.procession ? PROCESSION_REALISATION : binding.sequence
    return {
      controls: [
        {
          id: name(id),
          control: "sequence",
          steps: mechanic.steps.map(step => ({ in: name(step.in) })),
          resetAt: name(mechanic.resetAt),
          opens: { done: (mechanic.opens.done ?? []).map(name) },
          ...(encounter === undefined ? {} : { encounter }),
          ...(mechanic.procession ? { procession: true as const } : {}),
        },
      ],
    }
  },
}
