import starterWall from "@/assets/tombWall/starter.webp"
import juniorWall from "@/assets/tombWall/junior.webp"
import expertWall from "@/assets/tombWall/expert.webp"
import masterWall from "@/assets/tombWall/master.webp"
import wizardWall from "@/assets/tombWall/wizard.webp"
import type { Difficulty } from "@/data/difficultyLevels"

/**
 * The wall a tomb puzzle is set against, one per rank, so a board wears the stone of the tomb it was
 * found in. Same art as the site map's chamber walls and the same source generation — but at the shape
 * it was DRAWN in, 8.33:1, where the map squashes it into a band half a cell tall.
 *
 * That shape is why neither consumer sizes it in pixels. A wall is a strip with a cap along its top, one
 * register of content and a dark base, so it is laid by WIDTH and repeats down the panel as courses; a
 * square tile size squeezes eight metres of wall into a thumbnail.
 *
 * `color` and `gradient` are what shows where the art does not reach, so they are the rank's own wall
 * hexes — `wallBase` and `wall`. `behind` is what the opened passage reveals, the near-black each rank
 * is outlined in, because a warm brown void behind the gods' calcite reads as a different tomb. All
 * three come from `tierPalette` in src/app/SiteMap/tileMaterials.ts.
 */
export const imageMap: Record<Difficulty, { color: string; gradient: string; behind: string; image: string }> = {
  starter: {
    image: starterWall,
    behind: "bg-[#15110c]",
    color: "bg-[#2b261f]",
    gradient: "bg-gradient-to-t from-[#2b261f] from-50% to-[#4a4137] to-100%",
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
}

/**
 * `cover`, because each of these is ONE whole wall — ceiling ledge at the top, what little the rank hangs
 * on it, a dark base at the floor — drawn square to sit behind a tableau. The tableau opens a secret
 * passage through this wall when it is solved, so it has to read as a single face top to bottom; a strip
 * repeated down the panel reads as courses of separate walls, and a strip scaled to the panel is one
 * wall at four times the scale it was painted for.
 */
export const WALL_SIZE = "cover"
