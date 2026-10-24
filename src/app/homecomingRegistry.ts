// Coming home: the player is back at base, either because a journey ended or because they left it.
// Mods own what happens then; core only says when. A contribution is a HOOK (so it can read the
// mod's own state) returning the handler to run. The registry is filled once at module load, so the
// hooks run in the same order every render (rules-of-hooks safe), like rewardContributions.ts.
export type UseHomecoming = () => () => void

const registry: UseHomecoming[] = []

export const registerHomecoming = (useContribution: UseHomecoming) => registry.push(useContribution)

// Runs every handler once, in registration order. No handlers is a no-op.
export const mergeHomecomings =
  (handlers: readonly (() => void)[]): (() => void) =>
  () => {
    for (const handler of handlers) handler()
  }

export const useHomecoming = (): (() => void) => {
  const handlers: (() => void)[] = []
  for (const useContribution of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    handlers.push(useContribution())
  }
  return mergeHomecomings(handlers)
}
