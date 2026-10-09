import type { LockFault } from "../lockCompile"
import type { LooseMechanic, MechanicKind } from "./mechanicKind"

/** A torch is off or lit; the names are fixed, so a gate says `-[B]-` for lit and `-[B:off]-` for out. */
export const TORCH_OFF = "off"
export const TORCH_ON = "on"
export const TORCH_STATES = [TORCH_OFF, TORCH_ON] as const

/** A torch's states are `off` and `on`, and it starts in one of them. */
export const flameFaults = (id: string, mechanic: LooseMechanic): LockFault[] => {
  const states = Object.keys(mechanic.opens ?? {})
  const fixed = states.length === 2 && TORCH_STATES.every(state => states.includes(state))
  const starts = mechanic.starts === TORCH_OFF || mechanic.starts === TORCH_ON
  return fixed && starts ? [] : [{ type: "flameStates", mechanic: id, states, starts: mechanic.starts ?? "" }]
}

/** The torch's kind, `flame`: off until lit, lit for as long as no flood covers its region. A stateful control that
 * names its kind, so the floor's solver and play know which mechanisms a flood douses. Seated like an activator, one
 * room in its region. */
export const FLAME: MechanicKind = {
  control: "flame",
  built: true,
  gates: "opens",
  faults: flameFaults,
  compile: (id, mechanic, { name, binding }) => {
    if (mechanic.control !== "flame") return { controls: [] }
    const encounter = binding.flame
    return {
      controls: [
        {
          id: name(id),
          control: "flame",
          in: name(mechanic.in),
          states: [...TORCH_STATES],
          initial: mechanic.starts,
          returnsToInitial: false,
          opens: {
            [TORCH_OFF]: (mechanic.opens[TORCH_OFF] ?? []).map(name),
            [TORCH_ON]: (mechanic.opens[TORCH_ON] ?? []).map(name),
          },
          ...(encounter === undefined ? {} : { encounter }),
        },
      ],
    }
  },
  seats: control => (control.control === "flame" ? [{ region: control.in, seat: "control" }] : []),
}
