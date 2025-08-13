import type { FC, PropsWithChildren } from "react"
import masonry from "@/assets/masonry.png"
import clsx from "clsx"

export const TombBackdrop: FC<
  PropsWithChildren<{ className?: string; zoom?: boolean; fade?: boolean }>
> = ({ children, className, zoom = false, fade = false }) => {
  return (
    <div
      className={clsx(
        " bg-yellow-800 transition-all ease-in-out",
        zoom ? "scale-200 duration-1000" : "scale-100 duration-0",
        fade ? "opacity-0 duration-1000" : "opacity-100 duration-500",
        className
      )}
      style={{
        backgroundImage: `url(${masonry})`,
        backgroundSize: "140px 140px",
        backgroundPosition: "bottom center",
        backgroundAttachment: "fixed",
      }}
    >
      {children}
    </div>
  )
}
