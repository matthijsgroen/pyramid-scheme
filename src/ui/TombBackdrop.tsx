import type { FC, PropsWithChildren } from "react"
import masonry from "@/assets/masonry.png"
import masonryStone from "@/assets/masonry-stone.png"
import masonryClean from "@/assets/masonry-clean.png"
import masonryDetailed from "@/assets/masonry-detailed.png"
import masonryEmerald from "@/assets/masonry-emerald.png"
import clsx from "clsx"
import type { Difficulty } from "@/data/difficultyLevels"

export const TombBackdrop: FC<
  PropsWithChildren<{
    className?: string
    zoom?: boolean
    fade?: boolean
    difficulty?: Difficulty
    scale?: "large" | "small"
  }>
> = ({ children, className, difficulty = "starter", zoom = false, fade = false, scale = "large" }) => {
  const imageMap: Record<Difficulty, { color: string; gradient: string; image: string }> = {
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
      color: "bg-yellow-600",
      gradient: "bg-gradient-to-t from-yellow-800 from-50% to-yellow-600 to-100%",
    },
    wizard: {
      image: masonryEmerald,
      color: "bg-emerald-800",
      gradient: "bg-gradient-to-t from-emerald-950 from-50% to-emerald-800 to-100%",
    },
  }
  const settings = imageMap[difficulty]
  const color = settings.color
  const gradient = settings.gradient

  return (
    <div
      className={clsx(
        scale === "large" ? color : gradient,
        "transition-all ease-in-out",
        zoom ? "scale-200 duration-1000" : "scale-100 duration-0",
        fade ? "opacity-0 duration-1000" : "opacity-100 duration-500",
        className
      )}
      style={{
        backgroundImage:
          scale === "large"
            ? `url(${settings.image})`
            : `url(${settings.image}), linear-gradient(var(--tw-gradient-stops))`,
        backgroundSize: scale === "large" ? "140px 140px" : "40px 40px, 100% 100%",
        backgroundPosition: "bottom center",
        backgroundAttachment: "fixed",
      }}
    >
      {children}
    </div>
  )
}
