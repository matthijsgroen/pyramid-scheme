import type { FC, PropsWithChildren } from "react"
import masonry from "@/assets/masonry.png"

export const TombBackdrop: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div
      className={
        "[container-type:size] relative flex h-dvh flex-col bg-yellow-800"
      }
      style={{
        backgroundImage: `url(${masonry})`,
        backgroundSize: "140px 140px",
        backgroundPosition: "0 0, 0 0, 0 0",
      }}
    >
      {children}
    </div>
  )
}
