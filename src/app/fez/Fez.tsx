import fez from "@/assets/fez-250.png"
import fezPoint from "@/assets/point-fez-250.png"
import fezGlassesPoint from "@/assets/glasses-point-fez-250.png"
import fezCocktail from "@/assets/cocktail-fez-250.png"
import clsx from "clsx"
import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"

type Pose = "default" | "pointUp" | "glassesPoint" | "cocktail"

type PoseChat = [pose: Pose, translationKey: string]

const pose = (pose: Pose, keys: string[]): PoseChat[] =>
  keys.map((key) => [pose, key])

const conversations: Record<string, PoseChat[]> = {
  welcome: pose("default", ["welcome", "welcome2", "welcome3"]),
  chooseExpedition: pose("default", ["chooseExpedition"]),
  pyramidIntro: [
    ...pose("default", [
      "pyramidIntro",
      "pyramidIntro2",
      "pyramidIntro3",
      "pyramidIntro4",
    ]),
    ...pose("pointUp", ["pyramidIntro5"]),
  ],
  levelCompleted: pose("pointUp", ["levelCompleted"]),
  expeditionCompleted: pose("glassesPoint", [
    "expeditionCompleted",
    "expeditionCompleted2",
  ]),
  collectionIntro: pose("default", [
    "collectionIntro",
    "collectionIntro2",
    "collectionIntro3",
  ]),
  tombIntro: pose("default", ["tombIntro", "tombIntro2", "tombIntro3"]),
  notEnoughHieroglyphs: [
    ...pose("default", ["notEnoughHieroglyphs"]),
    ...pose("pointUp", ["notEnoughHieroglyphs2"]),
  ],
  tombLoot: pose("glassesPoint", ["tombLoot"]),
  mapPiece: [
    ...pose("default", ["mapPiece", "mapPiece2"]),
    ...pose("pointUp", ["mapPiece3"]),
  ],
}

const NOT_FOUND = pose("default", ["not-found"])

export const Fez: FC<{
  conversation: string
  onComplete: (result: "complete" | "skipped") => void
}> = ({ conversation, onComplete }) => {
  const { t } = useTranslation("fez")
  const [visible, setVisible] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  const messages = conversations[conversation] || NOT_FOUND

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
        }, 500) // complete
        return () => clearTimeout(timer) // Cleanup timer
      }
      return
    }
    const timer = setTimeout(() => {
      setShowMessage(true)
    }, 1000) // Show after 1 second
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

  const pose = messages[messageIndex - 1]?.[0] || "default"

  return (
    <div className="fixed inset-0 z-10 bg-black/10" onClick={onNextMessage}>
      <div className="pointer-events-none fixed bottom-0 left-0 pr-6">
        <div
          className={clsx(
            "mb-2 ml-15 max-w-xs origin-bottom-left rounded border border-black bg-white p-3 text-black shadow-lg transition-all duration-300",
            showMessage ? "rotate-0 opacity-100" : "rotate-12 opacity-0"
          )}
        >
          {t(messages[messageIndex - 1]?.[1])}
        </div>
        {pose === "default" && (
          <img
            src={fez}
            alt="Happy companion lizard wearing a fez"
            className={clsx(
              "-mb-15 w-50 animate-subtle-bounce transition-transform duration-300",
              visible ? "translate-y-0" : "translate-y-1/1"
            )}
          />
        )}
        {pose === "pointUp" && (
          <img
            src={fezPoint}
            alt="Happy companion lizard wearing a fez"
            className={clsx(
              "-mb-15 w-50 animate-subtle-bounce transition-transform duration-300",
              visible ? "translate-y-0" : "translate-y-1/1"
            )}
          />
        )}
        {pose === "glassesPoint" && (
          <img
            src={fezGlassesPoint}
            alt="Happy companion lizard wearing a fez and glasses"
            className={clsx(
              "-mb-15 w-50 animate-subtle-bounce transition-transform duration-300",
              visible ? "translate-y-0" : "translate-y-1/1"
            )}
          />
        )}
        {pose === "cocktail" && (
          <img
            src={fezCocktail}
            alt="Happy companion lizard wearing a fez and holding a cocktail"
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
