import { doorOpen, type DoorMode } from "./doorOpen"

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
  mode?: DoorMode
}

export type Mechanism = {
  states: StateId[]
  initial: StateId
  /** Which of the gates this mechanism owns stand open in each state. A state listing none shuts them all. */
  opens: Record<StateId, GateId[]>
  /** The moves the player makes: standing in `at`, this mechanism goes from one state to another. */
  transitions: { from: StateId; to: StateId; at: RegionId }[]
  /**
   * Moves the walk makes by ENTERING `at`, never as a choice: arriving in the region from any other puts the
   * mechanism from `from` to `to`; in any other state, entering does nothing. A sequence's tile works so.
   */
  entries?: { from: StateId; to: StateId; at: RegionId }[]
  /** A state some walk has to reach, or the lock is refused naming `label`: the order of a sequence kept. */
  goal?: { state: StateId; label: string }
}

export type LockSpec = {
  regions: RegionId[]
  gates: Record<GateId, LockGate>
  mechanisms: Record<MechanismId, Mechanism>
  /** Directed, region to region: a drop the player takes one way. `unladen`: only with hands that may leave the
   * floor, so no stone rides it. */
  oneWays?: { from: RegionId; to: RegionId; unladen?: true }[]
  /** Two regions that touch with nothing between them: walked freely, both ways. */
  passages?: { a: RegionId; b: RegionId }[]
  /** Where the player arrives, and where they leave for. */
  in: RegionId
  out: RegionId
  /** The way out is left only in a config outside every `notIn`: a stone never leaves its floor. */
  leaveWith?: { mechanism: MechanismId; notIn: StateId[] }[]
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

  for (const passage of spec.passages ?? []) {
    if (!regions.has(passage.a)) return `a passage joins no region: ${passage.a}`
    if (!regions.has(passage.b)) return `a passage joins no region: ${passage.b}`
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
    for (const transition of [...mechanism.transitions, ...(mechanism.entries ?? [])]) {
      if (!states.has(transition.from)) return `${id} moves from a state it does not have: ${transition.from}`
      if (!states.has(transition.to)) return `${id} moves to a state it does not have: ${transition.to}`
      if (!regions.has(transition.at)) return `${id} is thrown from no region: ${transition.at}`
    }
  }

  for (const { mechanism, notIn } of spec.leaveWith ?? []) {
    if (!spec.mechanisms[mechanism]) return `the way out waits on no mechanism: ${mechanism}`
    for (const state of notIn)
      if (!spec.mechanisms[mechanism].states.includes(state))
        return `the way out refuses a state ${mechanism} does not have: ${state}`
  }
  return undefined
}

/** Whether the way out may be left in this config: no mechanism it waits on is in a state it refuses. */
const mayLeave = (spec: LockSpec, config: LockConfig): boolean =>
  (spec.leaveWith ?? []).every(({ mechanism, notIn }) => !notIn.includes(config[mechanism]))

/** Whether a state ends the walk: in the way out, with hands that may leave it. */
export const finished = (spec: LockSpec, state: LockState): boolean =>
  state.region === spec.out && mayLeave(spec, state.config)

