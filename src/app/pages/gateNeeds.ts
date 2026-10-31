import type { Gate } from "./allJourneys"

// What else a mod asks of a tier or a tomb before it opens, beyond the treasure and the map pieces core
// knows. A need is a fact the player holds or not (`key`, read from the merged held keys) with the
// words the owning mod chose; core never names what the need is. Same seam shape as
// journeyContributions: a HOOK the mod fills once at module load, called in that fixed order.

export type GateNeed = {
  /** The fact that meets the need once held. */
  key: string
  label: string
  /** A line under the label, such as where to get it. */
  hint?: string
}

type GateNeedsReader = (gate: Gate) => readonly GateNeed[]

/**
 * The hook returns a reader of the needs on a gate. It should return the SAME reader on every render
 * until what it reads changes (memoise it on the state and translations it uses): the merged result keeps
 * one identity only while every reader does, and the memos that depend on it (available journeys, the
 * detector's compass hits) recompute whenever it changes. A reader new on every render costs those
 * recomputes on every render, nothing more.
 */
export type UseGateNeeds = () => GateNeedsReader

const registry: UseGateNeeds[] = []

/** Register a mod's gate needs once, at module load. See UseGateNeeds for the stable-reader contract. */
export const registerGateNeeds = (useNeeds: UseGateNeeds) => registry.push(useNeeds)

export type MergedGateNeeds = {
  needs: (gate: Gate) => readonly GateNeed[]
  unmet: (gate: Gate, held: ReadonlySet<string>) => readonly GateNeed[]
  open: (gate: Gate, held: ReadonlySet<string>) => boolean
}

const merge = (readers: readonly GateNeedsReader[]): MergedGateNeeds => {
  const needs = (gate: Gate) => readers.flatMap(read => read(gate))
  const unmet = (gate: Gate, held: ReadonlySet<string>) => needs(gate).filter(need => !held.has(need.key))
  return { needs, unmet, open: (gate, held) => unmet(gate, held).length === 0 }
}

// One merge per sequence of readers, found by walking their identities: the same readers give back the same
// merged object, and readers that change every render only cost a new merge each render. Weakly held, so a
// merge goes once its readers do.
type MergeNode = { next: WeakMap<GateNeedsReader, MergeNode>; merged?: MergedGateNeeds }
const merges: MergeNode = { next: new WeakMap() }

const mergeOf = (readers: readonly GateNeedsReader[]): MergedGateNeeds => {
  let node = merges
  for (const reader of readers) {
    let next = node.next.get(reader)
    if (!next) {
      next = { next: new WeakMap() }
      node.next.set(reader, next)
    }
    node = next
  }
  node.merged ??= merge(readers)
  return node.merged
}

// No registered hook means no need, so every gate is open.
export const useMergedGateNeeds = (): MergedGateNeeds => {
  const readers: GateNeedsReader[] = []
  for (const useNeeds of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    readers.push(useNeeds())
  }
  return mergeOf(readers)
}
