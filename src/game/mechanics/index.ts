import { FORK_SWITCH } from "./forkSwitch"
import type { MechanicKind, ResolveMechanicKind } from "./mechanicKind"
import { ONE_WAY } from "./oneWay"
import { SEQUENCE } from "./sequence"
import { ACTIVATOR, TOGGLE } from "./toggle"
import { UNLADEN } from "./unladen"
import { WEIGHTS } from "./weights"

export type {
  Compiled,
  CompileContext,
  ControlSeatKind,
  LooseMechanic,
  MechanicKind,
  ResolveMechanicKind,
} from "./mechanicKind"

/** THE CONTROL KINDS, core's own and never toggled off. A mod dresses them; it never adds or removes one. */
export const CORE_MECHANICS: readonly MechanicKind[] = [
  TOGGLE,
  ACTIVATOR,
  SEQUENCE,
  FORK_SWITCH,
  ONE_WAY,
  WEIGHTS,
  UNLADEN,
]

/** A resolver over a list of kinds: core's own, or core's with a test's added or removed. */
export const mechanicRegistry =
  (kinds: readonly MechanicKind[]): ResolveMechanicKind =>
  control =>
    kinds.find(kind => kind.control === control)

export const resolveMechanicKind: ResolveMechanicKind = mechanicRegistry(CORE_MECHANICS)
