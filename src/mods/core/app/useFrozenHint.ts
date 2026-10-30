import { useCallback, useState } from "react"

/**
 * Holds a family's hint as it was when the player asked, so a revealed hint is not recomputed from every
 * board change: a hint that names several squares has to keep naming the same ones while the player
 * carries them out.
 *
 * Wire it to the shell: `freeze` is `onHintRevealed`, `drop` is `onHintHidden`, and the shell's `hint`
 * prop reads `hint` (a function, so nothing is built before the ask):
 *
 *   const { hint: frozen, freeze, drop } = useFrozenHint(() => buildHint(puzzle, state))
 *   <PuzzleFamilyShell hint={() => frozen && hintText(frozen)} onHintRevealed={freeze} onHintHidden={drop}>
 *
 * `freeze` and the shell's reveal land in the same batch, so the frozen value is there on the first
 * render that shows the hint. `build` is the latest render's, so it sees the board as the player asked.
 */
export const useFrozenHint = <H>(build: () => H | undefined) => {
  const [hint, setHint] = useState<H | undefined>(undefined)
  const freeze = () => setHint(() => build())
  const drop = useCallback(() => setHint(undefined), [])

  return { hint, freeze, drop }
}
