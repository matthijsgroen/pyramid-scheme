import type { LockFault } from "../lockCompile"
import type { LooseMechanic, MechanicKind } from "./mechanicKind"

/** Two states and a start in one of them: the shape a toggle and an activator share. */
export const twoStateFaults = (id: string, mechanic: LooseMechanic): LockFault[] => {
  const faults: LockFault[] = []
  const states = Object.keys(mechanic.opens ?? {})
  if (states.length !== 2) faults.push({ type: "statesNotTwo", mechanic: id, states })
  if (mechanic.starts === undefined || !states.includes(mechanic.starts))
    faults.push({ type: "startsNotAState", mechanic: id, starts: mechanic.starts ?? "" })
  return faults
}

const twoState = (returnsToInitial: boolean): NonNullable<MechanicKind["compile"]> => {
  return (id, mechanic, { name, binding }) => {
    if (mechanic.control !== "toggle" && mechanic.control !== "activator") return { controls: [] }
    const encounter = binding[mechanic.control]
    return {
      controls: [
        {
          id: name(id),
          in: name(mechanic.in),
          states: Object.keys(mechanic.opens),
          initial: mechanic.starts,
          returnsToInitial,
          opens: Object.fromEntries(Object.entries(mechanic.opens).map(([state, ids]) => [state, ids.map(name)])),
          ...(encounter === undefined ? {} : { encounter }),
        },
      ],
    }
  }
}

/** Two states, back and forth: the lever. */
export const TOGGLE: MechanicKind = {
  control: "toggle",
  built: true,
  gates: "opens",
  faults: twoStateFaults,
  compile: twoState(true),
  seats: control => (control.control === undefined ? [{ region: control.in, seat: "control" }] : []),
}

/** Two states, no way back: a floor key, or a prize taken once. Water and sand never touch it. */
export const ACTIVATOR: MechanicKind = {
  control: "activator",
  built: true,
  gates: "opens",
  faults: twoStateFaults,
  compile: twoState(false),
  seats: control => (control.control === undefined ? [{ region: control.in, seat: "control" }] : []),
}
