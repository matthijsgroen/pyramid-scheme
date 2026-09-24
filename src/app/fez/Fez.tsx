import fez from "@/assets/fez-250.png"
import fezPoint from "@/assets/point-fez-250.png"
import fezGlassesPoint from "@/assets/glasses-point-fez-250.png"
import fezCocktail from "@/assets/cocktail-fez-250.png"
import explorer from "@/assets/explorer-250.png"
import clsx from "clsx"
import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { arrivalLines, type Speaker } from "./arrivalConversation"

type Pose = "default" | "pointUp" | "glassesPoint" | "cocktail"

type PoseChat = [pose: Pose, translationKey: string, speaker?: Speaker]

const pose = (...args: (Pose | string[])[]): PoseChat[] => {
  let currentPose: Pose = "default"

  const result = args.flatMap<PoseChat>(key => {
    if (Array.isArray(key)) {
      return key.map<PoseChat>(k => [currentPose, k])
    }
    currentPose = key
    return []
  })
  return result
}

const conversations: Record<string, PoseChat[]> = {
  // He states why he's along before the call to action, so the stall pays it off later.
  welcome: pose(["welcome", "welcome2", "welcomeTrade", "welcome3"]),
  chooseExpedition: pose(["chooseExpedition"]),
  pyramidIntro: pose(["pyramidIntro", "pyramidIntro2"], "pointUp", ["pyramidIntro3"]),
  levelCompleted: pose("pointUp", ["levelCompleted"]),
  expeditionCompleted: pose("glassesPoint", ["expeditionCompleted", "expeditionCompleted2"]),
  collectionIntro: pose(["collectionIntro", "collectionIntro2", "collectionIntro3"]),
  tombIntro: pose(["tombIntro", "tombIntro2"], "pointUp", ["tombIntro3"]),
  tombTutorial: pose(["tombTutorial", "tombTutorial2"], "pointUp", ["tombTutorial3"]),
  hieroglyphUnlock: pose(["hieroglyphUnlock"], "pointUp", ["hieroglyphUnlock2"]),
  errorHighlightTutorial: pose(["errorHighlightTutorial"], "glassesPoint", ["errorHighlightTutorial2"]),
  earlyFeedbackTutorial: pose(["earlyFeedbackTutorial"], "pointUp", ["earlyFeedbackTutorial2"]),
  notEnoughHieroglyphs: pose(["notEnoughHieroglyphs"], "pointUp", ["notEnoughHieroglyphs2"]),
  tombLoot: pose("glassesPoint", ["tombLoot"]),
  mapPiece: pose(["mapPiece", "mapPiece2"], "pointUp", ["mapPiece3"]),
  pyramidBlockedBlocks: pose(
    ["pyramidBlockedBlocks", "pyramidBlockedBlocks2", "pyramidBlockedBlocks3"],
    "glassesPoint",
    ["pyramidBlockedBlocks4"]
  ),
  shopArrival: pose("cocktail", ["shopArrival", "shopArrival2"]),
  // The first stall the player ever reaches: he owns up to it being his and pitches the counter.
  // Closes on the same practical line as every later visit, so the rules live in one string.
  shopFirstVisit: pose("cocktail", ["shopFirstVisit", "shopFirstVisit2", "shopArrival2"]),
  // One per finished mosaic register, plus the finale. Registers complete in any order, so no beat
  // may lean on another.
  mosaicStarter: pose(["mosaicStarter", "mosaicStarter2"], "pointUp", ["mosaicStarter3"]),
  mosaicJunior: pose("glassesPoint", ["mosaicJunior"], "default", ["mosaicJunior2", "mosaicJunior3"]),
  mosaicExpert: pose("pointUp", ["mosaicExpert"], "default", ["mosaicExpert2", "mosaicExpert3"]),
  mosaicMaster: pose("glassesPoint", ["mosaicMaster"], "default", ["mosaicMaster2", "mosaicMaster3"]),
  mosaicWizard: pose(["mosaicWizard", "mosaicWizard2"], "pointUp", ["mosaicWizard3"]),
  mosaicFinale: pose("glassesPoint", ["mosaicFinale"], "default", ["mosaicFinale2"], "pointUp", ["mosaicFinale3"]),
}

