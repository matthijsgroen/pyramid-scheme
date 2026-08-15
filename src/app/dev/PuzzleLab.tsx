import { useMemo, useState, type FC } from "react"
import { allFamilies } from "@/app/families/familyRegistry"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { useProgression } from "@/app/state/useProgression"
import { useJourneys } from "@/app/state/useJourneys"
import { useInventory } from "@/app/Inventory/useInventory"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { allowedDifficulties, themesFor } from "./puzzleLabOptions"

const selectClass = "rounded-md border border-red-400 bg-stone-900 px-2 py-1 text-sm text-white"

// Playtesting bench for puzzle families: pick family + theme + tier, play the real screen without
// walking a pyramid to a room that happens to serve it. Renders through the same EncounterModal and
// plugin Component real gameplay uses, so what is judged here is what ships.
//
// Rewards are deliberately dropped (applyReward is a no-op): the lab exercises the puzzle screen,
// not the economy — a bench that hands out loot would corrupt the save it is testing against.
export const PuzzleLab: FC = () => {
  const families = useMemo(() => allFamilies().filter(p => p.meta.tags.includes("puzzle")), [])
  const [familyId, setFamilyId] = useState(families[0]?.meta.id ?? "")
  const [pickedTheme, setPickedTheme] = useState("")
  const [pickedDifficulty, setPickedDifficulty] = useState("")
  const [seed, setSeed] = useState(1)
  const [playing, setPlaying] = useState(false)

  const progression = useProgression()
  const journeys = useJourneys()
  const inventory = useInventory()

  const family = families.find(f => f.meta.id === familyId) ?? families[0]

  // Selections are clamped on read rather than synced in an effect: switching to a family that
  // doesn't offer the current theme/tier silently falls back to its first valid one.
  const themes = family ? themesFor(family.meta) : []
  const theme = themes.includes(pickedTheme) ? pickedTheme : themes[0]
  const tiers = family ? allowedDifficulties(family.meta) : []
  const difficulty = tiers.find(d => d === pickedDifficulty) ?? tiers[0]

  const ctx = useMemo(
    () => ({
      journeyId: "puzzle-lab",
      edgeId: `lab:${seed}`,
      sectionHash: "lab",
      freshArrival: true,
      difficulty,
      theme,
      tags: family?.meta.tags,
    }),
    [seed, difficulty, theme, family]
  )

  const puzzle = useMemo(
    () => (playing && family ? family.generate(seed, ctx) : undefined),
    [playing, family, seed, ctx]
  )

  if (!family) return null
  const Component = family.Component

  return (
    <div className="mb-4 w-full rounded border-2 border-dashed border-red-500 bg-red-950/40 p-2">
      <h3 className="mb-2 text-center text-xs font-bold tracking-wide text-red-300 uppercase">Puzzle lab</h3>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <select className={selectClass} value={family.meta.id} onChange={e => setFamilyId(e.target.value)}>
          {families.map(f => (
            <option key={f.meta.id} value={f.meta.id}>
              {f.meta.icon} {f.meta.id}
            </option>
          ))}
        </select>
        <select className={selectClass} value={theme} onChange={e => setPickedTheme(e.target.value)}>
          {themes.map(name => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select className={selectClass} value={difficulty} onChange={e => setPickedDifficulty(e.target.value)}>
          {tiers.map(tier => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </select>
        <DeveloperButton label="Play" onClick={() => setPlaying(true)} />
        <DeveloperButton
          label={`New puzzle (seed ${seed})`}
          onClick={() => {
            setSeed(prev => prev + 1)
            setPlaying(true)
          }}
        />
      </div>
      {playing && puzzle !== undefined && (
        <EncounterModal>
          <Component
            puzzle={puzzle}
            ctx={ctx}
            progression={progression}
            journeys={journeys}
            inventory={inventory}
            applyReward={() => {}}
            onSolved={() => setPlaying(false)}
            onCancel={() => setPlaying(false)}
          />
        </EncounterModal>
      )}
    </div>
  )
}
