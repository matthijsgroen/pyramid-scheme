import type { CSSProperties, ReactElement } from "react"
import clsx from "clsx"
import formulaPanel from "@/assets/reading/formulaPanel.webp"
import henutNamePanel from "@/assets/reading/henutNamePanel.webp"
import type { Wall } from "@/mods/story/game/reading/walls"
import { glyphSize, inscribed, signCells, type Panel, type Rect } from "@/mods/story/game/reading/panel"
import { getInventoryItemById } from "@/mods/hieroglyph/game/symbolCatalogue"

/** `Panel.art` names → the imported backdrop (`yarn import-reading`). */
const ART: Record<string, string> = { formulaPanel, henutNamePanel }

const symbolOf = (id: string) => getInventoryItemById(id)?.symbol ?? "?"

const percent = (rect: Rect): CSSProperties => ({
  left: `${rect.x * 100}%`,
  top: `${rect.y * 100}%`,
  width: `${rect.width * 100}%`,
  height: `${rect.height * 100}%`,
})

// The panel's own paint, Egyptian blue. The font draws a sign in lines, so a stroke of the same blue gives it the
// weight of a brush rather than a pen.
const PAINT: CSSProperties = {
  color: "#24508f",
  WebkitTextStroke: "0.02em #1d4683",
  paintOrder: "stroke fill",
}

// The crossfade of a sign put right. Reduced motion swaps it at once.
const FADE = "motion-safe:transition-opacity motion-safe:duration-700"

/**
 * The slab, drawn, for a wall nobody has painted yet — and round the signs the rope of a cartouche only
 * when the wall has one (`Panel.frame`): a cartouche encloses a name, and without one the signs are a
 * line written on a bare stela.
 */
const DrawnSlab: (props: { panel: Panel }) => ReactElement = ({ panel }) => {
  const { signs, flow } = panel
  // The rope stands clear of the signs, in panel-width units: further along the line, where its ends round.
  const along = 0.09
  const across = 0.04
  const [padX, padY] = flow === "row" ? [along, across] : [across, along]
  const rope = {
    x: signs.x - padX,
    y: signs.y - padY * panel.aspect,
    width: signs.width + padX * 2,
    height: signs.height + padY * 2 * panel.aspect,
  }
  // The tied bar across the cartouche's foot: its bottom standing up, its right end lying down.
  const bar: Rect =
    flow === "column"
      ? { x: rope.x - 0.02, y: rope.y + rope.height - 0.01, width: rope.width + 0.04, height: 0.03 * panel.aspect }
      : { x: rope.x + rope.width - 0.012, y: rope.y - 0.04, width: 0.024, height: rope.height + 0.08 }
  return (
    <div aria-hidden className="absolute inset-0 rounded-[2cqw] bg-[#e3cfa5] shadow-[inset_0_0_6cqw_#b8976866]">
      <div className="absolute inset-[3.5%] border-[0.8cqw] border-[#8a3a2a]" />
      {panel.frame !== undefined && (
        <>
          {/* Twisted rope: diagonal strands, with the plaster laid back over all but a ring of them. */}
          <div
            data-testid="cartouche-rope"
            className="absolute rounded-full bg-[repeating-linear-gradient(55deg,#7a3022_0_0.9cqw,#a4523b_0.9cqw_1.6cqw)]"
            style={percent(rope)}
          >
            <div className="absolute inset-[1.8cqw] rounded-full bg-[#ecdcbb]" />
          </div>
          <div className="absolute rounded-full bg-[#8a3a2a]" style={percent(bar)} />
        </>
      )}
    </div>
  )
}

type Props = {
  wall: Wall
  /** Per cut sign, whether the player can read it. */
  known: boolean[]
  fixed: boolean
  /** The scoured slot, as a button: only on a `missing` wall, before it is filled. */
  gapLabel: string
  onGap: () => void
}

/**
 * The wall as painted: the slab, its cartouche, and the signs written inside it — the miscut one marked in
 * red the way a draughtsman marked a correction, and crossfading to the right sign once it goes in.
 */
export const WallPanel = ({ wall, known, fixed, gapLabel, onGap }: Props) => {
  const { panel } = wall
  const order = inscribed(panel, wall.cut)
  const cells = signCells(panel, order.length)
  const size = `${glyphSize(panel, order.length) * 100}cqw`
  const art = panel.art ? ART[panel.art] : undefined

  return (
    <div
      className="@container relative w-[min(100%,var(--fit))] shrink-0 select-none"
      style={{ aspectRatio: panel.aspect, "--fit": `calc(44dvh * ${panel.aspect})` } as CSSProperties}
    >
      {art ? (
        <img src={art} alt="" className="absolute inset-0 size-full drop-shadow-lg" draggable={false} />
      ) : (
        <DrawnSlab panel={panel} />
      )}
      {/* The cartouche is the frame sign itself: named for a reader, not written twice. */}
      {panel.frame !== undefined && <span className="sr-only">{symbolOf(wall.cut[panel.frame])}</span>}
      {order.map((at, i) => {
        const slot = at === wall.wrongAt
        const cell = cells[i]
        return (
          <div
            key={at}
            className="absolute flex items-center justify-center font-mono leading-none [&>span]:pointer-events-none"
            style={{ ...percent(cell), fontSize: size }}
          >
            {slot && wall.missing && !fixed && (
              <button
                aria-label={gapLabel}
                onClick={onGap}
                className="absolute inset-[12%] rounded-[1.5cqw] border-[0.6cqw] border-dashed border-[#8a3a2a]/70 bg-[#cdb68c]/50"
              />
            )}
            {slot && !wall.missing && (
              <span
                aria-hidden={fixed}
                className={clsx(
                  "absolute inset-[6%] flex items-center justify-center rounded-[1.5cqw] border-[0.6cqw] border-dashed border-[#b23a22]",
                  FADE,
                  fixed && "opacity-0"
                )}
              >
                <span style={PAINT} className={clsx(!known[at] && "opacity-40")}>
                  {symbolOf(wall.cut[at])}
                </span>
              </span>
            )}
            {slot ? (
              <span aria-hidden={!fixed} style={PAINT} className={clsx(FADE, !fixed && "opacity-0")}>
                {symbolOf(wall.answer)}
              </span>
            ) : (
              <span style={PAINT} className={clsx(!known[at] && "opacity-40")}>
                {symbolOf(wall.cut[at])}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
