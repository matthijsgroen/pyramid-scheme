import type { FC, PropsWithChildren } from "react"
import masonry from "@/assets/masonry.png"
import clsx from "clsx"

export const TombBackdrop: FC<
  PropsWithChildren<{ className?: string; zoom?: boolean; fade?: boolean }>
> = ({ children, className, zoom, fade }) => {
  return (
    <div
      className={clsx(
        " bg-yellow-800 transition-transform duration-1000 ease-in-out",
        zoom ? "scale-200" : "scale-100",
        fade ? "opacity-0" : "opacity-100",
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
