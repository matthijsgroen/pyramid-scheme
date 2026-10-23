import type { Difficulty } from "@/data/difficultyLevels"

/** Depth row of a spot: back, middle, front. */
export type CampRow = 0 | 1 | 2

export type CampSpotId =
  | "fire"
  | "sleeping"
  | "water"
  | "cooking"
  | "donkey"
  | "camel"
  | "mapTable"
  | "palmGarden"
  | "ibisPond"
  | "lookout"
  | "godStatues"
  | "starCanopy"

/** A glow carried by a piece. Offsets and radius are object-size units; dy is screen-style (positive is down). */
export type CampLight = {
  dx: number
  dy: number
  radius: number
  color: string
  mode: "flicker" | "breathe"
  strength: number
}

/**
 * Offsets and sizes are relative to the spot's anchor (bottom-centre), in frame units for a spot's piece
 * (1×1 is the whole frame) and object units for a fixed piece. The art is `src/assets/camp/<id>.webp`. A
 * light's offset is relative to the piece in the same units, so it sits where its source is inside the
 * piece's art whatever the frame; its radius stays in object units, the reach of the light itself.
 */
export type CampPiece = {
  id: string
  dx: number
  dy: number
  width: number
  height: number
  /** Ids of earlier pieces in the same spot that this one hides. */
  replaces?: string[]
  lights?: CampLight[]
}

export type CampStep = { chapter: Difficulty; pieces: CampPiece[] }

/**
 * `slot` is a signed number of slot widths from the fire. `frame` is the side of the square every step
 * image is drawn at, in object units; `footprint` is the width the object stands on, which keeps its
 * neighbours away. Both are measured against the chest in the impression.
 */
export type CampSpot = {
  id: CampSpotId
  row: CampRow
  slot: number
  frame: number
  footprint: number
  steps: CampStep[]
}

export type CampFixedId = "chest" | "window" | "campfire"

export type CampFixed = { id: CampFixedId; row: CampRow; slot: number; footprint: number; piece: CampPiece }

export type CampCatalogue = { spots: CampSpot[]; fixed: CampFixed[] }
