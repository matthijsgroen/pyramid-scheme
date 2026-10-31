import type { useTranslation } from "react-i18next"
import type { Refusal } from "./roomEditing"

type T = ReturnType<typeof useTranslation>["t"]

/** Why the drawing refused an edit, in words. */
export const refusalText = (t: T, refusal: Refusal): string =>
  t(`devRoomEditor.refused.${refusal.refused}`, { message: refusal.message })
