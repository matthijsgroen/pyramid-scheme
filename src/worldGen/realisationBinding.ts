import type { RealisationBinding } from "../game/lockCompile"
import { isRegionGate, type Obstacle } from "../game/obstacles"
import { REGION_BARRIER_KIND } from "../game/regionBarrierRealisation"

/** What one level of authoring may say about realisations: a binding, and the one-way's older single-name spelling. */
export type BindingDeclaration = { realisations?: RealisationBinding; oneWayRealisation?: string }

/** The one-way kind, whose realisation the single-name `oneWayRealisation` spelling states. */
export const ONE_WAY_KIND = "one-way"

/** One level's declaration as a binding. The single-name spelling is the "one-way" entry; saying both differently is refused. */
export const declaredBinding = (level: BindingDeclaration): RealisationBinding => {
  const named = level.realisations?.[ONE_WAY_KIND]
  if (level.oneWayRealisation !== undefined && named !== undefined && named !== level.oneWayRealisation)
    throw new Error(
      `[worldSpec] one level binds the one-way to "${level.oneWayRealisation}" (oneWayRealisation) and to "${named}" (realisations)`
    )
  return {
    ...(level.oneWayRealisation === undefined ? {} : { [ONE_WAY_KIND]: level.oneWayRealisation }),
    ...level.realisations,
  }
}

/** The binding the levels resolve to, given least specific first: per kind, the most specific level that names it wins. */
export const resolveBinding = (levels: readonly BindingDeclaration[]): RealisationBinding =>
  Object.assign({}, ...levels.map(declaredBinding))

/** A resolved constraint carries the resolved binding as `realisations` alone; the single-name spelling is folded into it. */
export const withResolvedBinding = <T extends BindingDeclaration>(constraint: T, binding: RealisationBinding): T => {
  const { oneWayRealisation: _folded, realisations: _replaced, ...rest } = constraint
  return { ...rest, ...(Object.keys(binding).length > 0 ? { realisations: binding } : {}) } as T
}

/** What a floor with no locks carries as `regionBarrierRealisation`: the binding's entry, and only where a region is barred. */
export const regionBarrierBinding = (
  obstacles: readonly Obstacle[] | undefined,
  binding: RealisationBinding
): string | undefined => (obstacles?.some(isRegionGate) ? binding[REGION_BARRIER_KIND] : undefined)
