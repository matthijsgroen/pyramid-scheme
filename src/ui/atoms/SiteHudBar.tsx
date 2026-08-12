import type { FC, PropsWithChildren } from "react"

// Full-bleed (left-0 right-0) so its children stay centred over the map — which means the bar's own
// box is a transparent band spanning the whole screen width. It must not hit-test, or it swallows
// every map tap in that band (the band grows taller when a detector mode adds result rows). Each
// real child opts back in with `pointer-events-auto`; they're all content-sized, so nothing dead is
// reintroduced.
export const SiteHudBar: FC<PropsWithChildren> = ({ children }) => (
  <div className="pointer-events-none absolute inset-x-0 bottom-safe-bottom z-10 mb-4 flex flex-col items-center justify-center gap-2">
    {children}
  </div>
)
