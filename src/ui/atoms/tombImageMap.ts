import starterWall from "@/assets/tombWall/starter.webp"
import juniorWall from "@/assets/tombWall/junior.webp"
import expertWall from "@/assets/tombWall/expert.webp"
import masterWall from "@/assets/tombWall/master.webp"
import wizardWall from "@/assets/tombWall/wizard.webp"
import caveWall from "@/assets/tombWall/cave.webp"
import type { Tileset } from "@/game/siteTypes"

// The sphinx panel is not painted yet, so it is read by an eager glob and a tileset with no file paints no wall; once
// painted it becomes a plain import like the others.
const panels = import.meta.glob("@/assets/tombWall/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>
const painted: Partial<Record<Tileset, string>> = {}
for (const [path, url] of Object.entries(panels)) {
  const name = /\/([^/]+)\.webp$/.exec(path)?.[1]
  if (name === "sphinx") painted.sphinx = url
}

/**
 * The wall a tomb puzzle is set against, one per tileset (each rank, and the cave), so a board wears the stone of the place it was
 * found in: behind the tableau (TombBackdrop), the passage door (TombDoor) and every encounter
 * (EncounterModal). Each is a SQUARE panel of one whole wall — ceiling ledge on top, the rank's brick,
 * a dark base — laid with `cover` (WALL_SIZE below), so it is never tiled: a portrait screen shows its
 * middle at full height, a landscape one its full width with the ledge and base cropped.
 *
 * `color` and `gradient` are what shows where the art does not reach, so they are the rank's own wall
 * hexes — `wallBase` and `wall`. `behind` is what the opened passage reveals, the near-black each rank
 * is outlined in, because a warm brown void behind the gods' calcite reads as a different tomb. All
 * three come from `tierPalette` in src/app/SiteMap/tileMaterials.ts.
 */
export const imageMap: Record<Tileset, { color: string; gradient: string; behind: string; image?: string }> = {
  starter: {
    image: starterWall,
    behind: "bg-[#15110c]",
    color: "bg-[#3d2e20]",
    gradient: "bg-gradient-to-t from-[#3d2e20] from-50% to-[#b49d74] to-100%",
  },
  junior: {
    image: juniorWall,
    behind: "bg-[#241708]",
    color: "bg-[#4a3520]",
    gradient: "bg-gradient-to-t from-[#4a3520] from-50% to-[#8f6a3f] to-100%",
  },
  expert: {
    image: expertWall,
    behind: "bg-[#171c22]",
    color: "bg-[#323a46]",
    gradient: "bg-gradient-to-t from-[#323a46] from-50% to-[#5b6675] to-100%",
  },
  master: {
    image: masterWall,
    behind: "bg-[#141210]",
    color: "bg-[#201d19]",
    gradient: "bg-gradient-to-t from-[#201d19] from-50% to-[#3a3630] to-100%",
  },
  wizard: {
    image: wizardWall,
    behind: "bg-[#0f231d]",
    color: "bg-[#1d3830]",
    gradient: "bg-gradient-to-t from-[#1d3830] from-50% to-[#3a6155] to-100%",
  },
  // No rank's tomb: the cave's own rock, met behind the boards a cave holds.
  cave: {
    image: caveWall,
    behind: "bg-[#120f0c]",
    color: "bg-[#1f1b16]",
    gradient: "bg-gradient-to-t from-[#1f1b16] from-50% to-[#41392f] to-100%",
  },
  // The Sphinx's inscription wall. Its panel arrives with `yarn import-panel`; until then there is no
  // `image` and the card colour shows.
  sphinx: {
    image: painted.sphinx,
    behind: "bg-[#2a2117]",
    color: "bg-[#5e4c36]",
    gradient: "bg-gradient-to-t from-[#5e4c36] from-50% to-[#d8c49c] to-100%",
  },
}

/**
 * `cover`, because each of these is ONE whole wall — ceiling ledge at the top, what little the rank hangs
 * on it, a dark base at the floor — drawn square to sit behind a tableau. The tableau opens a secret
 * passage through this wall when it is solved, so it has to read as a single face top to bottom; a strip
 * repeated down the panel reads as courses of separate walls, and a strip scaled to the panel is one
 * wall at four times the scale it was painted for.
 */
export const WALL_SIZE = "cover"
