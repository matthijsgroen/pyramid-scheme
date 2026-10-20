import clsx from "clsx"
import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { GHOSTS, spokenLines, type Speaker } from "./arrivalConversation"
import { PORTRAITS, type Pose } from "./portraits"

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

/** Until Fez is met the explorer is alone, so what the player needs before then is his to say. */
const asExplorer = (chats: PoseChat[]): PoseChat[] => chats.map(([pose, key]) => [pose, key, "explorer"])

const conversations: Record<string, PoseChat[]> = {
  welcome: asExplorer(pose(["welcome", "welcome2", "welcome3"])),
  // The exterior is the one board that does not show its own rule, so the explorer says it, alone.
  pyramidIntro: asExplorer(pose(["pyramidIntro", "pyramidIntro2"])),
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

/**
 * The lines a conversation id plays.
 *
 * A conversation not in the table above is read out of the translations instead — the arrivals and
 * the tomb scenes are authored that way, because a new beat should cost a key rather than a code
 * change. The table is what is left: the tutorials and the shipped one-voice beats.
 */
const writtenLines = (conversation: string, hasLine: (key: string) => boolean): PoseChat[] => {
  const table = conversations[conversation]
  if (table) return table
  const spoken = spokenLines(conversation, hasLine)
  return spoken.length > 0 ? spoken.map(line => ["default", line.key, line.speaker] as PoseChat) : NOT_FOUND
}

const fezSpeaks = (lines: PoseChat[]): boolean => lines.some(([, , speaker]) => (speaker ?? "fez") === "fez")

/**
 * The lines a conversation plays, or nothing when Fez speaks in it and has not been met yet.
 *
 * Dropped whole rather than with his lines cut, so the explorer never answers nobody. A line the
 * player needs before the meeting is the explorer's in the table above (`asExplorer`), not Fez's.
 */
const linesFor = (conversation: string, hasLine: (key: string) => boolean, beforeMeeting: boolean) => {
  const lines = writtenLines(conversation, hasLine)
  return beforeMeeting && fezSpeaks(lines) ? undefined : lines
}

export const Fez: FC<{
  conversation: string
  onComplete: (result: "complete" | "skipped" | "unmet") => void
  /** Fez is not met yet, so a conversation he speaks in is dropped (`linesFor`). */
  beforeMeeting?: boolean
}> = ({ conversation, onComplete, beforeMeeting = false }) => {
  const { t, i18n } = useTranslation("fez")
  const [visible, setVisible] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)

  const staged = linesFor(conversation, key => i18n?.exists?.(key, { ns: "fez" }) === true, beforeMeeting)
  const unmet = !staged
  const messages = staged ?? []

  // Once per mount: the companion keys this component by conversation, and its onComplete is a fresh
  // function every render, so depending on it would report the same drop again and again.
  useEffect(() => {
    if (unmet) onComplete("unmet")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unmet])

  useEffect(() => {
    if (unmet) return
    const timer = setTimeout(() => {
      setVisible(true)
    }, 200) // Show after 200 milliseconds
    return () => clearTimeout(timer)
  }, [unmet])

  useEffect(() => {
    if (unmet) return
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
  }, [unmet, visible, messageIndex, messages.length, onComplete])

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

  // Clamped, because the portrait slides in BEFORE the first line is showing (messageIndex 0) and an
  // out-of-range read there fell back to Fez: he appeared with an empty bubble, then vanished as the
  // real first speaker arrived on the other side of the screen. Whoever speaks first slides in.
  const current = messages[Math.max(messageIndex - 1, 0)]
  const pose = current?.[0] || "default"
  const speaker: Speaker = current?.[2] ?? "fez"
  const portrait = PORTRAITS[speaker]?.[pose]

  if (unmet) return null

  return (
    <div className="fixed inset-0 z-10 bg-black/10" onClick={onNextMessage}>
      {/* The column the game's panels share (max-w-md), centred: on a wide screen the viewport's
          corners are far from the game and from each other, and the two speakers stood in them. On a
          phone the column is the screen, so nothing moves there. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-md">
        <div className={clsx("absolute bottom-0", speaker === "explorer" ? "right-0 pl-6" : "left-0 pr-6")}>
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
              // One element per speaker: the slide-in transitions every transform, the mirror included, so a
              // shared element would visibly spin round each time the other one spoke.
              key={speaker}
              src={portrait.src}
              alt={portrait.alt}
              className={clsx(
                "-mb-15 w-50 animate-subtle-bounce transition-transform duration-300",
                // The sprite is narrower than the bubble above it, so on the right-hand side it has to
                // be pushed over: left-aligned in a right-anchored column, the explorer stood inboard
                // of the edge instead of opposite Fez, and the two of them did not face each other.
                speaker === "explorer" && "ml-auto",
                // Every sprite is drawn facing right, which is towards the other speaker only from the left.
                speaker === "explorer" && "-scale-x-100",
                // His art is cut off along his back, meant to stand against the screen's edge. Once the
                // column is narrower than the screen that edge is open floor, so the cut fades out there.
                speaker === "explorer" && "min-[28rem]:mask-l-from-80%",
                // The dead are see-through. Drawn opaque and faded here rather than painted
                // translucent, so one sprite serves and the room shows through all of them equally.
                GHOSTS.includes(speaker) && "opacity-70",
                visible ? "translate-y-0" : "translate-y-1/1"
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}
