// What a mod hands the dev cheat menu. A grant, not a button: core renders it and also runs every
// one of them for "Unlock everything", so it never holds the list of what everything means.
export type DevGrant = {
  label: string
  grant: () => void
  /** False for a grant that only plays something to look at; "Unlock everything" skips it. */
  inUnlockEverything?: boolean
}

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

// What a mod hands the dev menu to stand the explorer somewhere. Never part of "Unlock everything": a
// jump resolves once the save says where the explorer is, and the menu then opens the expedition.
export type DevJump = { label: string; jump: () => Promise<unknown> }

export type UseDevJumps = () => readonly DevJump[]

const jumpRegistry: UseDevJumps[] = []

export const registerDevJumps = (useJumps: UseDevJumps) => jumpRegistry.push(useJumps)

export const useMergedDevJumps = (): readonly DevJump[] => {
  const lists: (readonly DevJump[])[] = []
  for (const useJumps of jumpRegistry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- fixed registry order, set once at module load
    lists.push(useJumps())
  }
  return lists.flat()
}
