/**
 * What a mod can hand the playtesting cheat menu, without core learning what it grants.
 *
 * A grant is the unit rather than a finished button, because core composes it twice: once as its own
 * entry, and once inside "Unlock everything", which is just every registered grant run in turn — so
 * a mod that adds one is in that button for free, and core never holds the list of what "everything"
 * means. `label` is the mod's own wording; core only renders it.
 *
 * A contribution is a HOOK, like the other seams, so it can read the mod's own state and call the
 * same public APIs real gameplay does (`addTombKey`, `collectMapPiece`, `addFragment`). That is what
 * keeps a granted world indistinguishable from an earned one — see `useDevActions`. Same seam shape
 * as `perkContributions.ts`.
 */
export type DevGrant = { label: string; grant: () => void }

export type UseDevGrants = () => readonly DevGrant[]

const registry: UseDevGrants[] = []

export const registerDevGrants = (useGrants: UseDevGrants) => registry.push(useGrants)

// Calls each provider hook in a fixed order (the registry is populated once at module load — each
// mod's app entrypoint pushes exactly once — so the hooks run in the same order every render,
// rules-of-hooks safe) and concatenates them. Order across mods follows `registerModApps`; the
// grants are independent of one another, so only a mod's own internal order carries meaning.
//
// Unmemoized, unlike the merged perk seams next door: those feed render paths, this one feeds four
// buttons behind a develop-mode tap. Memoizing it would need a computed dependency list, which is
// what makes `useMergedEarnedPerks` carry a `react-hooks/use-memo` warning — not worth inheriting
// for a menu that costs four object literals a render.
export const useMergedDevGrants = (): readonly DevGrant[] => {
  const lists: (readonly DevGrant[])[] = []
  for (const useGrants of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    lists.push(useGrants())
  }
  return lists.flat()
}
