import type { FC, PropsWithChildren } from "react"
import clsx from "clsx"
import type { Difficulty } from "@/data/difficultyLevels"
import { imageMap } from "./tombImageMap"

export const TombBackdrop: FC<
  PropsWithChildren<{
    className?: string
    zoom?: boolean
    fade?: boolean
    difficulty?: Difficulty
    scale?: "large" | "small"
  }>
> = ({ children, className, difficulty = "starter", zoom = false, fade = false, scale = "large" }) => {
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
