import type { CSSProperties } from "react"
import { hexToRgb } from "@/support/colour"
import { FACE_GROW, FACE_H, FACE_PATTERN_Y, ROW_PITCH } from "./mapScale"
import { FACE_TOP } from "./roomClaims"
import { tileUrl } from "./tileAssets"
import { MEGATILE } from "./tileLayers"
import { stateWash, tierPalette } from "./tileMaterials"
import type { FrontRun } from "./tileRegions"
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
 * and under the markers and everything standing, so a mark and the explorer are never hidden by it.
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
          {run.pieces.map(({ rect: [x, y, w], tier, state }) => {
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
              height: FACE_H,
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
