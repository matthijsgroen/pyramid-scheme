/* eslint-disable react-refresh/only-export-components -- side-effect registration file */
import { registerFamily, type FamilyPlugin } from "@/app/families/familyRegistry"
import { registerOwnedKeySource } from "@/app/families/ownedKeySources"
import { decodeEdge } from "@/app/SiteMap/edgeId"
import { isModEnabled } from "@/mods/registeredMods"
import { generateWitnessDoor, type WitnessBoard } from "../game/generateWitnessDoor"
import { WITNESS_DOOR_META } from "../game/meta"
import { witnessSite } from "../game/witnessKeys"
import { loadMintedShrines, mintedShrineKeys, useMintedShrines } from "./mintedShrines"
import { WitnessDoorPuzzle } from "./WitnessDoorPuzzle"

const WitnessDoorComponent: FamilyPlugin<WitnessBoard>["Component"] = ({ puzzle, ctx, onSolved, onCancel }) => {
  const { minted, mint } = useMintedShrines()
  return (
    <WitnessDoorPuzzle
      board={puzzle}
      // Which door this is: the journey, the level whose site it belongs to, and the floor it stands on,
      // read off the coordinate the room was opened at.
      site={witnessSite(ctx.journeyId, ctx.levelNr, decodeEdge(ctx.edgeId)[0])}
      minted={minted}
      onSolved={onSolved}
      onCancel={onCancel}
      onMint={mint}
    />
  )
}

if (isModEnabled("witnessDoor")) {
  registerFamily({
    meta: WITNESS_DOOR_META,
    // A room outside the baked world (a story, the builder) carries no tier; the family's own floor is
    // what it opens at. No seed list: a board is a few milliseconds to search, so there is nothing to bake.
    generate: (seed, ctx): WitnessBoard =>
      generateWitnessDoor(seed, ctx.difficulty ?? WITNESS_DOOR_META.minTier ?? "starter"),
    Component: WitnessDoorComponent,
  })
  // Every shrine this player has opened. The ids name their own door, so the floor is not filtered on
  // here: a gate elsewhere asks for a different id and is unmoved by these.
  registerOwnedKeySource("witnessDoor", mintedShrineKeys)
  loadMintedShrines()
}
