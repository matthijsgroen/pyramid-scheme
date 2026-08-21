import type { ModDescriptor } from "../modDescriptor"
import { SUMPLETE_META } from "./game/sumplete/meta"
import { BALANCE_META } from "./game/balanceScale/meta"
import { FUTOSHIKI_META } from "./game/futoshiki/meta"
import { LIGHTBEAM_META } from "./game/lightbeam/meta"
import { CROCODILE_META } from "./game/crocodile/meta"
import { ECLIPSE_META } from "./game/eclipse/meta"
import { CONSTELLATION_META } from "./game/constellation/meta"

// The puzzle mod descriptor. Owns the general math-puzzle families (sumplete, balance-scale,
// futoshiki, lightbeam, eclipse, constellation) and the crocodile capstone. A root mod: it stays on in production (turning it off leaves
// puzzle/capstone rooms with no family, so they only auto-resolve via the family-absence pass-through
// — a degenerate world, not a playable one). It is a real REGISTERED_MODS entry anyway so its family
// metadata flows through MOD_FAMILY_META like every other mod's — adding a new puzzle family is then a
// pure plugin, with no edit to core's family list. Toggle-off is the isolation TEST (no core residue),
// not a shipping mode.
//
// This list IS the world switch: a family here enters the gen-time encounter pool for its tag at or
// above its minTier, and the world file is regenerated with the ids it allocates. A family left out
// is playable in the puzzle lab and nowhere else.
//
// Game-side only (no React). The puzzle room Components register via the puzzle app entrypoint
// (src/mods/puzzle/app, pulled in by registerModApps), each gated on this mod being enabled.
export const puzzleMod: ModDescriptor = {
  id: "puzzle",
  families: [
    SUMPLETE_META,
    BALANCE_META,
    FUTOSHIKI_META,
    LIGHTBEAM_META,
    ECLIPSE_META,
    CONSTELLATION_META,
    CROCODILE_META,
  ],
}
