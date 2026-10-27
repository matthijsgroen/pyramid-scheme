import { webMarkFor } from "@/game/mark"
import type { LeverTiles, RewardArt } from "@/app/SiteMap/rewardHandlerRegistry"
import type { WebActivatorShape } from "@/mods/topology/game/web/activator"

// HOW A WEB ACTIVATOR STANDS IN ITS ROOM (docs/instructions/sand-pyramid.md, "The look"): the sand lever is mechanism
// art, drawn in the floor's mechanism style (MECHANISM_STYLE) and shared by default; the web key is a prop. Neither is
// painted yet (docs/instructions/art-tasks.md, "The sand web"), so each names the floor's own art to draw until it is:
// the lever's three pieces, and the chest.

/** The floor lever's pieces (src/mods/topology/game/handle/meta.ts): what a sand lever is NOT. */
export const FLOOR_LEVER_TILES: LeverTiles = { back: "leverBaseBack", arm: "leverArm", front: "leverBaseFront" }

/** The sand lever's own pieces: a heavy stone post with a sun-disc head and a channel of sand at its base. */
export const SAND_LEVER_TILES: LeverTiles = { back: "sandLeverBack", arm: "sandLeverArm", front: "sandLeverFront" }

/** The web key's own prop, and the chest it stands in as until it is painted. */
export const WEB_KEY_TILE = "webKey"
const KEY_STAND_IN = "chestProp"

/** The tile keys owed: those a painting has not replaced yet, which `art-tasks.md` lists. */
export const owedWebTiles = (isPainted: (tile: string) => boolean): string[] =>
  [...Object.values(SAND_LEVER_TILES), WEB_KEY_TILE].filter(tile => !isPainted(tile))

/** A lever wears the mark of the pot it counts in, a key the mark its door asks for: the glyph its web handed it. */
export const webActivatorArt = ({
  name,
  look,
  pots,
  glyph,
}: Pick<WebActivatorShape, "name" | "look" | "pots" | "glyph">): RewardArt => {
  const worn = look === "lever" ? (pots[0] ?? name) : name
  const mark = webMarkFor(worn, glyph !== undefined ? { [worn]: glyph } : undefined)
  return look === "lever"
    ? { kind: "lever", tiles: SAND_LEVER_TILES, stand: FLOOR_LEVER_TILES, mark }
    : { kind: "prop", tile: WEB_KEY_TILE, stand: KEY_STAND_IN, mark }
}
