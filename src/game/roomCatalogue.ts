// DESIGNED ROOMS, each a `.room` file in ./rooms, written in prefabNotation.ts's notation; `yarn room <name>`
// draws one. Read from disk, so the CLI, the world spec at bake time and tests only.
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { difficulties } from "@/data/difficultyLevels"
import type { Difficulty } from "@/data/difficultyLevels"
import { prefabFaults } from "./prefabChecks"
import { PREFAB_SYNTAX, parsePrefab } from "./prefabNotation"
import type { Prefab } from "./prefabTypes"

// A path, never a `new URL(…, import.meta.url)`: under jsdom (the verify sweeps) `URL` is the browser's, and
// resolves against an http origin.
const here = dirname(fileURLToPath(import.meta.url))

export type RoomEntry = { name: string; tier: Difficulty; path: string; text: string }

const filesUnder = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(join(folder, entry.name)).map(file => `${entry.name}/${file}`) : [entry.name]
  )

/**
 * Every room under a rooms root: one folder per tier. A room goes by its bare file name, so two files with one
 * name are refused, as is a room outside a tier folder or one whose `tier` header is another tier. A
 * `<name>-blocked.room` is kept for its designer to fix and never read.
 */
export const roomEntriesIn = (root: string): RoomEntry[] => {
  const entries: RoomEntry[] = []
  for (const file of filesUnder(root).filter(f => f.endsWith(".room") && !f.endsWith("-blocked.room"))) {
    const [tier, ...rest] = file.split("/")
    if (!(difficulties as readonly string[]).includes(tier) || rest.length === 0)
      throw new Error(`room ${file} is not in a tier folder (${difficulties.join(", ")})`)
    const path = rest.join("/").slice(0, -".room".length)
    const name = path.split("/").pop()!
    const twin = entries.find(entry => entry.name === name)
    if (twin) throw new Error(`two rooms are called ${name}: ${twin.tier}/${twin.path} and ${tier}/${path}`)
    const text = readFileSync(join(root, file), "utf8")
    const declared = parsePrefab(text, name).tier
    if (declared !== tier) throw new Error(`room ${file} says tier ${declared} but lies in the ${tier} folder`)
    entries.push({ name, tier: tier as Difficulty, path, text })
  }
  return entries
}

/** The parsed rooms under a rooms root. */
export const roomCatalogueIn = (root: string): Readonly<Record<string, Prefab>> =>
  Object.fromEntries(roomEntriesIn(root).map(entry => [entry.name, parsePrefab(entry.text, entry.name)]))

export const ROOM_ENTRIES = roomEntriesIn(join(here, "rooms"))
export const ROOM_CATALOGUE: Readonly<Record<string, Prefab>> = Object.fromEntries(
  ROOM_ENTRIES.map(entry => [entry.name, parsePrefab(entry.text, entry.name)])
)

export const findRoom = (name: string): Prefab | undefined => ROOM_CATALOGUE[name]

/** A room from its .room file, for the world spec; refused when missing or when its own check finds a fault. */
export const catalogueRoom = (name: string, catalogue: Readonly<Record<string, Prefab>> = ROOM_CATALOGUE): Prefab => {
  const prefab = catalogue[name]
  if (!prefab) throw new Error(`no room ${name} in src/game/rooms`)
  const faults = prefabFaults(prefab)
  if (faults.length > 0) throw new Error(`room ${name} is not sound: ${faults.join("; ")}`)
  return prefab
}

/** A fresh room file: the notation as comments above a minimal room that already passes its check. */
export const newRoomText = (tier: Difficulty, name: string): string =>
  [
    "// A new room. Lines starting with // are ignored.",
    "//",
    ...PREFAB_SYNTAX.split("\n").map(line => `//${line}`.trimEnd()),
    "",
    `room ${name}`,
    `tier ${tier}`,
    "layout",
    "# # # # #",
    "# . . . #",
    "# . s . #",
    "# . . . #",
    "# # d # #",
    "s stop",
    "",
  ].join("\n")
