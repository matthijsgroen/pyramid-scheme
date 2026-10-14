import type { HoleLook } from "@/game/stonePlay"
import { sharedTileUrl } from "./tileAssets"

/** The painting each look of a pipe's hole wears, from `tiles/default/`: one hole for every rank, the stone lying in
 * it painted as an edit of the empty one so the two swap on a wall. */
export const PIPE_HOLE_TILE: Record<HoleLook, string> = { empty: "pipeHole", stone: "pipeHoleStone" }

// The stand-in until the painting lands: a flat dark mouth in the wall, a grey stone in it. Two by one, as the wall
// band it is drawn on.
const svg = (stone: boolean) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 28"><ellipse cx="28" cy="15" rx="11" ry="8" fill="#1d1510"/>${
      stone ? `<circle cx="28" cy="17" r="6" fill="#8d8a84"/>` : ""
    }</svg>`
  )}`

export const PIPE_HOLE_PLACEHOLDER: Record<HoleLook, string> = { empty: svg(false), stone: svg(true) }

/** What a hole is drawn with in a look: the painting where one is imported, the stand-in otherwise. */
export const pipeHoleArtUrl = (look: HoleLook): string =>
  sharedTileUrl(PIPE_HOLE_TILE[look]) ?? PIPE_HOLE_PLACEHOLDER[look]
