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

// WHETHER A DOOR STANDS OPEN IS ASKED OF ITS OWNERS, NEVER ASSUMED FROM A STATE. A board opens one
// gate per state and a sequence opens its gate only in the last, so a state is not "which gate is
// open" — it is a key into each owner's own mapping, folded by the gate's mode.
export const openGates = (spec: LockSpec, config: LockConfig): Set<GateId> => {
  const open = new Set<GateId>()
  for (const [gateId, gate] of Object.entries(spec.gates)) {
    const says = gate.owners.map(owner => (spec.mechanisms[owner].opens[config[owner]] ?? []).includes(gateId))
    if (gate.mode === "any" ? says.some(Boolean) : says.every(Boolean)) open.add(gateId)
  }
  return open
}

/** Where the player stands, and what every mechanism is set to. */
export type LockState = { region: RegionId; config: LockConfig }

// ponytail: a flat ceiling rather than a cleverer search. A container is a handful of regions and a
// handful of mechanisms; a lock reaching this has an authoring mistake in it, and hanging the build
// while a state space explodes is the worse answer. Raise it if a real lock ever comes close.
export const MAX_LOCK_STATES = 50_000

const stateKey = (ids: readonly MechanismId[], state: LockState): string =>
  `${state.region}|${ids.map(id => `${id}=${state.config[id]}`).join(",")}`

// THE FOUR MOVES. Walking through an open gate goes either way — a gate is a door, not a drop — while
// a one-way goes one way, which is the whole of what P2 buys.
//
// The fourth is leaving the floor and coming back, and it starts at the way out because that is what
// the save makes true: a journey's position is "floor:row,col", so re-entering a site puts the player
// back where they stood, and only a position belonging to another floor falls back to the entrance.
// Reaching another floor means reaching the staircase. So this is the move that makes shutting your
// own way back after passing the staircase a state rather than an argument, and it is NOT an escape
// from a chamber a mechanism has sealed.
const movesFrom = (spec: LockSpec, state: LockState): LockState[] => {
  const { region, config } = state
  const next: LockState[] = []

  for (const gateId of openGates(spec, config)) {
    const gate = spec.gates[gateId]
    if (gate.from === region) next.push({ region: gate.to, config })
    if (gate.to === region) next.push({ region: gate.from, config })
  }
  for (const oneWay of spec.oneWays ?? []) if (oneWay.from === region) next.push({ region: oneWay.to, config })
  for (const [id, mechanism] of Object.entries(spec.mechanisms))
    for (const transition of mechanism.transitions)
      if (transition.at === region && config[id] === transition.from)
        next.push({ region, config: { ...config, [id]: transition.to } })
  if (region === spec.out) next.push({ region: spec.in, config })

  return next
}

// Breadth-first, with `order` doubling as the queue: a state's index is therefore its discovery
// order, so the first failure found later is also the shortest one to describe. `edges` is kept
// because the second question walks the same graph backwards and re-deriving the moves would be the
// same work twice.
export const reachableStates = (spec: LockSpec): { order: LockState[]; edges: number[][] } | "tooLarge" => {
  const ids = Object.keys(spec.mechanisms).sort()
  const ceiling = spec.regions.length * ids.reduce((n, id) => n * spec.mechanisms[id].states.length, 1)
  if (ceiling > MAX_LOCK_STATES) return "tooLarge"

  const start: LockState = {
    region: spec.in,
    config: Object.fromEntries(ids.map(id => [id, spec.mechanisms[id].initial])),
  }
  const index = new Map<string, number>([[stateKey(ids, start), 0]])
  const order: LockState[] = [start]
  const edges: number[][] = [[]]

  for (let at = 0; at < order.length; at++) {
    for (const move of movesFrom(spec, order[at])) {
      const key = stateKey(ids, move)
      let to = index.get(key)
      if (to === undefined) {
        to = order.length
        index.set(key, to)
        order.push(move)
        edges.push([])
      }
      edges[at].push(to)
    }
  }

  return { order, edges }
}
