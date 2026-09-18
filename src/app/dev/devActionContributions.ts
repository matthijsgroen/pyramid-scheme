// What a mod hands the dev cheat menu. A grant, not a button: core renders it and also runs every
// one of them for "Unlock everything", so it never holds the list of what everything means.
export type DevGrant = { label: string; grant: () => void }

export type UseDevGrants = () => readonly DevGrant[]

const registry: UseDevGrants[] = []

export const registerDevGrants = (useGrants: UseDevGrants) => registry.push(useGrants)

export const useMergedDevGrants = (): readonly DevGrant[] => {
  const lists: (readonly DevGrant[])[] = []
  for (const useGrants of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed registry order, set once at module load
    lists.push(useGrants())
  }
  return lists.flat()
}
