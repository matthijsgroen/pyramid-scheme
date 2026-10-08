import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { getFamilyPlugin } from "@/app/families/familyRegistry"
import type { ArrivalPrompt } from "./useSiteNavigation"

/**
 * WHAT THE PROMPT BESIDE THE EXPLORER SAYS. Every key is written out in a `t("…")` call, so the locale guard
 * (src/i18n/keys.spec.ts) sees each one. A room's words are its family's own (FamilyMeta.invitation), read
 * through the registry so core names no mod; `here` is for a room whose family names none, or whose mod is off.
 */
export const usePromptLabel = (): ((prompt: ArrivalPrompt) => string) => {
  const { t } = useTranslation("common")
  return useCallback(
    (prompt: ArrivalPrompt): string => {
      switch (prompt.kind) {
        case "obstacle":
          // A crossing's words are its realisation's own; one no mod declares still says it cannot be undone.
          return prompt.invitation ? t(prompt.invitation) : t("ui.prompt.oneWay")
        case "plate":
          return prompt.stone === "lift" ? t("ui.prompt.liftStone") : t("ui.prompt.setStone")
        case "stairs":
          return t("ui.prompt.stairs")
        case "exit":
          return t("ui.prompt.exit")
        case "room": {
          const invitation = prompt.familyId ? getFamilyPlugin(prompt.familyId)?.meta.invitation : undefined
          return invitation ? t(invitation) : t("ui.prompt.here")
        }
      }
    },
    [t]
  )
}

/** WHAT A NOTICE SAYS: one line for every walk a stone in hand stops (stairs, the way out, every one-way and every
 * passage, which all take empty hands). */
export const useNoticeLabel = (): string => {
  const { t } = useTranslation("common")
  return t("ui.blocked.carrying")
}
