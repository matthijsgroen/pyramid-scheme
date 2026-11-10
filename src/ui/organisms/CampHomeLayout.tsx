import type { CSSProperties, FC, ReactNode, Ref } from "react"

/** From `lg`, the width of the panel standing over the scene's right side. */
export const CAMP_PANEL_WIDTH = 440

export type CampHomeLayoutProps = {
  hud: ReactNode
  scene: ReactNode
  /** On the scene's box, so the app can measure it. */
  sceneRef: Ref<HTMLDivElement>
  card: ReactNode
  /** Desktop only: the panel under the card (journeys list). */
  aside?: ReactNode
  /** Hides the card and the panel around it, keeping their place: the scene does not move. */
  quiet?: boolean
  /** Desktop only: the panel grows a little and brightens, pointing the player to it. */
  pressed?: boolean
  /** A notice floating at the top of the scene, under the HUD and over a conversation. */
  notice?: ReactNode
  /** Phone only: the HUD's height, which the notice stands below. */
  hudHeight?: number
}

// The panel eases in fast and back slower; with reduced motion it only brightens.
const RELEASED = "lg:transition-[scale,filter] lg:duration-250 lg:ease-out"
const PRESSED =
  "lg:transition-[scale,filter] lg:duration-150 lg:ease-out lg:scale-102 lg:brightness-115 lg:motion-reduce:scale-100"

// The camp's frame. Phone: the scene fills the screen, the HUD floats over its sky and the card floats at
// its bottom. From `lg`: the HUD spans the top, the scene fills the rest and the card and aside stand in a
// see-through panel over its right side, clear of the edges.
export const CampHomeLayout: FC<CampHomeLayoutProps> = ({
  hud,
  scene,
  sceneRef,
  card,
  aside,
  quiet = false,
  pressed = false,
  notice,
  hudHeight = 0,
}) => (
  <div className="relative h-(--screen-height) overflow-hidden bg-camp-night lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:grid-rows-[auto_minmax(0,1fr)]">
    <div className="absolute inset-x-0 top-0 z-10 pt-safe-top lg:static lg:col-span-2 lg:bg-camp-night lg:pt-safe-top">
      {hud}
    </div>
    <div ref={sceneRef} className="absolute inset-0 lg:static lg:col-span-2 lg:col-start-1 lg:row-start-2">
      {scene}
    </div>
    <div
      className={`absolute inset-x-0 bottom-0 z-10 flex flex-col gap-3.5 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:col-start-2 lg:row-start-2 lg:m-4 lg:ml-0 lg:min-h-0 lg:overflow-auto lg:rounded-[14px] lg:border lg:border-camp-glass-edge lg:bg-camp-glass-solid lg:p-6 lg:text-camp-ink lg:supports-backdrop-filter:bg-camp-glass lg:supports-backdrop-filter:backdrop-blur-lg lg:supports-backdrop-filter:backdrop-saturate-160 ${quiet ? "invisible" : ""} ${pressed ? PRESSED : RELEASED}`}
      data-pressed={pressed || undefined}
    >
      {card}
      {aside && <div className="hidden min-h-0 flex-1 flex-col lg:flex">{aside}</div>}
    </div>
    {notice && (
      // Over a conversation (z-35), which it is shown beside, and under the popups at z-40.
      <div
        className="pointer-events-none absolute inset-x-0 top-[calc(var(--hud-height)+env(safe-area-inset-top)+0.75rem)] z-36 flex justify-center px-4 lg:top-4 lg:col-start-1 lg:row-start-2"
        style={{ "--hud-height": `${hudHeight}px` } as CSSProperties}
      >
        <div className="pointer-events-auto">{notice}</div>
      </div>
    )}
  </div>
)
