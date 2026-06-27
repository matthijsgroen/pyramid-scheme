export const MOSAIC_PIECE_IDS = [
  "bg_tl",
  "bg_tr",
  "bg_ml",
  "bg_mr",
  "bg_bl",
  "bg_br",
  "ear_l",
  "ear_r",
  "head",
  "eye_l",
  "eye_r",
  "collar",
  "arm_l",
  "arm_r",
  "chest",
  "abdomen",
  "belt",
  "kilt",
  "leg_l",
  "leg_r",
] as const

export type MosaicPieceId = (typeof MOSAIC_PIECE_IDS)[number]
