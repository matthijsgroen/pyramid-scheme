import clsx from "clsx"
import { useEffect, useState, type FC } from "react"
import { useTranslation } from "react-i18next"
import { spokenLines, type Speaker } from "./arrivalConversation"
import { Portrait } from "./Portrait"
import { portraitFor } from "./portraits"
import { storyExpression } from "./storyPoses"
import { pose, TUTORIAL_LINES, type PoseChat } from "./tutorialLines"

const NOT_FOUND = pose("default", ["not-found"])

/**
 * The lines a conversation id plays.
 *
 * A conversation not in `TUTORIAL_LINES` is read out of the translations instead — the arrivals and
 * the tomb scenes are authored that way, because a new beat should cost a key rather than a code
 * change. Their expressions come from `storyPoses`.
 */
const writtenLines = (conversation: string, hasLine: (key: string) => boolean): PoseChat[] => {
  const table = TUTORIAL_LINES[conversation]
  if (table) return table
  const spoken = spokenLines(conversation, hasLine)
  return spoken.length > 0
    ? spoken.map(line => {
        const { pose, face } = storyExpression(line.key)
        return [pose, line.key, line.speaker, face] as PoseChat
      })
    : NOT_FOUND
}

const fezSpeaks = (lines: PoseChat[]): boolean => lines.some(([, , speaker]) => (speaker ?? "fez") === "fez")

/**
 * The lines a conversation plays, or nothing when Fez speaks in it and has not been met yet.
 *
 * Dropped whole rather than with his lines cut, so the explorer never answers nobody. A line the
 * player needs before the meeting is the explorer's in `TUTORIAL_LINES` (`asExplorer`), not Fez's.
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
  // A pose nobody has drawn for this speaker yet is their default, never an empty space beside the bubble.
  const portrait = portraitFor(speaker, pose, current?.[3])
  const wide = portrait?.wide === true
  // Every face this speaker wears in the conversation is mounted with the figure and only shown on its
  // line, so a look arriving mid-conversation is already loaded and never flashes the bare figure.
  const faces = [
    ...new Set(
      messages
        .filter(([, , who]) => (who ?? "fez") === speaker)
        .map(([linePose, , , face]) => portraitFor(speaker, linePose, face)?.face)
        .filter(src => src !== undefined)
    ),
  ]

  if (unmet) return null

  return (
    // Clipped, so a portrait hanging past a phone's edge never scrolls the page sideways.
    <div className="fixed inset-0 z-10 overflow-hidden bg-black/10" onClick={onNextMessage}>
      {/* The column the game's panels share (max-w-md), centred: on a wide screen the viewport's
          corners are far from the game and from each other, and the two speakers stood in them. On a
          phone the column is the screen, so nothing moves there. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-md">
        <div
          className={clsx(
            "absolute bottom-0",
            speaker === "explorer" ? "pl-6" : "pr-6",
            // A human sprite carries 80px more of the figure behind him (`--behind=0.4`). A phone has
            // no room for it, so it hangs past the screen's edge there; a wider screen has the column
            // to stand him whole in.
            !wide && (speaker === "explorer" ? "right-0" : "left-0"),
            wide && (speaker === "explorer" ? "-right-20 min-[28rem]:right-0" : "-left-20 min-[28rem]:left-0")
          )}
        >
          <div
            className={clsx(
              "mb-2 max-w-xs rounded border border-black bg-white p-3 text-black shadow-lg transition-all duration-300",
              speaker === "explorer" ? "origin-bottom-right" : "origin-bottom-left",
              speaker === "explorer" ? (wide ? "mr-35" : "mr-15") : wide ? "ml-35" : "ml-15",
              showMessage ? "rotate-0 opacity-100" : "rotate-12 opacity-0"
            )}
          >
            {t(current?.[1])}
          </div>
          {portrait && (
            <Portrait
              // One element per speaker: the slide-in transitions every transform, the mirror included, so a
              // shared element would visibly spin round each time the other one spoke.
              key={speaker}
              speaker={speaker}
              art={portrait}
              faces={faces}
              className={clsx(
                "-mb-15 transition-transform duration-300",
                // The sprite is narrower than the bubble above it, so on the right-hand side it has to
                // be pushed over: left-aligned in a right-anchored column, the explorer stood inboard
                // of the edge instead of opposite Fez, and the two of them did not face each other.
                speaker === "explorer" && "ml-auto",
                visible ? "translate-y-0" : "translate-y-1/1"
              )}
            />
          )}
        </div>
      </div>
    </div>
  )
}
