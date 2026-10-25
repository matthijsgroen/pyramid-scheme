import { useMergedDevGrants, useMergedDevJumps } from "./devActionContributions"
import type { DevAction } from "@/ui/molecules/DevPanel"

// The cheat menu's actions, so expert+ content is reachable without replaying up to it. Grants come
// from the mod that owns what they hand out, through the same public APIs real play uses, so a
// granted world is indistinguishable from an earned one. Jumps stand the explorer in a room and then
// call `onJumped`, which opens the expedition. A grant that only plays something to look at calls `onLook`,
// which closes the menu so it can be seen.
export const useDevActions = (onJumped: () => void = () => {}, onLook: () => void = () => {}): DevAction[] => {
  const grants = useMergedDevGrants()
  const jumps = useMergedDevJumps()

  return [
    ...(grants.length === 0
      ? []
      : [
          {
            label: "Unlock everything",
            onClick: () => grants.forEach(g => g.inUnlockEverything !== false && g.grant()),
          },
          ...grants.map(({ label, grant, inUnlockEverything }) => ({
            label,
            onClick:
              inUnlockEverything === false
                ? () => {
                    grant()
                    onLook()
                  }
                : grant,
          })),
        ]),
    ...jumps.map(({ label, jump }) => ({ label, onClick: () => void jump().then(onJumped) })),
  ]
}
