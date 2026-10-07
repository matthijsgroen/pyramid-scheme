import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import fezEn from "../../../../public/locales/en/fez.json"
import { generatedWorldConfigs } from "@/data/generatedWorld"
import { journeys } from "@/data/journeys"
import { Fez } from "@/app/fez/Fez"
import { JOURNEYS_WITH_ARRIVAL } from "@/app/fez/arrivalConversation"
import { sceneFor } from "../game/conversation/sceneFor"
import { WALLS } from "../game/reading/walls"

// EVERY STORY BEAT, PLAYED AS THE GAME PLAYS IT, with where it lands. The beats are read from `fez.json` and
// their places from the baked world, `sceneFor`, `WALLS` and `JOURNEYS_WITH_ARRIVAL`, so a beat nothing fires
// shows up here as unplaced rather than going unheard. Only what code cannot say (a bond's trigger, a beat
// whose mechanism is unbuilt) is written down below.

type Kind = "arrival" | "tomb" | "bond" | "reading" | "unplaced"
type Beat = { id: string; lines: number; landed?: string; placement?: string }

const nameOf = (journeyId: string) => journeys.find(journey => journey.id === journeyId)?.name ?? journeyId

/** `<conversation>.<n>.<speaker>` keys, counted per conversation. */
const conversations = (): Map<string, number> => {
  const found = new Map<string, number>()
  const walk = (node: object, path: string[]) => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "object" && value !== null) walk(value, [...path, key])
      else if (/^\d+$/.test(path[path.length - 1] ?? "")) {
        const id = path.slice(0, -1).join(".")
        found.set(id, (found.get(id) ?? 0) + 1)
      }
    }
  }
  walk(fezEn, [])
  return found
}

/** Where the world stands a room of `encounter`, per journey: "floor F, room R of N". */
const roomsOf = (encounter: string): Map<string, string[]> => {
  const found = new Map<string, string[]>()
  for (const [journeyId, sites] of Object.entries(generatedWorldConfigs))
    sites.forEach(floors =>
      floors.forEach((floor, floorIndex) => {
        const walk = (section: { encountersByIndex?: Record<string, unknown>; pathPuzzles: number }, side: string) => {
          for (const [index, at] of Object.entries(section.encountersByIndex ?? {}))
            if (at === encounter)
              found.set(journeyId, [
                ...(found.get(journeyId) ?? []),
                `floor ${floorIndex + 1}${side}, room ${Number(index) + 1} of ${section.pathPuzzles}`,
              ])
        }
        walk(floor, "")
        ;(floor.sideSections ?? []).forEach((sub, i) => walk(sub, `, side path ${sub.label ?? i + 1}`))
      })
    )
  return found
}

const TOMB_ROOM =
  "A `conversation` room on the tomb floor, which is authored one room longer for it. Never ahead of a tableau (tableaus are numbered by position); from junior on never last either (the crocodile capstone), so it stands second-to-last."

/** What only the code's control flow knows (`beatFor`), or what nothing builds yet. */
const BY_HAND: Record<string, Pick<Beat, "landed" | "placement">> = {
  "bond.starter": { landed: "First board solved without hints at starter tier (reaction rail)." },
  "bond.junior": { landed: "First board solved without hints at junior tier (reaction rail)." },
  "bond.expert": { landed: "First trap beaten close (reaction rail)." },
  "bond.starterTomb": { landed: `Leaving ${nameOf("starter_treasure_tomb")} (reaction rail).` },
  "bond.wizard": { landed: `Leaving ${nameOf("wizard_treasure_tomb_c")}, after the mural (reaction rail).` },
  "bond.master": {
    placement: "Fires when the priest refuses a forgery: the offering arc, not built.",
  },
  "altar.refused": {
    placement: "The priest's altar (offering encounter), not built. Will need an authored room in a tomb.",
  },
  end: { placement: "Authored; nothing fires it. Where it goes is still to decide." },
}

