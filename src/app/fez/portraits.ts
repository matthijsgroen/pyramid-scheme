import fez from "@/assets/fez-250.png"
import fezPoint from "@/assets/point-fez-250.png"
import fezGlassesPoint from "@/assets/glasses-point-fez-250.png"
import fezCocktail from "@/assets/cocktail-fez-250.png"
import explorer from "@/assets/explorer-250.png"
import explorerGrin from "@/assets/grin-explorer-250.png"
import explorerPoint from "@/assets/point-explorer-250.png"
import ghostIpi from "@/assets/ghost-ipi-250.png"
import ghostHenut from "@/assets/ghost-henut-250.png"
import ghostPriest from "@/assets/ghost-priest-250.png"
import ghostPharaoh from "@/assets/ghost-pharaoh-250.png"
import type { Speaker } from "./arrivalConversation"

/** How a portrait is drawn for a line. Fez has four, the explorer three, the ghosts one. */
export const POSES = ["default", "pointUp", "glassesPoint", "cocktail"] as const
export type Pose = (typeof POSES)[number]

/**
 * Who is drawn when somebody speaks.
 *
 * Data rather than part of the renderer, so content can be held to the art that exists — a scene
 * authored for a speaker nobody has drawn opens a bubble beside nobody.
 */
export const PORTRAITS: Partial<
  Record<
    Speaker,
    Partial<
      Record<
        Pose,
        {
          src: string
          alt: string
          /** 350x375 rather than 250x375: imported with `--behind=0.4`, the figure behind them included. */
          wide?: true
        }
      >
    >
  >
> = {
  fez: {
    default: { src: fez, alt: "Happy companion lizard wearing a fez" },
    pointUp: { src: fezPoint, alt: "Happy companion lizard wearing a fez" },
    glassesPoint: { src: fezGlassesPoint, alt: "Happy companion lizard wearing a fez and glasses" },
    cocktail: { src: fezCocktail, alt: "Happy companion lizard wearing a fez and holding a cocktail" },
  },
  ipi: { default: { src: ghostIpi, alt: "Ipi, a bookkeeper, pale blue-green", wide: true } },
  henut: { default: { src: ghostHenut, alt: "Henut, a noblewoman, pale blue-green", wide: true } },
  priest: { default: { src: ghostPriest, alt: "A high priest, pale blue-green", wide: true } },
  pharaoh: { default: { src: ghostPharaoh, alt: "A pharaoh, pale blue-green", wide: true } },
  explorer: {
    default: { src: explorer, alt: "The explorer, in a wide brown hat and olive vest", wide: true },
    pointUp: { src: explorerPoint, alt: "The explorer, pointing", wide: true },
    glassesPoint: { src: explorerGrin, alt: "The explorer, in sunglasses, grinning", wide: true },
  },
}
