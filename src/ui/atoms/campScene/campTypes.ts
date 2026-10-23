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

/** All offsets and sizes are object-size units relative to the spot's anchor (bottom-centre). */
export type CampPiece = {
  id: string
  /** Asset key; absent while the piece has no art, so the stand-in draws. */
  art?: string
  dx: number
  dy: number
  width: number
  height: number
  /** Ids of earlier pieces in the same spot that this one hides. */
  replaces?: string[]
  light?: CampLight
}

export type CampStep = { chapter: Difficulty; pieces: CampPiece[] }

/** `slot` is a signed number of slot widths from the fire. */
export type CampSpot = { id: CampSpotId; row: CampRow; slot: number; steps: CampStep[] }

export type CampFixedId = "chest" | "window" | "campfire"

export type CampFixed = { id: CampFixedId; row: CampRow; slot: number; piece: CampPiece }

export type CampCatalogue = { spots: CampSpot[]; fixed: CampFixed[] }