// WHETHER A DOOR STANDS OPEN IS ASKED OF ITS OWNERS, NEVER ASSUMED FROM A STATE. A board opens one
// gate per state and a sequence opens its gate only in the last, so a state is not "which gate is
// open" — it is a key into each owner's own mapping, folded by the gate's mode.
export const openGates = (spec: LockSpec, config: LockConfig): Set<GateId> => {
  const open = new Set<GateId>()
  for (const [gateId, gate] of Object.entries(spec.gates)) {
    const says = gate.owners.map(owner => (spec.mechanisms[owner].opens[config[owner]] ?? []).includes(gateId))
    if (doorOpen(says, gate.mode)) open.add(gateId)
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
  const moves: LockState[] = []

  for (const gateId of openGates(spec, config)) {
    const gate = spec.gates[gateId]
    if (gate.from === region) moves.push({ region: gate.to, config })
    if (gate.to === region) moves.push({ region: gate.from, config })
  }
  for (const oneWay of spec.oneWays ?? [])
    if (oneWay.from === region && (!oneWay.unladen || mayLeave(spec, config))) moves.push({ region: oneWay.to, config })
  for (const { a, b } of spec.passages ?? []) {
    if (a === region) moves.push({ region: b, config })
    if (b === region) moves.push({ region: a, config })
  }
  for (const [id, mechanism] of Object.entries(spec.mechanisms))
    for (const transition of mechanism.transitions)
      if (transition.at === region && config[id] === transition.from)
        moves.push({ region, config: { ...config, [id]: transition.to } })
  if (region === spec.out && mayLeave(spec, config)) moves.push({ region: spec.in, config })

  return moves.map(move => entering(spec, region, move))
}

// STEPPING INTO A REGION WORKS ITS ENTRIES: the player cannot arrive without the move having been made.
export const entering = (spec: LockSpec, from: RegionId, arrived: LockState): LockState => {
  if (arrived.region === from) return arrived
  let config = arrived.config
  for (const [id, mechanism] of Object.entries(spec.mechanisms))
    for (const entry of mechanism.entries ?? [])
      if (entry.at === arrived.region && config[id] === entry.from) {
        config = { ...config, [id]: entry.to }
        break
      }
  return config === arrived.config ? arrived : { region: arrived.region, config }
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

export type LockWalkFailure =
  | { type: "malformed"; problem: string }
  | { type: "tooLarge" }
  | { type: "unsolvable" }
  | { type: "goalUnreachable"; label: string }
  | { type: "strands"; at: LockState }

export type LockWalkResult = { sound: true; states: number } | { sound: false; failure: LockWalkFailure }

// TWO QUESTIONS OVER THE SAME STATES. Can the lock be solved at all — does any reachable state stand
// at the way out; and does EVERY reachable state still reach it. The second is strictly stronger than
// the permissive bracket over the same floor: that one answers whether a reward is ever obtainable,
// which is no comfort to a player who cannot reach it by any legal sequence of moves.
export const walkLock = (spec: LockSpec): LockWalkResult => {
  const problem = checkLockSpec(spec)
  if (problem) return { sound: false, failure: { type: "malformed", problem } }

  const found = reachableStates(spec)
  if (found === "tooLarge") return { sound: false, failure: { type: "tooLarge" } }
  const { order, edges } = found

  // A mechanism's goal comes first: a floor whose sequence no walk completes is refused by naming it, and not
  // by what the shut door behind it then makes of the way out.
  for (const [id, { goal }] of Object.entries(spec.mechanisms))
    if (goal && !order.some(state => state.config[id] === goal.state))
      return { sound: false, failure: { type: "goalUnreachable", label: goal.label } }

  const backwards: number[][] = order.map(() => [])
  edges.forEach((tos, from) => tos.forEach(to => backwards[to].push(from)))

  // Sweep the moves backwards from every state standing at the way out; whatever it does not reach is
  // a state the player can get into and not get out of.
  const finishes = new Set<number>()
  const queue: number[] = []
  order.forEach((state, n) => {
    if (!finished(spec, state)) return
    finishes.add(n)
    queue.push(n)
  })
  if (queue.length === 0) return { sound: false, failure: { type: "unsolvable" } }
  for (let at = 0; at < queue.length; at++)
    for (const from of backwards[queue[at]])
      if (!finishes.has(from)) {
        finishes.add(from)
        queue.push(from)
      }

  // Discovery order is breadth-first order, so the first state that cannot finish is also the fewest
  // moves from the start — the shortest trap to describe and the easiest to walk by hand.
  const stranded = order.findIndex((_, n) => !finishes.has(n))
  if (stranded >= 0) return { sound: false, failure: { type: "strands", at: order[stranded] } }

  return { sound: true, states: order.length }
}

// A REGION NO REACHABLE STATE STANDS IN IS LOOT NOBODY CAN EVER COLLECT, and `walkLock` does not see
// it: it calls a floor sound once the way out stays reachable, whether or not every region does. Two
// on-floor mechanisms can deadlock each other — each behind the door the other opens — and nothing
// above this reports it.
//
// A GATE'S OWNER WITH NO TRANSITION IS OFF-FLOOR: a ward, or a key earned elsewhere in the world, comes
// out of `floorLock` as a mechanism nothing on this floor can throw. Bracket three of
// docs/authored-locks-roadmap.md reads such a gate as openable elsewhere rather than shut, so a region
// behind one is left alone — `junior_2` L2 F0's ward pocket is exactly this shape and must stay legal.
// Only a region whose every bounding gate answers solely to a mechanism the floor itself drives is
// reported: that is the fault class two deadlocking controls belong to, and nothing else catches it.
//
// REPORTS, and decides nothing — same contract as `strandedRegions` (game/regions.ts), one layer up
// from the structural question that one asks.
export const deadRegions = (spec: LockSpec): RegionId[] => {
  const found = reachableStates(spec)
  if (found === "tooLarge") return []
  const stood = new Set(found.order.map(state => state.region))
  const onFloor = new Set(
    Object.entries(spec.mechanisms)
      .filter(([, mechanism]) => mechanism.transitions.length > 0 || (mechanism.entries ?? []).length > 0)
      .map(([id]) => id)
  )
  return spec.regions.filter(region => {
    if (stood.has(region)) return false
    const bounding = Object.values(spec.gates).filter(gate => gate.from === region || gate.to === region)
    return bounding.every(gate => gate.owners.every(owner => onFloor.has(owner)))
  })
}

export const describeLockWalkFailure = (failure: LockWalkFailure): string => {
  switch (failure.type) {
    case "malformed":
      return `the lock does not read: ${failure.problem}`
    case "tooLarge":
      return `the lock names more than ${MAX_LOCK_STATES} states`
    case "unsolvable":
      return "no sequence of moves reaches the way out"
    case "goalUnreachable":
      return `${failure.label} is never completed: no walk keeps the order`
    case "strands": {
      const config = Object.entries(failure.at.config)
        .map(([id, state]) => `${id} at ${state}`)
        .join(", ")
      return `from ${failure.at.region}, ${config}, nothing reaches the way out`
    }
  }
}
