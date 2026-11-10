import type { CSSProperties, ReactNode } from "react"
import { hexToRgb } from "@/support/colour"
import { CELL, FACE_GROW, FACE_H, FACE_PATTERN_Y, ROW_PITCH } from "./mapScale"
import { FACE_TOP } from "./roomClaims"
import { tileUrl } from "./tileAssets"
import { MEGATILE } from "./tileLayers"
import { stateWash, tierPalette } from "./tileMaterials"
import { grownFaceRects, rectsToPath, type FrontRun, type Rect } from "./tileRegions"
import { wallFade } from "./wallFades"

const washColour = ({ fill, opacity }: { fill: string; opacity: number }) =>
  `rgba(${hexToRgb(fill).join(",")},${opacity})`

/**
 * THE WALLS THAT STAND IN FRONT OF FLOOR, drawn over the ground layers rather than with the stone.
 *
 * A face rises `FACE_GROW` above its own gap, so where the cell north of a wall is floor, the wall covers
 * the near part of it — as a wall in front of a passage does. Drawn in the SVG stone it would sit under
 * everything laid on that floor: the sand, the scatter, the scarabs would all lie on top of the wall. Here
 * it sits over those and under the shade and the light, so it is lit exactly as the stone around it is,
 * and under the markers and everything standing, so the explorer is never hidden by it. A marker or a prop
 * standing BEHIND it is drawn behind it all the same (`BehindWalls`).
 *
 * When the explorer is behind a run — on a cell it rises over, or walking through one — the WHOLE run
 * fades, not only the part in front of them, so the floor behind reads as one place again.
 */
export const FrontWalls = ({ runs, faded }: { runs: readonly FrontRun[]; faded: ReadonlySet<string> }) => (
  <div data-front-walls="" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {runs.map(run => {
      const [bx, by, bw, bh] = run.bounds
      const fade = wallFade(faded.has(run.key))
      return (
        <div
          key={run.key}
          data-front-wall={run.key}
          data-faded={faded.has(run.key) ? "" : undefined}
          className={fade.className}
          style={{ position: "absolute", left: bx, top: by, width: bw, height: bh, opacity: fade.opacity }}
        >
          {run.pieces.map(({ rect: [x, y, w, h], tier, state }) => {
            const top = y - FACE_GROW
            const palette = tierPalette[tier]
            const art = tileUrl(tier, "wall-face")
            const wash = stateWash[state]
            const flat = (colour: string) => `linear-gradient(${colour}, ${colour})`
            // Topmost first, in the order the SVG stone lays them: the state's wash over everything, the
            // wall's own top, the rank's darkening of its walls, and the face as painted — sampled at the
            // same place in the art the stone samples it, so a run reads as one wall with the faces beside it.
            const layers: { image: string; size: string; position?: string; repeat?: string }[] = [
              ...(wash ? [{ image: flat(washColour(wash)), size: "100% 100%" }] : []),
              { image: flat(palette.wallBase), size: `100% ${FACE_TOP}px` },
              ...(palette.faceNight > 0
                ? [
                    {
                      image: flat(washColour({ fill: palette.outline, opacity: palette.faceNight })),
                      size: "100% 100%",
                    },
                  ]
                : []),
              {
                image: art ? `url(${art})` : flat(palette.wall),
                size: `${MEGATILE}px ${FACE_H}px`,
                position: `${-x}px ${-((top - FACE_PATTERN_Y) % ROW_PITCH)}px`,
                repeat: "repeat-x",
              },
            ]
            const style: CSSProperties = {
              position: "absolute",
              left: x - bx,
              top: top - by,
              width: w,
              height: h + FACE_GROW,
              backgroundImage: layers.map(l => l.image).join(", "),
              backgroundSize: layers.map(l => l.size).join(", "),
              backgroundPosition: layers.map(l => l.position ?? "0 0").join(", "),
              backgroundRepeat: layers.map(l => l.repeat ?? "no-repeat").join(", "),
            }
            return <div key={`${x},${y}`} data-front-piece="" style={style} />
          })}
        </div>
      )
    })}
  </div>
)

/**
 * SOMETHING STANDING BEHIND A FRONT WALL, drawn behind it.
 *
 * Everything standing and every marker is drawn over the front walls, so the explorer and what stands in front of a wall
 * are never covered by one. What stands BEHIND a wall is cut where the wall is drawn instead, so the wall
 * shows there, lit as the stone around it is. While that wall is faded the cut-away part shows again,
 * over the faded wall, the way the explorer behind it does.
 *
 * Each part is a layer the size of the thing plus a cell's margin, never the size of the map (see
 * `rectsToPath`).
 */
export const BehindWalls = ({
  runs,
  faded,
  box: [x, y, w, h],
  children,
}: {
  runs: readonly FrontRun[]
  faded: ReadonlySet<string>
  box: Rect
  children: ReactNode
}) => {
  const outer: Rect = [x - CELL, y - CELL, w + 2 * CELL, h + 2 * CELL]
  const origin = [outer[0], outer[1]] as const
  const walls = runs.map(run => ({ run, rects: grownFaceRects(run.pieces.map(p => p.rect)) }))
  const layer = (clip: string, style?: CSSProperties, className?: string) => (
    <div
      className={className}
      style={{
        position: "absolute",
        left: outer[0],
        top: outer[1],
        width: outer[2],
        height: outer[3],
        clipPath: clip,
        ...style,
      }}
    >
      <div style={{ position: "absolute", left: -outer[0], top: -outer[1] }}>{children}</div>
    </div>
  )
  const allWalls = rectsToPath(
    walls.flatMap(({ rects }) => rects),
    origin
  )
  return (
    <div data-behind-wall="">
      {layer(`path(evenodd, "${rectsToPath([outer], origin)}${allWalls}")`)}
      {walls.map(({ run, rects }) => (
        <div key={run.key} data-behind-copy="" data-behind-faded={faded.has(run.key) ? "" : undefined}>
          {layer(
            `path("${rectsToPath(rects, origin)}")`,
            { opacity: faded.has(run.key) ? 1 : 0 },
            wallFade(false).className
          )}
        </div>
      ))}
    </div>
  )
}
