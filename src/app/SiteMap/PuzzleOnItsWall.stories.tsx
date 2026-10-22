import { useMemo, type FC } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { difficulties, type Difficulty } from "@/data/difficultyLevels"
import { allFamilies, type FamilyContext, type FamilyPlugin } from "@/app/families/familyRegistry"
import { allowedDifficulties, playableInLab } from "@/app/dev/puzzleLabOptions"
import { useProgression } from "@/app/state/useProgression"
import { useJourneys } from "@/app/state/useJourneys"
import { useInventory } from "@/app/Inventory/useInventory"
import { EncounterModal } from "./EncounterModal"
import { FezContext } from "@/app/fez/context"
import "@/mods/registerModApps"

// Every board the bench can play, on the wall of the rank it is met at — for judging a wall repaint
// (src/assets/tombWall/<rank>.webp) against all of them at once. The families come from the registry
// through the puzzle lab's own filter, so a new family shows up here without touching this file, and
// one the lab cannot play standalone (it needs a fork, a floor or a shop around it) is listed instead.
const benchFamilies = allFamilies().filter(family => playableInLab(family.meta))
const siteBound = allFamilies().filter(family => !playableInLab(family.meta))

const SEED = 1

/** A family's faces, the plain one first: every id its role map names (`FamilyMeta.faces`). */
const facesOf = (family: FamilyPlugin): string[] => [
  "default",
  ...new Set(
    Object.values(family.meta.faces ?? {})
      .flat()
      .filter(face => face !== "default")
  ),
]

// The tableau asks Fez to explain it on first sight; here nobody is around to say it.
const NO_FEZ = { showConversation: () => {} }

const PuzzleOnItsWall: FC<{ familyId: string; difficulty: Difficulty; face?: string }> = ({
  familyId,
  difficulty,
  face = "default",
}) => {
  const family = benchFamilies.find(f => f.meta.id === familyId)
  if (!family) return <p className="p-4 text-white">No family {familyId} in the registry.</p>
  if (!allowedDifficulties(family.meta).includes(difficulty))
    return (
      <p className="p-4 text-center text-stone-300">
        {family.meta.icon} {family.meta.id} debuts at {family.meta.minTier}, not {difficulty}.
      </p>
    )
  return (
    <EncounterModal tileset={difficulty}>
      <Board key={`${family.meta.id}:${difficulty}:${face}`} family={family} difficulty={difficulty} face={face} />
    </EncounterModal>
  )
}

const Board: FC<{ family: FamilyPlugin; difficulty: Difficulty; face: string }> = ({ family, difficulty, face }) => {
  const progression = useProgression()
  const journeys = useJourneys()
  const inventory = useInventory()
  const ctx = useMemo(
    (): FamilyContext => ({
      journeyId: "puzzle-on-its-wall",
      levelNr: 1,
      edgeId: `story:${SEED}`,
      address: `story#${SEED}@rencounter`,
      sectionHash: "story",
      freshArrival: true,
      difficulty,
      // A face is asked for by name the way the puzzle lab asks: through the theme, "default" being no ask.
      theme: face === "default" ? undefined : face,
      tags: family.meta.tags,
    }),
    [family, difficulty, face]
  )
  const generated = useMemo(() => {
    try {
      return { puzzle: family.generate(SEED, ctx) }
    } catch (error) {
      return { error: (error as Error).message }
    }
  }, [family, ctx])
  if ("error" in generated)
    return (
      <p className="text-red-300">
        {family.meta.id} did not generate: {generated.error}
      </p>
    )
  const Component = family.Component
  return (
    <Component
      puzzle={generated.puzzle}
      ctx={ctx}
      progression={progression}
      journeys={journeys}
      inventory={inventory}
      applyReward={() => {}}
      onSolved={() => {}}
      onCancel={() => {}}
    />
  )
}

const meta = {
  component: PuzzleOnItsWall,
  decorators: [
    Story => (
      <FezContext value={NO_FEZ}>
        <Story />
      </FezContext>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Every puzzle family (${benchFamilies.map(f => f.meta.id).join(", ")}) in the encounter frame the game opens it in, against the chosen rank's wall, built from its real seed list at seed ${SEED}. Not shown, being what the puzzle lab does not play either (a room that needs a site around it, such as a fork, a mechanism, a shop, a key or a conversation, or a reflex trap rather than a board): ${siteBound.map(f => f.meta.id).join(", ")}.`,
      },
    },
  },
  argTypes: {
    familyId: { control: "select", options: benchFamilies.map(f => f.meta.id) },
    difficulty: { control: "inline-radio", options: difficulties },
    // Every face any family has; one this family lacks falls through to its plain board.
    face: { control: "select", options: [...new Set(benchFamilies.flatMap(facesOf))] },
  },
  args: { familyId: benchFamilies[0]?.meta.id ?? "", difficulty: "starter", face: "default" },
} satisfies Meta<typeof PuzzleOnItsWall>

export default meta
type Story = StoryObj<typeof meta>

/** One board on its wall: flip the family and the rank. */
export const OneFamily: Story = {}

/** Every board in every face on the same rank's wall, one under the other: flip the rank to repaint-check them all. */
export const EveryFamily: Story = {
  argTypes: { familyId: { table: { disable: true } }, face: { table: { disable: true } } },
  render: ({ difficulty }) => (
    <div className="flex flex-col gap-8 bg-black">
      {benchFamilies.flatMap(family =>
        facesOf(family).map(face => (
          // `contain: paint` makes this block the frame's containing block, so each `fixed inset-0` frame fills
          // its own slot instead of all of them stacking over the viewport.
          <div key={`${family.meta.id}:${face}`} className="relative min-h-180" style={{ contain: "paint" }}>
            <PuzzleOnItsWall familyId={family.meta.id} difficulty={difficulty} face={face} />
          </div>
        ))
      )}
    </div>
  ),
}
