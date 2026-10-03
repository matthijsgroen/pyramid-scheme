import type { LockFault, RealisationBinding } from "../lockCompile"
import type { LockMechanic, Opens } from "../lockAuthoring"
import type { Control } from "../obstacles"
import type { ForkDemand } from "../siteTypes"

/**
 * A mechanic of a lock as the checks read it: a kind this build may not know has only the fields every
 * kind shares.
 */
export type LooseMechanic = {
  control: string
  in?: string
  starts?: string
  opens?: Opens
  steps?: readonly { readonly in: string }[]
}

/** What a kind's compile rule reads: the names a lock's ids take on the floor, and the realisation bound to the kind. */
export type CompileContext = {
  /** The id as it stands on the floor: prefixed with the lock's namespace where it has one. */
  name: (id: string) => string
  binding: RealisationBinding
}

/** What one mechanic becomes on a floor: its controls, and the junctions it asks the carve to lay. */
export type Compiled = { controls: Control[]; forks?: ForkDemand[] }

/** What a control needs a node for: its own board, one tile of a sequence, or the cell a fork is operated from. */
export type ControlSeatKind = "control" | "tile" | "junction"

/**
 * ONE KIND OF CONTROL, a plug-in OF CORE (docs/mods/mechanic-contract.md): the state machine a player drives,
 * what it needs of the carve, how it compiles into the floor's vocabulary and what it refuses. Always
 * present — mods supply the REALISATIONS that dress a kind, never the kind itself. A kind is a registry
 * entry rather than a branch in the compiler, so a new one is added by writing one.
 */
export type MechanicKind = {
  /** The `control` a lock names: "toggle", "activator", "sequence", "fork-switch", or "one-way". */
  control: string
  /** Whether the engine can build it. A lock using an unbuilt kind is written and checked, and refused at the bake. */
  built: boolean
  /**
   * How a gate names this kind as an owner. "opens": the kind lists the gates in its own `opens`, and a gate
   * lists the kind back. "owns": the kind lists none — the gate's `owners` is the whole statement, because the
   * kind governs the exits of its own junction.
   */
  gates: "opens" | "owns"
  /** At most one mechanic of this kind stands in a region: two would be two operators of one junction. */
  oneToARegion?: boolean
  /** What this kind refuses of a mechanic on its own, before the lock's gates are looked at. */
  faults?: (id: string, mechanic: LooseMechanic) => LockFault[]
  /** How a mechanic of this kind becomes controls on the floor. Absent: the kind has no mechanic to compile. */
  compile?: (id: string, mechanic: LockMechanic, context: CompileContext) => Compiled
  /** Where a floor control of this kind needs a node of its own, one entry per node, in order. Absent: it needs none. */
  seats?: (control: Control) => { region: string; seat: ControlSeatKind }[]
  /** An effect with no control of its own, compiled where the lock's gates and drops are (a one-way). */
  effectOnly?: true
}

/** Resolves a control kind to its core plug-in; answers nothing for a kind the build does not have. */
export type ResolveMechanicKind = (control: string) => MechanicKind | undefined
