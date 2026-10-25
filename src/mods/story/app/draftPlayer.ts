import { use, useMemo } from "react"
import { registerDevGrants, type DevGrant } from "@/app/dev/devActionContributions"
import { FezContext } from "@/app/fez/context"
import { isModEnabled } from "@/mods/registeredMods"
import { DRAFT_BEATS } from "../game/drafts"

type Show = (
  id: string,
  onComplete?: () => void,
  options?: { forceReplay?: boolean; story?: boolean; unrecorded?: boolean }
) => void

/**
 * One develop-mode grant per area of drafts, offering each beat of the area in order. `unrecorded` keeps the
 * heard save as it was, so previewing a draft never silences the real beat when its moment comes.
 */
export const draftGrants = (drafts: Readonly<Record<string, readonly string[]>>, show: Show): DevGrant[] =>
  Object.entries(drafts).map(([area, ids]) => ({
    label: `Story drafts: ${area}`,
    inUnlockEverything: false,
    grant: () => ids.forEach(id => show(id, undefined, { forceReplay: true, story: true, unrecorded: true })),
  }))

const useDraftGrants = () => {
  const { showConversation } = use(FezContext)
  return useMemo(() => draftGrants(DRAFT_BEATS, showConversation), [showConversation])
}

if (isModEnabled("story")) registerDevGrants(useDraftGrants)
