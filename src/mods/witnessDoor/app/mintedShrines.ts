import { useCallback, useMemo } from "react"
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

/** How a shrine the light has reached hands its key to the gates that ask for it. */
export const useMintShrine = (): ((keyId: string) => void) => {
  const [state, setState] = useModState<MintedShrines>(MOD_ID, INITIAL)
  // The store's cache as well as the hook's own copy, which lands a beat after mount — the guard below
  // runs on the first render, which is the one where that copy is still empty.
  const minted = useMemo(() => new Set([...state.minted, ...mintedShrineKeys()]), [state.minted])
  const mint = useCallback(
    (keyId: string) => {
      // A board is re-mounted every time its room is opened, and one that opens already lit mints on
      // sight. Without this the write, the announcement and the re-render it causes all still happen,
      // and that cycle ends only because `mint` happens to keep its identity across them.
      if (minted.has(keyId)) return
      // The screen is told only once the write has landed in the store, which is what the key source
      // below reads — announced any earlier, the gate would re-read the slice without the new key in it.
      void setState(prev => (prev.minted.includes(keyId) ? prev : { minted: [...prev.minted, keyId] }))
        .then(ownedKeysChanged)
        .catch(() => {})
    },
    [minted, setState]
  )
  return mint
}

/** The same slice, read outside React — what the owned-key source answers with. */
export const mintedShrineKeys = (): ReadonlySet<string> =>
  new Set(readModState<MintedShrines>(MOD_ID)?.minted ?? INITIAL.minted)

/** Loads it, so a floor entered before any witness door has been opened this session still sees its keys. */
export const loadMintedShrines = (): void => {
  void primeModState<MintedShrines>(MOD_ID).then(ownedKeysChanged)
}
