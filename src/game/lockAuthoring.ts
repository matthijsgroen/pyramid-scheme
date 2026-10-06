/**
 * A LOCK, AS AN AUTHOR WRITES IT. Types only; nothing here runs.
 *
 * This is the shared contract between the tool that designs locks and the engine that builds them. The
 * prose it comes from is `docs/mods/mechanic-contract.md`; where the two disagree, this file is what
 * compiles and the document is what explains.
 *
 * A LOCK NAMES ROLES, NEVER REALISATIONS. `control` says what state machine the player drives; which
 * encounter dresses it — a zipline or a headwind for a one-way, a lightswitch for a fork — is bound
 * OUTSIDE, where the lock is placed, so one lock is reusable across pyramids with different themes. A
 * realisation may not change what the solver sees: same states, same edges, same directions.
 *
 * TOPOLOGY IS WRITTEN ONCE, in `connections`. `gates` and `oneWays` say what stands ON those joins. A
 * barrier naming a join that was never declared is an error rather than a new passage, so a typo cannot
 * conjure a corridor.
 */
import type { RegionAppetite } from "./regions"

export type RegionId = string
export type BarrierId = string
export type MechanicId = string

/** What a region is willing to hold — content, a reward, nothing. The carve fills it accordingly. */
export type LockRegion = { takes: RegionAppetite }

/**
 * A join between two regions. Bare, it is a passage the player walks: that is what lets two regions be
 * distinct PLACES with nothing between them, which a sequence needs to put its tiles somewhere the
 * author chose.
 *
 * `barriers` is what stands on it, IN ORDER from the first region to the second. The author decides the
 * order; the carve decides the distances, and may leave a gate halfway along a corridor. A fork puzzle's
 * gate is always first on its connection — checked, not authored.
 */
export type LockConnection =
  | readonly [RegionId, RegionId]
  | { readonly between: readonly [RegionId, RegionId]; readonly barriers?: readonly BarrierId[] }

/**
 * HOW A DOOR WITH SEVERAL OWNERS IS ANSWERED. Default is every owner: each must name the gate in its
 * current state. "any" is one is enough.
 *
 * It decides whether the gate needs a readable face (`mechanic-contract.md`, a gate shows its own condition): under "every" with more
 * than one owner, working one owner can change nothing visible, and the player cannot learn why the door
 * stays shut. Under "any" the first owner touched opens it, so the consequence teaches by itself.
 */
export type GateMode = "every" | "any"

/** A barrier on a join: shut, it is a wall the player can see and not pass. */
export type EdgeGate = {
  readonly from: RegionId
  readonly to: RegionId
  readonly owners: readonly MechanicId[]
  readonly mode?: GateMode
}

/**
 * A barrier over a whole region — flooded, buried. The player sees the first stretch and the blockage
 * and nothing beyond it, and what they had already explored is hidden while it holds (hidden, never
 * erased: it comes back as they left it).
 *
 * A region holding the lock's `in` or `out` may not be barred, and a mechanic may not stand in a region
 * it bars this way — its own cell would go out of reach and nothing could undo it. Shutting an EDGE
 * behind yourself stays allowed: the lever is still beside you.
 */
export type RegionGate = {
  readonly region: RegionId
  readonly owners: readonly MechanicId[]
  readonly mode?: GateMode
}

export type LockGate = EdgeGate | RegionGate

/**
 * A DIRECTED PASSAGE WITH NO CONTROL: it is always on, and nothing owns or reverses it. It counts as a
 * way there and never as a way back.
 *
 * It carries an id because a connection names its barriers in order, and a one-way may share a join with
 * a gate. Every realisation of it is taken THROUGH A PROMPT, whatever it is dressed as, so the player
 * never crosses by accident and finds they cannot return. The prompt says it cannot be recrossed; it
 * does not say where it lands.
 */
export type LockOneWay = { readonly from: RegionId; readonly to: RegionId }

/** Which state a mechanic opens what in. A state naming nothing does nothing, so nothing is forbidden. */
export type Opens = Readonly<Record<string, readonly BarrierId[]>>

/** Two states, back and forth, for ever. The lever, and anything else that can be put back. */
export type Toggle = {
  readonly control: "toggle"
  readonly in: RegionId
  readonly starts: string
  readonly opens: Opens
}

