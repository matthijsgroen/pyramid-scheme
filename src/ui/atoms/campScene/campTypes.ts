import type { Difficulty } from "@/data/difficultyLevels"

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
  /** Lights sharing an id within a spot are one source: only the latest visible step's shines, as a fire grows. */
  id?: string
  dx: number
  dy: number
  radius: number
  color: string
  mode: "flicker" | "breathe"
  strength: number
}

/**
 * Offsets and sizes are relative to the anchor (bottom-centre), in frame units (1×1 is the whole frame).
 * The art is `src/assets/camp/<id>.webp`. A light's offset is relative to the piece in the same units, so
 * it sits where its source is inside the piece's art whatever the frame; its radius stays in object units,
 * the reach of the light itself.
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

/**
 * A layer step: one object drawn over its spot, from `src/assets/camp/layers/<id>.webp`. It shows only while
 * its hosts all show: the pieces named by `on`, else the nearest base step before it; with neither it stands
 * alone. Layers sharing a `growth` are the stages of one growing object: only the furthest found one shows.
 */
/** `behind` names a piece of the same spot this layer stands behind, so it draws just before it. */
export type CampLayer = { on?: string | readonly string[]; growth?: string; behind?: string }

/**
 * A base step is the whole spot as one picture and hides every earlier base step of its spot; without
 * `layer` a step is a base. A step is there once every one of its pieces is found, a `given` step (not a
 * find, only ground for the others) once any other step of its spot is.
 */
export type CampStep = { chapter: Difficulty; pieces: CampPiece[]; layer?: CampLayer; given?: true }

/**
 * Where a spot or fixed piece stands and how big it is, all in object units (the chest is 0.83u wide).
 * `x` and `y` place its anchor, the bottom centre of its object group, relative to the fire's anchor as
 * measured in the wizard impression: x runs right, y runs down, and a smaller y stands farther away.
 * `frame` is the side of the square its images are drawn at; `footprint` is the width the object stands
 * on, which keeps a neighbour at the same depth away. `bleed` is the share of the frame the camera may leave
 * off-screen on its sides and top (a palm crown can stick out; its ground never does).
 */
export type CampPlace = { x: number; y: number; frame: number; footprint: number; bleed?: number }

export type CampSpot = CampPlace & { id: CampSpotId; steps: CampStep[] }

/** Per spot, the ids of the pieces the player has found, in any order. */
export type CampFound = Partial<Record<CampSpotId, readonly string[]>>

export type CampFixedId = "chest" | "window" | "campfire" | "oasis"

export type CampFixed = CampPlace & { id: CampFixedId; piece: CampPiece }

export type CampCatalogue = { spots: CampSpot[]; fixed: CampFixed[] }
