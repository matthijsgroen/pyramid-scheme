import { useMemo } from "react"

// How a mod contributes the persistent keys the player already holds (e.g. the tomb-treasure
// mod's ward keys) to the site-map runtime's gate-satisfaction read, without the runtime naming
// the mod. A provider is a HOOK (so it can read the mod's own state, e.g. useTombTreasureProgress)
// returning the set of key ids currently held. SiteMapScreen unions every provider with the
// floor-local keys read off the grid. Same seam shape as detectorScanners/rewardContributions —
// see docs/mods/app-plugins-design.md.
export type UseHeldKeys = () => ReadonlySet<string>

const registry: UseHeldKeys[] = []

export const registerHeldKeysProvider = (useKeys: UseHeldKeys) => registry.push(useKeys)

// Calls each provider hook in a fixed order (the registry is populated once at module load — each
// mod's app entrypoint pushes exactly once — so the hooks run in the same order every render,
// rules-of-hooks safe) and unions them into one set of held key ids.
// How a mod says what one of its keys LOOKS like — the sign a locked door carries, so a ward gate
// can show which key opens it without core knowing that a key id is a tomb treasure. Same
// hook-shaped seam as the held-keys providers above; a provider returns undefined for any key it
// doesn't own, and the merged lookup takes the first owner's answer.
export type KeyDisplay = { symbol: string }
export type UseKeyDisplay = () => (keyId: string) => KeyDisplay | undefined

const displayRegistry: UseKeyDisplay[] = []

export const registerKeyDisplay = (useDisplay: UseKeyDisplay) => displayRegistry.push(useDisplay)

export const useMergedKeyDisplay = (): ((keyId: string) => KeyDisplay | undefined) => {
  const lookups: ((keyId: string) => KeyDisplay | undefined)[] = []
  for (const useDisplay of displayRegistry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    lookups.push(useDisplay())
  }
  return keyId => {
    for (const lookup of lookups) {
      const display = lookup(keyId)
      if (display) return display
    }
    return undefined
  }
}

export const useMergedHeldKeys = (): ReadonlySet<string> => {
  const sets: ReadonlySet<string>[] = []
  for (const useKeys of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    sets.push(useKeys())
  }
  return useMemo(
    () => new Set(sets.flatMap(s => [...s])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fixed-length list of stable sets
    sets
  )
}
