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

/** The keys minted so far, and how a shrine the light has reached adds to them. */
export const useMintedShrines = (): { minted: ReadonlySet<string>; mint: (keyId: string) => void } => {
  const [state, setState] = useModState<MintedShrines>(MOD_ID, INITIAL)
  // The hook's own copy of the slice lands a beat after mount, and the store's cache is already right.
  // A board that asked one render too early would offer a choice this door has already made.
  const minted = useMemo(() => new Set([...state.minted, ...mintedShrineKeys()]), [state.minted])
  const mint = useCallback(
    (keyId: string) => {
      // A board is re-mounted every time its room is opened, and a solved one mints again on sight.
      // Without this the write, the announcement and the re-render it causes all still happen, and
      // that cycle ends only because `mint` happens to keep its identity across them.
      if (minted.has(keyId)) return
      // The screen is told only once the write has landed in the store, which is what the key source
      // below reads — announced any earlier, the gate would re-read the slice without the new key in it.
      void setState(prev => (prev.minted.includes(keyId) ? prev : { minted: [...prev.minted, keyId] }))
        .then(ownedKeysChanged)
        .catch(() => {})
    },
    [minted, setState]
  )
  return { minted, mint }
}

/** The same slice, read outside React — what the owned-key source answers with. */
export const mintedShrineKeys = (): ReadonlySet<string> =>
  new Set(readModState<MintedShrines>(MOD_ID)?.minted ?? INITIAL.minted)

/** Loads it, so a floor entered before any witness door has been opened this session still sees its keys. */
export const loadMintedShrines = (): void => {
  void primeModState<MintedShrines>(MOD_ID).then(ownedKeysChanged)
}
