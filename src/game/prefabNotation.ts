// A ROOM PREFAB WRITTEN AS TEXT: a header, named lists, one or more drawn layouts and a legend of places, read
// into the Prefab type (prefabTypes.ts). The notation is PREFAB_SYNTAX.
import { difficulties } from "@/data/difficultyLevels"
import type { Difficulty } from "@/data/difficultyLevels"
import { ACTIVITIES } from "./activities"
import type { ActivityId } from "./activities"
import type { PlaceDef, PlaceKind, PlaceLayer, Prefab, PrefabLayout, SpecialPlace } from "./prefabTypes"
import { DECORATION_KINDS, WALL_DECORATION_KINDS, decorationFootprint } from "./siteTypes"
import type { DecorationKind, PropFootprint } from "./siteTypes"

export const PREFAB_SYNTAX = `
THE HEADER
  room hall                     the room's name
  tier master                   the tier it is dressed in
  activity storage              what the room is for (optional)
  mirror                        the carve may use it mirrored left to right (optional)

THE DRAWING
  layout [name]                 a drawn variant; the rows follow, one character per cell, a space between
  #  wall   d  door place   .  free floor
  every other character is a letter of the legend; the outermost row and column are the ring
  d letters stand on the ring, wall-item letters on its north row, every other letter inside; a letter drawn over several
  cells is one object of that footprint, and a footprint is a full rectangle

THE LEGEND
  p floor pillar | patron       a place for one of these kinds; floor, wall (first inside row only), ground, wallItem
  g floor? gift 3 of 4          ? makes it optional; "3 of 4": of the places of g, three are filled
  r floor? rubblePile 1 of 3 per q   one of three per place of q
  s stop                        where the player stands: exactly one per layout, inside
  a actor   c chest   o portal   m mechanism    special places, inside
  gift = jarRack | basin        a named list of kinds, declared before the legend line that uses it

COMMENTS
  // comment                    ignored to the end of the line; a file opens with // designed by: name
`.slice(1)

const LAYERS: readonly PlaceLayer[] = ["wall", "floor", "ground", "wallItem"]
const SPECIALS: readonly SpecialPlace[] = ["stop", "actor", "chest", "portal", "mechanism"]
const FIXED = new Set(["#", "d", "."])
const NAME = /^[A-Za-z_]\w*$/

type Legend = { n: number; place: Omit<PlaceDef, "cols" | "rows"> } | { n: number; special: SpecialPlace }
type Blob = { cols: number; rows: number; top: number; cells: number }

/** The connected groups of a letter in one layout, each of which must be a full rectangle. */
const blobsOf = (rows: readonly string[], letter: string, fail: (message: string) => never): Blob[] => {
  const seen = new Set<string>()
  const blobs: Blob[] = []
  rows.forEach((row, r) =>
    [...row].forEach((ch, c) => {
      if (ch !== letter || seen.has(`${r},${c}`)) return
      const stack = [[r, c]]
      seen.add(`${r},${c}`)
      const found: number[][] = []
      while (stack.length > 0) {
        const [y, x] = stack.pop() as number[]
        found.push([y, x])
        for (const [dy, dx] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const key = `${y + dy},${x + dx}`
          if (rows[y + dy]?.[x + dx] === letter && !seen.has(key)) {
            seen.add(key)
            stack.push([y + dy, x + dx])
          }
        }
      }
      const ys = found.map(([y]) => y)
      const xs = found.map(([, x]) => x)
      const blob = {
        top: Math.min(...ys),
        rows: Math.max(...ys) - Math.min(...ys) + 1,
        cols: Math.max(...xs) - Math.min(...xs) + 1,
        cells: found.length,
      }
      if (blob.cells !== blob.rows * blob.cols) fail(`"${letter}" is not drawn as a full rectangle`)
      blobs.push(blob)
    })
  )
  return blobs
}

