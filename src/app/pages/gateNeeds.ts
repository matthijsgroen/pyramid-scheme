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

export type UseGateNeeds = () => (gate: Gate) => readonly GateNeed[]

const registry: UseGateNeeds[] = []

export const registerGateNeeds = (useNeeds: UseGateNeeds) => registry.push(useNeeds)

export type MergedGateNeeds = {
  needs: (gate: Gate) => readonly GateNeed[]
  unmet: (gate: Gate, held: ReadonlySet<string>) => readonly GateNeed[]
  open: (gate: Gate, held: ReadonlySet<string>) => boolean
}

// No registered hook means no need, so every gate is open.
export const useMergedGateNeeds = (): MergedGateNeeds => {
  const resolved: ((gate: Gate) => readonly GateNeed[])[] = []
  for (const useNeeds of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    resolved.push(useNeeds())
  }
  const needs = (gate: Gate) => resolved.flatMap(read => read(gate))
  const unmet = (gate: Gate, held: ReadonlySet<string>) => needs(gate).filter(need => !held.has(need.key))
  return { needs, unmet, open: (gate, held) => unmet(gate, held).length === 0 }
}
