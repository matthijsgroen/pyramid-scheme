// A LOCK IS A GRAPH OF PLACES AND THE THINGS THAT CHANGE WHICH OF THEM JOIN UP. Nothing here knows
// about grids, families or mods: a beam board, a lever, a sequence and a floor key are one shape with
// different data — states, which of its gates each state opens, and the moves that change state. See
// docs/mods/floor-topology-design.md.
export type RegionId = string
export type GateId = string
export type MechanismId = string
export type StateId = string

/** Which state every mechanism is in — the half of a lock state that is not the player's position. */
export type LockConfig = Record<MechanismId, StateId>

export type LockGate = {
  from: RegionId
  to: RegionId
  /** Every mechanism with a say in this boundary. At least one. */
  owners: MechanismId[]
  /** "all" (the default) opens it only while every owner opens it; "any" while one of them does. */
  mode?: "all" | "any"
}

export type Mechanism = {
  states: StateId[]
  initial: StateId
  /** Which of the gates this mechanism owns stand open in each state. A state listing none shuts them all. */
  opens: Record<StateId, GateId[]>
  /** The moves the player makes: standing in `at`, this mechanism goes from one state to another. */
  transitions: { from: StateId; to: StateId; at: RegionId }[]
}

export type LockSpec = {
  regions: RegionId[]
  gates: Record<GateId, LockGate>
  mechanisms: Record<MechanismId, Mechanism>
  /** Directed, region to region: a drop the player takes one way. */
  oneWays?: { from: RegionId; to: RegionId }[]
  /** Where the player arrives, and where they leave for. */
  in: RegionId
  out: RegionId
}

// EVERY ID IN A LOCK IS A REFERENCE INTO ANOTHER TABLE, and a misspelled one is the failure that does
// not announce itself: the branch behind it is unreachable for ever and the walk below would report
// something true but useless about a lock the author did not write. So the references are checked
// before anything is walked, and the message names the id that does not resolve.
export const checkLockSpec = (spec: LockSpec): string | undefined => {
  const regions = new Set(spec.regions)
  if (!regions.has(spec.in)) return `the way in names no region: ${spec.in}`
  if (!regions.has(spec.out)) return `the way out names no region: ${spec.out}`

  for (const [gateId, gate] of Object.entries(spec.gates)) {
    if (!regions.has(gate.from)) return `gate ${gateId} leads from no region: ${gate.from}`
    if (!regions.has(gate.to)) return `gate ${gateId} leads to no region: ${gate.to}`
    if (gate.owners.length === 0) return `gate ${gateId} has no owner`
    for (const owner of gate.owners) if (!spec.mechanisms[owner]) return `gate ${gateId} names no mechanism: ${owner}`
  }

  for (const oneWay of spec.oneWays ?? []) {
    if (!regions.has(oneWay.from)) return `a one-way leads from no region: ${oneWay.from}`
    if (!regions.has(oneWay.to)) return `a one-way leads to no region: ${oneWay.to}`
  }

  for (const [id, mechanism] of Object.entries(spec.mechanisms)) {
    const states = new Set(mechanism.states)
    if (!states.has(mechanism.initial)) return `${id} starts in a state it does not have: ${mechanism.initial}`
    for (const [state, gates] of Object.entries(mechanism.opens)) {
      if (!states.has(state)) return `${id} opens gates in a state it does not have: ${state}`
      for (const gateId of gates) {
        const gate = spec.gates[gateId]
        if (!gate) return `${id} opens no such gate: ${gateId}`
        // Two lists naming each other: a mechanism that opens a gate the gate does not count as an
        // owner is ignored by the fold, and the door would stay shut for a reason nothing reports.
        if (!gate.owners.includes(id)) return `${id} opens ${gateId}, which it does not own`
      }
    }
    for (const transition of mechanism.transitions) {
      if (!states.has(transition.from)) return `${id} moves from a state it does not have: ${transition.from}`
      if (!states.has(transition.to)) return `${id} moves to a state it does not have: ${transition.to}`
      if (!regions.has(transition.at)) return `${id} is thrown from no region: ${transition.at}`
    }
  }

  return undefined
}
