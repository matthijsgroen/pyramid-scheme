import { useMemo, useState, type FC } from "react"
import { allFamilies } from "@/app/families/familyRegistry"
import { EncounterModal } from "@/app/SiteMap/EncounterModal"
import { useProgression } from "@/app/state/useProgression"
import { useJourneys } from "@/app/state/useJourneys"
import { useInventory } from "@/app/Inventory/useInventory"
import { DeveloperButton } from "@/ui/atoms/DeveloperButton"
import { allowedDifficulties, themesFor } from "./puzzleLabOptions"

const selectClass = "rounded-md border border-red-400 bg-stone-900 px-2 py-1 text-sm text-white"

/**
 * The generator's own decisions about the board on screen, for whichever families record any.
 *
 * Read off the generated puzzle rather than declared per family, because these are debug facts and the bench
 * is the only place they are wanted — a family that starts recording one gets it here for free, and one that
 * records none says nothing.
 */
const benchNotes = (puzzle: unknown): string[] => {
  if (typeof puzzle !== "object" || puzzle === null) return []
  const { goals, modes, techniqueCap, size, movable, fixed } = puzzle as {
    goals?: unknown
    modes?: unknown
    techniqueCap?: unknown
    size?: unknown
    movable?: unknown
    fixed?: unknown
  }
  return [
    typeof size === "number" ? `${size}×${size}` : undefined,
    typeof techniqueCap === "string" ? `cap ${techniqueCap}` : undefined,
    Array.isArray(movable) ? `${movable.length} pieces` : undefined,
    Array.isArray(fixed) ? `${fixed.length} fixed` : undefined,
    // A generator that records modes rather than goals says so — they are what replaces them.
    Array.isArray(modes) ? (modes.length ? `modes ${modes.join(" + ")}` : "modes — (baseline)") : undefined,
    Array.isArray(goals) && !Array.isArray(modes)
      ? goals.length
        ? `goals ${goals.join(" + ")}`
        : "goals — (baseline)"
      : undefined,
  ].filter((note): note is string => note !== undefined)
}

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
  const [pickedVariant, setPickedVariant] = useState("")
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
  const variants = family?.meta.variants ?? []
  const variant = variants.includes(pickedVariant) ? pickedVariant : variants[0]

  const ctx = useMemo(
    () => ({
      journeyId: "puzzle-lab",
      edgeId: `lab:${seed}`,
      sectionHash: "lab",
      freshArrival: true,
      difficulty,
      theme,
      variant,
      tags: family?.meta.tags,
    }),
    [seed, difficulty, theme, variant, family]
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
        {/* Only for a family that has a second generator to compare — see FamilyMeta.variants. */}
        {variants.length > 1 && (
          <select className={selectClass} value={variant} onChange={e => setPickedVariant(e.target.value)}>
            {variants.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
        <DeveloperButton label="Play" onClick={() => setPlaying(true)} />
        <DeveloperButton
          label={`New puzzle (seed ${seed})`}
          onClick={() => {
            setSeed(prev => prev + 1)
            setPlaying(true)
          }}
        />
      </div>
      {/* What the generator decided, for the families that decide anything. Without this the bench can
          only say a board felt different, not which of its knobs was turned — and for a family that draws
          per-board goals (lightbeam), telling the spread apart from noise is the whole point of playing it. */}
      {playing && puzzle !== undefined && benchNotes(puzzle).length > 0 && (
        <p className="mt-2 text-center text-xs text-red-300">{benchNotes(puzzle).join(" · ")}</p>
      )}
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