export const parsePrefab = (
  text: string,
  name = "room",
  footprintOf: (kind: DecorationKind) => PropFootprint = decorationFootprint
): Prefab => {
  const fail = (n: number, message: string): never => {
    throw new Error(`line ${n}: ${message}`)
  }
  const designedBy = text.match(/^\s*\/\/\s*designed by:\s*(.+?)\s*$/im)?.[1]
  const lines = text
    .split("\n")
    .map((raw, i) => ({ n: i + 1, line: raw.replace(/\/\/.*/, "").trim() }))
    .filter(({ line }) => line !== "")

  let roomName = name
  let tier: Difficulty | undefined
  let activity: ActivityId | undefined
  let mirror = false
  const lists = new Map<string, readonly string[]>()
  const drawn: { name: string; rows: string[]; n: number }[] = []
  const legend = new Map<string, Legend>()

  let inLayout = false
  for (const { n, line } of lines) {
    const words = line.split(/\s+/)
    const [head, ...rest] = words
    if (inLayout && /^\S( \S)*$/.test(line)) {
      drawn[drawn.length - 1].rows.push(line.replace(/ /g, ""))
      continue
    }
    inLayout = false
    if (head === "room" && rest.length === 1) roomName = rest[0]
    else if (head === "tier" && rest.length === 1)
      tier = (difficulties as readonly string[]).includes(rest[0])
        ? (rest[0] as Difficulty)
        : fail(n, `unknown tier "${rest[0]}"`)
    else if (head === "activity" && rest.length === 1)
      activity = ACTIVITIES.some(a => a.id === rest[0])
        ? (rest[0] as ActivityId)
        : fail(n, `unknown activity "${rest[0]}"`)
    else if (head === "mirror" && rest.length === 0) mirror = true
    else if (head === "layout" && rest.length <= 1) {
      drawn.push({ name: rest[0] ?? "", rows: [], n })
      inLayout = true
    } else if (line.includes("=")) {
      const [list, kinds, ...extra] = line.split("=").map(part => part.trim())
      if (!NAME.test(list) || !kinds || extra.length > 0) fail(n, `cannot read list "${line}"`)
      lists.set(
        list,
        kinds.split("|").map(kind => kind.trim())
      )
    } else {
      const letter = head
      if (letter.length !== 1 || FIXED.has(letter)) fail(n, `cannot read legend line "${line}"`)
      if (legend.has(letter)) fail(n, `"${letter}" is declared twice`)
      const word = rest[0]?.replace(/\?$/, "")
      if ((SPECIALS as readonly string[]).includes(rest[0]) && rest.length === 1) {
        legend.set(letter, { n, special: rest[0] as SpecialPlace })
        continue
      }
      if (!(LAYERS as readonly string[]).includes(word)) fail(n, `"${rest[0] ?? ""}" is neither a layer nor a special`)
      let body = rest.slice(1).join(" ")
      let group: PlaceDef["group"]
      const counted = body.match(/\s*\b(\d+) of (\d+)(?: per (\S))?$/)
      if (counted) {
        group = { take: Number(counted[1]), of: Number(counted[2]), ...(counted[3] ? { per: counted[3] } : {}) }
        body = body.slice(0, counted.index)
      }
      if (body.trim() === "") fail(n, `"${letter}" lists no kinds`)
      const kinds = body.split("|").flatMap(part => {
        const written = part.trim()
        return lists.get(written) ?? [written]
      })
      for (const kind of kinds) if (!NAME.test(kind)) fail(n, `cannot read kind "${kind}"`)
      legend.set(letter, {
        n,
        place: {
          letter,
          layer: word as PlaceLayer,
          optional: rest[0].endsWith("?"),
          kinds: kinds as PlaceKind[],
          ...(group ? { group } : {}),
        },
      })
    }
  }

  const roomTier: Difficulty = tier ?? fail(1, "the room has no tier")
  if (drawn.length === 0) fail(1, "the room has no layout")

  const layouts: PrefabLayout[] = []
  const sizes = new Map<string, { cols: number; rows: number }>()
  const used = new Set<string>()
  for (const layout of drawn) {
    const { rows, n } = layout
    if (rows.length < 3) fail(n, "a layout needs at least three rows")
    if (rows.some(row => row.length !== rows[0].length)) fail(n, "the rows of a layout are not all as wide")
    if (rows[0].length < 3) fail(n, "a layout needs at least three columns")
    const last = rows.length - 1
    const wide = rows[0].length - 1
    let stops = 0
    rows.forEach((row, r) =>
      [...row].forEach((ch, c) => {
        const here = n + 1 + r
        const ring = r === 0 || r === last || c === 0 || c === wide
        if (ch === "#" || ch === ".") {
          if (ch === "." && ring) fail(here, "free floor on the ring")
          return
        }
        if (ch === "d") {
          if (!ring) fail(here, "a door place inside the ring")
          return
        }
        const entry = legend.get(ch) ?? fail(here, `"${ch}" is used but never declared`)
        used.add(ch)
        const onRing = "place" in entry && entry.place.layer === "wallItem"
        if (onRing && !ring) fail(here, `wall item "${ch}" inside the ring`)
        if (onRing && r !== 0) fail(here, `wall item "${ch}" off the north wall`)
        if (!onRing && ring) fail(here, `"${ch}" on the ring`)
        if ("special" in entry && entry.special === "stop") stops++
      })
    )
    if (stops !== 1) fail(n, `a layout needs exactly one stop, this has ${stops}`)
    for (const [letter, entry] of legend) {
      if (!rows.some(row => row.includes(letter))) continue
      const blobs = blobsOf(rows, letter, message => fail(n, message))
      if ("special" in entry) continue
      const size = sizes.get(letter) ?? { cols: blobs[0].cols, rows: blobs[0].rows }
      if (blobs.some(blob => blob.cols !== size.cols || blob.rows !== size.rows))
        fail(n, `"${letter}" is drawn in more than one footprint`)
      sizes.set(letter, size)
      if (entry.place.layer === "wall" && blobs.some(blob => blob.top !== 1))
        fail(n, `wall place "${letter}" stands below the first inside row`)
    }
    layouts.push({ name: layout.name, cells: rows })
  }

  const places: Record<string, PlaceDef> = {}
  const specials: Record<string, SpecialPlace> = {}
  for (const [letter, entry] of legend) {
    if (!used.has(letter)) fail(entry.n, `"${letter}" is declared but never drawn`)
    if ("special" in entry) {
      specials[letter] = entry.special
      continue
    }
    const { place } = entry
    const size = sizes.get(letter) as { cols: number; rows: number }
    for (const kind of place.kinds) {
      const isWallKind = (WALL_DECORATION_KINDS as readonly string[]).includes(kind)
      const isFloorKind = (DECORATION_KINDS as readonly string[]).includes(kind)
      if (place.layer === "wallItem") {
        if (!isWallKind) fail(entry.n, `"${kind}" is not a wall item`)
        if (size.cols !== 1 || size.rows !== 1) fail(entry.n, `wall item "${letter}" is drawn larger than one cell`)
        continue
      }
      if (kind === "patron") {
        if (place.layer !== "floor") fail(entry.n, "a patron stands on a floor place")
        if (size.cols !== 1 || size.rows !== 1) fail(entry.n, `"patron" does not fit ${size.cols}x${size.rows}`)
        continue
      }
      if (!isFloorKind) fail(entry.n, `unknown kind "${kind}"`)
      const footprint = footprintOf(kind as DecorationKind)
      if (footprint.cols !== size.cols || footprint.rows !== size.rows)
        fail(
          entry.n,
          `"${kind}" is ${footprint.cols}x${footprint.rows}, "${letter}" is drawn ${size.cols}x${size.rows}`
        )
      if (footprint.ground && place.layer !== "ground")
        fail(entry.n, `"${kind}" lies on the ground, "${letter}" is a ${place.layer} place`)
      if (!footprint.ground && place.layer === "ground")
        fail(entry.n, `"${kind}" stands free, "${letter}" is a ground place`)
    }
    if (place.group && place.group.take > place.group.of)
      fail(entry.n, `cannot take ${place.group.take} of ${place.group.of}`)
    if (place.group?.per && !legend.has(place.group.per)) fail(entry.n, `"per ${place.group.per}" names no letter`)
    places[letter] = { ...place, ...size }
  }

  return { name: roomName, tier: roomTier, activity, mirror, designedBy, layouts, places, specials }
}
