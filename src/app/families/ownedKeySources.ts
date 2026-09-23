export type OwnedKeySourceCtx = { journeyId: string; levelNr: number; floorIndex: number }
export type OwnedKeySource = (ctx: OwnedKeySourceCtx) => ReadonlySet<string>

// Keys a MOD mints — a family that hands one out on solve, rather than a chest the grid already
// holds or a ward key in the inventory. Core reads the union and names no mod; a source drops when
// its mod leaves REGISTERED_MODS, and with none registered this is empty.
const sources = new Map<string, OwnedKeySource>()

const listeners = new Set<() => void>()
let revision = 0

/**
 * Says that a source would now answer differently — a key was minted this floor, or a mod's stored state
 * finished loading.
 *
 * A source is a plain function over its mod's own state, so nothing a screen can depend on changes when
 * that state does. This is what a screen watches instead (see `subscribeOwnedKeys`), and a mod that never
 * calls it leaves its keys unseen until the screen re-reads them for some other reason.
 */
export const ownedKeysChanged = (): void => {
  revision += 1
  for (const listener of listeners) listener()
}

export const subscribeOwnedKeys = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Bumped by every change above — a `useSyncExternalStore` snapshot, so it is a value and not a set. */
export const ownedKeysRevision = (): number => revision

export const registerOwnedKeySource = (id: string, source: OwnedKeySource): void => {
  sources.set(id, source)
  ownedKeysChanged()
}

export const ownedKeysFromSources = (ctx: OwnedKeySourceCtx): ReadonlySet<string> => {
  const keys = new Set<string>()
  for (const source of sources.values()) for (const key of source(ctx)) keys.add(key)
  return keys
}

/** Test seam only — the registry is a module singleton, so a spec must be able to clear it. */
export const __resetOwnedKeySources = (): void => {
  sources.clear()
  ownedKeysChanged()
}
