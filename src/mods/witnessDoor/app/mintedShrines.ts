import { useCallback } from "react"
import { ownedKeysChanged } from "@/app/families/ownedKeySources"
import { primeModState, readModState, useModState } from "@/app/state/useModState"

/**
 * The shrines this player has opened, as the key ids they minted.
 *
 * Kept as ids rather than as shrines per site because an id already names its own site (see
 * witnessKeyId), and an id is what a gate asks for.
 */
type MintedShrines = { minted: string[] }

const MOD_ID = "witnessDoor"
const INITIAL: MintedShrines = { minted: [] }

/** Hands the key of a shrine the light has reached to the gates that ask for it. */
export const useMintShrine = (): ((keyId: string) => void) => {
  const [, setState] = useModState<MintedShrines>(MOD_ID, INITIAL)
  return useCallback(
    (keyId: string) => {
      // The screen is told only once the write has landed in the store, which is what the key source
      // below reads — announced any earlier, the gate would re-read the slice without the new key in it.
      void setState(prev => (prev.minted.includes(keyId) ? prev : { minted: [...prev.minted, keyId] }))
        .then(ownedKeysChanged)
        .catch(() => {})
    },
    [setState]
  )
}

/** The same slice, read outside React — what the owned-key source answers with. */
export const mintedShrineKeys = (): ReadonlySet<string> =>
  new Set(readModState<MintedShrines>(MOD_ID)?.minted ?? INITIAL.minted)

/** Loads it, so a floor entered before any witness door has been opened this session still sees its keys. */
export const loadMintedShrines = (): void => {
  void primeModState<MintedShrines>(MOD_ID).then(ownedKeysChanged)
}