const catalogue = (): Record<Kind, Beat[]> => {
  const conversationRooms = roomsOf("conversation")
  const readingRooms = roomsOf("reading")
  const sorted: Record<Kind, Beat[]> = { arrival: [], tomb: [], bond: [], reading: [], unplaced: [] }
  for (const [id, lines] of conversations()) {
    const kind = id.split(".")[0]
    if (!["arrival", "tomb", "bond", "reading", "altar", "end"].includes(kind)) continue
    const beat: Beat = { id, lines, ...BY_HAND[id] }

    if (kind === "arrival") {
      const journeyId = id.slice("arrival.".length)
      if (JOURNEYS_WITH_ARRIVAL.has(journeyId))
        beat.landed = `Travel screen, setting off for ${nameOf(journeyId)} (${journeyId}).`
    }
    if (kind === "tomb") {
      const placed = [...conversationRooms].filter(([journeyId]) => sceneFor(journeyId) === id)
      if (placed.length > 0) {
        beat.landed = placed.map(([journeyId, at]) => `${nameOf(journeyId)} (${journeyId}), ${at.join("; ")}`).join(" ")
        beat.placement = TOMB_ROOM
      }
    }
    const wall = Object.entries(WALLS).find(([, candidate]) => candidate.after === id)
    if (wall) {
      const [journeyId] = wall
      beat.landed = `After the wall is read in ${nameOf(journeyId)} (${journeyId}), ${readingRooms.get(journeyId)?.join("; ") ?? "no reading room"}.`
      beat.placement = "A `reading` room standing the wall (`WALLS`); the scene plays once the right sign is placed."
    }

    const grouped = kind === "altar" || kind === "end" || beat.landed === undefined ? "unplaced" : (kind as Kind)
    sorted[grouped].push(beat)
  }
  return sorted
}

const BeatCard = ({ beat, onPlay }: { beat: Beat; onPlay: () => void }) => (
  <li className="rounded border border-stone-600 bg-stone-800 p-3 text-sm text-stone-200">
    <div className="flex items-center justify-between gap-2">
      <code className="font-semibold text-amber-300">{beat.id}</code>
      <span className="text-stone-400">{beat.lines} lines</span>
      <button type="button" className="rounded bg-amber-600 px-2 py-1 text-black" onClick={onPlay}>
        Play
      </button>
    </div>
    <p className="mt-1">
      <span className="text-stone-400">Lands: </span>
      {beat.landed ?? <span className="text-red-400">nowhere: nothing fires it</span>}
    </p>
    <p className="mt-1">
      <span className="text-stone-400">Placement: </span>
      {beat.placement ?? "none, no room in a level"}
    </p>
  </li>
)

const StoryBeats = ({ kind }: { kind: Kind }) => {
  const [playing, setPlaying] = useState<string>()
  const [run, setRun] = useState(0)
  const beats = catalogue()[kind]
  return (
    <div className="min-h-screen bg-stone-900 p-4">
      <ul className="grid gap-2">
        {beats.map(beat => (
          <BeatCard
            key={beat.id}
            beat={beat}
            onPlay={() => {
              setPlaying(beat.id)
              setRun(n => n + 1)
            }}
          />
        ))}
      </ul>
      {playing && <Fez key={run} conversation={playing} onComplete={() => setPlaying(undefined)} />}
    </div>
  )
}

const meta = {
  title: "Story/Beats",
  component: StoryBeats,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof StoryBeats>

export default meta
type Story = StoryObj<typeof meta>

/** One per journey, on the travel screen as the player sets off: no room in any level. */
export const Arrivals: Story = { args: { kind: "arrival" } }

/** A ghost in each tomb, in a conversation room authored onto the tomb floor. */
export const TombScenes: Story = { args: { kind: "tomb" } }

/** Fez remarking on how the player plays, each once ever: no room in any level. */
export const Bonds: Story = { args: { kind: "bond" } }

/** What is said once a wall is read: the wall is a reading room in a level. */
export const Readings: Story = { args: { kind: "reading" } }

/** Written, but nothing in the game plays them yet. */
export const NotYetPlaced: Story = { args: { kind: "unplaced" } }
