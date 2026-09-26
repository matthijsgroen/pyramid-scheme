import { type FC, useState } from "react"
import { useTranslation } from "react-i18next"
import clsx from "clsx"
import { Page } from "@/ui/atoms/Page"
import { useGameStorage } from "@/support/useGameStorage"
import { GHOSTS, spokenLines, type Speaker } from "@/app/fez/arrivalConversation"
import { PORTRAITS } from "@/app/fez/portraits"
import { heardScenes } from "@/mods/story/game/log/heardScenes"

/** Who said it, for a transcript with nobody's face in it. */
const Said: FC<{ speaker: Speaker; text: string }> = ({ speaker, text }) => {
  const { t } = useTranslation("common")
  const portrait = PORTRAITS[speaker]?.default
  const explorer = speaker === "explorer"

  return (
    <li className={clsx("flex items-start gap-2", explorer && "flex-row-reverse")}>
      {portrait && (
        <img
          src={portrait.src}
          alt=""
          className={clsx("size-10 shrink-0 object-cover object-top", GHOSTS.includes(speaker) && "opacity-70")}
        />
      )}
      <div
        className={clsx("max-w-[80%] rounded border border-amber-900/40 bg-amber-50/90 px-3 py-2 text-sm text-black")}
      >
        <span className="mb-0.5 block text-xs font-bold text-amber-900">{t(`story.speaker.${speaker}`)}</span>
        {text}
      </div>
    </li>
  )
}

/**
 * Everything the player has been told, to read back.
 *
 * A beat plays once and is gone — tapped through on a phone, possibly while somebody was talking to
 * them. The lines are translations and the save already records which scenes have played, so the log
 * is a read of what is there rather than anything it has to keep for itself.
 */
export const StoryLogPage: FC = () => {
  const { t, i18n } = useTranslation(["common", "journeys"])
  const [played] = useGameStorage<Record<string, boolean>>("conversations", {})
  const [open, setOpen] = useState<string | null>(null)

  const scenes = heardScenes(played)
  const linesOf = (id: string) => spokenLines(id, key => i18n?.exists?.(key, { ns: "fez" }) === true)

  return (
    <Page className="flex flex-col gap-3 overflow-y-auto bg-gradient-to-b from-amber-100 to-amber-200 p-4" snap="end">
      <h1 className="font-pyramid text-2xl text-amber-950">{t("story.log.title")}</h1>

      {scenes.length === 0 ? (
        <p className="text-sm text-amber-900">{t("story.log.empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {scenes.map(scene => {
            const showing = open === scene.id
            return (
              <li key={scene.id} className="rounded-lg border border-amber-900/30 bg-amber-50/70">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left font-bold text-amber-950"
                  onClick={() => setOpen(showing ? null : scene.id)}
                  aria-expanded={showing}
                >
                  {t(`${scene.journeyId}.name`, { ns: "journeys" })}
                  <span aria-hidden>{showing ? "▾" : "▸"}</span>
                </button>
                {showing && (
                  <ul className="flex flex-col gap-2 px-3 pb-3">
                    {linesOf(scene.id).map(line => (
                      <Said key={line.key} speaker={line.speaker} text={t(line.key, { ns: "fez" })} />
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Page>
  )
}