const NOT_FOUND = pose("default", ["not-found"])

const PORTRAITS: Partial<Record<Speaker, Partial<Record<Pose, { src: string; alt: string }>>>> = {
  fez: {
    default: { src: fez, alt: "Happy companion lizard wearing a fez" },
    pointUp: { src: fezPoint, alt: "Happy companion lizard wearing a fez" },
    glassesPoint: { src: fezGlassesPoint, alt: "Happy companion lizard wearing a fez and glasses" },
    cocktail: { src: fezCocktail, alt: "Happy companion lizard wearing a fez and holding a cocktail" },
  },
  explorer: {
    default: { src: explorer, alt: "The explorer, in a wide brown hat and olive vest" },
  },
}

const ARRIVAL = /^arrival\.(.+)$/

/**
 * The lines a conversation id plays.
 *
 * A journey's arrival is not in the table above: there are twenty of them, they are authored as
 * translations alone, and a new one should cost a key rather than a code change.
 */
const linesFor = (conversation: string, hasLine: (key: string) => boolean): PoseChat[] => {
  const table = conversations[conversation]
  if (table) return table
  const journeyId = ARRIVAL.exec(conversation)?.[1]
  const spoken = journeyId ? arrivalLines(journeyId, hasLine) : []
  return spoken.length > 0 ? spoken.map(line => ["default", line.key, line.speaker] as PoseChat) : NOT_FOUND
}

export const Fez: FC<{
  conversation: string
  onComplete: (result: "complete" | "skipped") => void
}> = ({ conversation, onComplete }) => {
  const { t, i18n } = useTranslation("fez")
  const [visible, setVisible] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  const messages = linesFor(conversation, key => i18n?.exists?.(key, { ns: "fez" }) === true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
    }, 200) // Show after 200 milliseconds
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!visible) {
      if (messageIndex >= messages.length) {
        const timer = setTimeout(() => {
          onComplete("complete")
        }, 300) // complete
        return () => clearTimeout(timer) // Cleanup timer
      }
      return
    }
    const timer = setTimeout(() => {
      setShowMessage(true)
    }, 600) // Show after 600 milliseconds
    return () => clearTimeout(timer)
  }, [visible, messageIndex, messages.length, onComplete])

  useEffect(() => {
    if (!showMessage && visible) {
      const timer = setTimeout(() => {
        if (messageIndex >= messages.length) {
          setVisible(false)
          return
        }
        setShowMessage(true)
        setMessageIndex(messageIndex + 1)
        // next message? show
      }, 400) // Reset message index after 400 milliseconds
      return () => clearTimeout(timer)
    }
  }, [messages.length, onComplete, showMessage, visible, messageIndex])

  const onNextMessage = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    if (showMessage && visible) {
      setShowMessage(false)
    }
  }

  const current = messages[messageIndex - 1]
  const pose = current?.[0] || "default"
  const speaker: Speaker = current?.[2] ?? "fez"
  const portrait = PORTRAITS[speaker]?.[pose]

  return (
    <div className="fixed inset-0 z-10 bg-black/10" onClick={onNextMessage}>
      <div
        className={clsx("pointer-events-none fixed bottom-0", speaker === "explorer" ? "right-0 pl-6" : "left-0 pr-6")}
      >
        <div
          className={clsx(
            "mb-2 max-w-xs rounded border border-black bg-white p-3 text-black shadow-lg transition-all duration-300",
            speaker === "explorer" ? "mr-15 origin-bottom-right" : "ml-15 origin-bottom-left",
            showMessage ? "rotate-0 opacity-100" : "rotate-12 opacity-0"
          )}
        >
          {t(current?.[1])}
        </div>
        {portrait && (
          <img
            src={portrait.src}
            alt={portrait.alt}
            className={clsx(
              "-mb-15 w-50 animate-subtle-bounce transition-transform duration-300",
              visible ? "translate-y-0" : "translate-y-1/1"
            )}
          />
        )}
      </div>
    </div>
  )
}
