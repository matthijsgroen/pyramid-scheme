import { useMergedDevGrants } from "./devActionContributions"
import type { DevAction } from "@/ui/molecules/DevPanel"

// The cheat menu's actions, so expert+ content is reachable without replaying up to it. Grants come
// from the mod that owns what they hand out, through the same public APIs real play uses, so a
// granted world is indistinguishable from an earned one.
export const useDevActions = (): DevAction[] => {
  const grants = useMergedDevGrants()

  return grants.length === 0
    ? []
    : [
        { label: "Unlock everything", onClick: () => grants.forEach(g => g.grant()) },
        ...grants.map(({ label, grant }) => ({ label, onClick: grant })),
      ]
}
