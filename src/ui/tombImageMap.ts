import masonry from "@/assets/masonry.png"
import masonryStone from "@/assets/masonry-stone.png"
import masonryClean from "@/assets/masonry-clean.png"
import masonryDetailed from "@/assets/masonry-detailed.png"
import masonryEmerald from "@/assets/masonry-emerald.png"
import type { Difficulty } from "@/data/difficultyLevels"

export const imageMap: Record<Difficulty, { color: string; gradient: string; image: string }> = {
  starter: {
    image: masonryStone,
    color: "bg-yellow-800",
    gradient: "bg-gradient-to-t from-yellow-900 from-50% to-yellow-800 to-100%",
  },
  junior: {
    image: masonry,
    color: "bg-yellow-800",
    gradient: "bg-gradient-to-t from-yellow-900 from-50% to-yellow-800 to-100%",
  },
  expert: {
    image: masonryClean,
    color: "bg-yellow-800",
    gradient: "bg-gradient-to-t from-yellow-900 from-50% to-yellow-800 to-100%",
  },
  master: {
    image: masonryDetailed,
    color: "bg-yellow-700",
    gradient: "bg-gradient-to-t from-yellow-800 from-50% to-yellow-600 to-100%",
  },
  wizard: {
    image: masonryEmerald,
    color: "bg-emerald-800",
    gradient: "bg-gradient-to-t from-emerald-950 from-50% to-emerald-800 to-100%",
  },
}
