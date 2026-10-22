import fez from "@/assets/fez-250.png"
import fezPosePoint from "@/assets/fez-pose-point-250.png"
import fezFaceWorried from "@/assets/fez-face-worried-250.png"
import fezFaceExcited from "@/assets/fez-face-excited-250.png"
import fezFaceCool from "@/assets/fez-face-cool-250.png"
import fezCocktail from "@/assets/cocktail-fez-250.png"
import explorer from "@/assets/explorer-250.png"
import explorerCool from "@/assets/grin-explorer-250.png"
import explorerPoint from "@/assets/point-explorer-250.png"
import ghostIpi from "@/assets/ghost-ipi-250.png"
import ghostHenut from "@/assets/ghost-henut-250.png"
import ghostPriest from "@/assets/ghost-priest-250.png"
import ghostPharaoh from "@/assets/ghost-pharaoh-250.png"
import type { Speaker } from "./arrivalConversation"

/**
 * Every portrait is a pose base and a face (character-art-prompts.md). A pose base is the figure,
 * an edit of the speaker's one master that kept the head where it was; `default` is the master itself.
 */
export const BASES = ["default", "point", "cocktail"] as const
export type Base = (typeof BASES)[number]

/** A look laid over a pose base. `default` is the base's own face. */
export const FACES = ["default", "worried", "excited", "cool"] as const
export type Face = (typeof FACES)[number]

/** The pose names lines are written with (`> **Fez (pointUp):** …`), each a pose base and a face. */
export const POSES = ["default", "pointUp", "glassesPoint", "cocktail"] as const
export type Pose = (typeof POSES)[number]

export const POSE_PARTS: Readonly<Record<Pose, { base: Base; face: Face }>> = {
  default: { base: "default", face: "default" },
  pointUp: { base: "point", face: "excited" },
  glassesPoint: { base: "point", face: "cool" },
  cocktail: { base: "cocktail", face: "default" },
}

type Art = { src: string; alt: string }
type Combination = `${Base}+${Face}`

type Portraits = {
  /** 350x375 rather than 250x375: imported with `--behind=0.4`, the figure behind them included. */
  wide?: true
  /** Each cut through the speaker's shared frame (`art/rebuild.sh`), so any face lands on any of them. */
  bases: Partial<Record<Base, Art>>
  /** Transparent outside the head: one small layer per look instead of a portrait per pose and look. */
  faces?: Partial<Record<Exclude<Face, "default">, string>>
  /**
   * Whole paintings drawn for a pose and face until that pair can be composed from a base and a face
   * layer. Composition wins as soon as it can; the painting is then deleted.
   */
  paintings?: Partial<Record<Combination, Art>>
}

/**
 * Who is drawn when somebody speaks.
 *
 * Data rather than part of the renderer, so content can be held to the art that exists — a scene
 * authored for a speaker nobody has drawn opens a bubble beside nobody.
 */
export const PORTRAITS: Partial<Record<Speaker, Portraits>> = {
  fez: {
    bases: {
      default: { src: fez, alt: "Happy companion lizard wearing a fez" },
      point: { src: fezPosePoint, alt: "Happy companion lizard wearing a fez, pointing" },
    },
    faces: { worried: fezFaceWorried, excited: fezFaceExcited, cool: fezFaceCool },
    paintings: {
      "cocktail+default": { src: fezCocktail, alt: "Happy companion lizard wearing a fez and holding a cocktail" },
    },
  },
  ipi: { wide: true, bases: { default: { src: ghostIpi, alt: "Ipi, a bookkeeper, pale blue-green" } } },
  henut: { wide: true, bases: { default: { src: ghostHenut, alt: "Henut, a noblewoman, pale blue-green" } } },
  priest: { wide: true, bases: { default: { src: ghostPriest, alt: "A high priest, pale blue-green" } } },
  pharaoh: { wide: true, bases: { default: { src: ghostPharaoh, alt: "A pharaoh, pale blue-green" } } },
  explorer: {
    wide: true,
    bases: { default: { src: explorer, alt: "The explorer, in a wide brown hat and olive vest" } },
    paintings: {
      "point+default": { src: explorerPoint, alt: "The explorer, pointing" },
      "default+cool": { src: explorerCool, alt: "The explorer, in sunglasses, grinning" },
    },
  },
}

const compose = (portraits: Portraits, base: Base, face: Face) => {
  const figure = portraits.bases[base]
  const layer = face === "default" ? undefined : portraits.faces?.[face]
  if (figure && (face === "default" || layer)) return { ...figure, face: layer, painting: false }
  const painting = portraits.paintings?.[`${base}+${face}`]
  return painting && { ...painting, face: undefined, painting: true }
}

/** Exactly this base and face for a speaker, with no giving way: a composition, a painting, or nothing. */
export const portraitPart = (speaker: Speaker, base: Base, face: Face) => {
  const portraits = PORTRAITS[speaker]
  const art = portraits && compose(portraits, base, face)
  return art ? { ...art, wide: portraits.wide, drawn: { base, face } } : undefined
}

export type PortraitArt = NonNullable<ReturnType<typeof portraitPart>>

/**
 * What is drawn for a line: its pose's base with the line's face, or the pose's own one. What cannot be
 * drawn gives way face first, then pose — the base with its own face, then the default base.
 */
export const portraitFor = (speaker: Speaker, pose: Pose, face?: Face): PortraitArt | undefined => {
  const asked = { base: POSE_PARTS[pose].base, face: face ?? POSE_PARTS[pose].face }
  const tries: { base: Base; face: Face }[] = [
    asked,
    { base: asked.base, face: "default" },
    { base: "default", face: asked.face },
    { base: "default", face: "default" },
  ]
  for (const drawn of tries) {
    const art = portraitPart(speaker, drawn.base, drawn.face)
    if (art) return art
  }
  return undefined
}
