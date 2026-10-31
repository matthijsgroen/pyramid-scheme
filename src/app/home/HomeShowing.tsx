import { useEffect } from "react"
import { useHomeHooks } from "@/app/home/homeHooks"
import { useHomeTags } from "@/app/home/homeTags"
import { useReportOnce } from "@/app/reactions/useReport"
import type { Arrival } from "@/app/home/ComingHome"

// Mounted once the player has settled in (after the coming-home screen), so a mod's hook never speaks behind it.
// The home showing is reported once here too, with whether the player has just come home, once every tag source
// has read its save: a fresh mount starts from defaults, and a report before the read would carry no tags. The
// arrival's own tags (what this homecoming brought) join the home's tags on that one report.
export const HomeHooks = ({ arrived, onReported }: { arrived?: Arrival; onReported: () => void }) => {
  useHomeHooks()
  const { tags, loaded } = useHomeTags()
  useReportOnce(loaded ? "shown" : undefined, {
    kind: "homeShown",
    arrived: arrived && { haul: arrived.haul },
    tags: [...tags, ...(arrived?.tags ?? []).filter(tag => !tags.includes(tag))],
  })
  // The arrival is told once; a later showing of the home is not an arrival.
  useEffect(() => {
    if (loaded) onReported()
  }, [loaded, onReported])
  return null
}