/**
 * Two states, no way back; the second is for good. The torch, and a floor key — the same control with
 * another realisation, taken from a chest and carried to the door rather than worked where it stands.
 */
export type Activator = {
  readonly control: "activator"
  readonly in: RegionId
  readonly starts: string
  readonly opens: Opens
}

/**
 * Tiles walked in the right order, with a reset.
 *
 * ONE MECHANIC, NOT ONE PER TILE: one state, one owner for the gate, one thing for the solver. `steps`
 * is the order, and each step names its own region, so the author places them deliberately; two steps in
 * one region are two distinct tiles. The carve picks the hieroglyphs, distinct within a floor.
 *
 * `resetAt` is a gate, because the door is where the player reads the order, so it is where they must be
 * able to start again. Progress survives leaving: without that, walking back to read the door would wipe
 * it and the safety net would be a trap.
 */
export type Sequence = {
  readonly control: "sequence"
  readonly steps: readonly { readonly in: RegionId }[]
  readonly resetAt: BarrierId
  readonly opens: Opens
}

/**
 * A puzzle standing IN a junction, which operates that junction. It names no targets: the gates name it,
 * and every one of them must be a seam leaving the region it stands in. Its states follow from those
 * seams — rest, plus one per exit — so the author counts nothing, and in rest no exit is open.
 *
 * It cannot be separated from its fork the way the other controls are separated from their effects,
 * because its board shows the player which configuration opens which exit, and a direction only means
 * something for a target next to it.
 */
export type ForkSwitch = { readonly control: "fork-switch"; readonly in: RegionId }

export type LockMechanic = Toggle | Activator | Sequence | ForkSwitch

/**
 * STONES ON PLATES, the one lock-wide control that is not a mechanic. A stone rests on a plate or is in the
 * player's hand; stones are alike, so a stone is written as the plate it starts on. A plate opens its
 * `weighted` gates while a stone rests on it and its `empty` gates while none does; both may be empty, which
 * makes it a shelf. See docs/superpowers/specs/2026-10-04-stones-acceptance.md.
 */
export type Weights = {
  readonly plates: Readonly<
    Record<
      string,
      {
        readonly in: RegionId
        readonly stone: boolean
        readonly opens: { readonly weighted: readonly BarrierId[]; readonly empty: readonly BarrierId[] }
      }
    >
  >
}

/** Gate owners that are conditions on the stones rather than something placed: empty hands. */
export const CARRY_TERMS = ["unladen"] as const

/**
 * One lock. Reusable: the same one is placed on several floors without being copied, and it does not
 * know which floor it will lie on. One instance per floor — two of the same thing on one floor is a
 * clone with its own names — so a name is unique within its lock and a lock within its floor.
 *
 * `in` and `out` are the ports it is entered and left by. Chaining several on a floor, and nesting one
 * inside a region of another, are said where locks are PLACED, not here.
 */
export type Lock = {
  readonly name: string
  readonly regions: Readonly<Record<RegionId, LockRegion>>
  readonly connections: readonly LockConnection[]
  readonly gates: Readonly<Record<BarrierId, LockGate>>
  readonly oneWays?: Readonly<Record<BarrierId, LockOneWay>>
  readonly mechanics: Readonly<Record<MechanicId, LockMechanic>>
  readonly weights?: Weights
  readonly in: RegionId
  readonly out: RegionId
}

/** A gate barring a whole region rather than a join between two. */
export const isRegionGate = (gate: LockGate): gate is RegionGate => "region" in gate

/** The pair a connection joins, whichever of its two shapes was written. */
export const joinOf = (connection: LockConnection): readonly [RegionId, RegionId] =>
  "between" in connection ? connection.between : connection

/** What stands on a connection, in order from its first region to its second. */
export const barriersOf = (connection: LockConnection): readonly BarrierId[] =>
  "between" in connection ? (connection.barriers ?? []) : []

/** Whether a gate owner is a plate of the lock, or a condition on what the player carries. */
export const isWeightOwner = (lock: Lock, owner: string): boolean =>
  Object.hasOwn(lock.weights?.plates ?? {}, owner) || (CARRY_TERMS as readonly string[]).includes(owner)
