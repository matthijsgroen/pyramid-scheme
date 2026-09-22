export type OwnedKeySourceCtx = { journeyId: string; levelNr: number; floorIndex: number }
export type OwnedKeySource = (ctx: OwnedKeySourceCtx) => ReadonlySet<string>

// Keys a MOD mints — a family that hands one out on solve, rather than a chest the grid already
// holds or a ward key in the inventory. Core reads the union and names no mod; a source drops when
// its mod leaves REGISTERED_MODS, and with none registered this is empty.
const sources = new Map<string, OwnedKeySource>()

export const registerOwnedKeySource = (id: string, source: OwnedKeySource): void => {
  sources.set(id, source)
}

export const ownedKeysFromSources = (ctx: OwnedKeySourceCtx): ReadonlySet<string> => {
  const keys = new Set<string>()
  for (const source of sources.values()) for (const key of source(ctx)) keys.add(key)
  return keys
}

/** Test seam only — the registry is a module singleton, so a spec must be able to clear it. */
export const __resetOwnedKeySources = (): void => sources.clear()
