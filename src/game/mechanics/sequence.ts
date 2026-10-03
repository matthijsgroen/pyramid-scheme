import type { LockFault } from "../lockCompile"
import type { MechanicKind } from "./mechanicKind"

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
    control.control === "sequence" ? control.steps.map(step => ({ region: step.in, seat: "tile" as const })) : [],
  compile: (id, mechanic, { name, binding }) => {
    if (mechanic.control !== "sequence") return { controls: [] }
    const encounter = binding.sequence
    return {
      controls: [
        {
          id: name(id),
          control: "sequence",
          steps: mechanic.steps.map(step => ({ in: name(step.in) })),
          resetAt: name(mechanic.resetAt),
          opens: { done: (mechanic.opens.done ?? []).map(name) },
          ...(encounter === undefined ? {} : { encounter }),
        },
      ],
    }
  },
}
