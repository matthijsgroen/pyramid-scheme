// DRAWING A ROOM PREFAB: the edits the room editor's drawing makes, each a pure step from one prefab to the next.
// An edit the notation would refuse returns the prefab unchanged, so the drawing can never write text that fails to
// parse; a fault the check finds (a door cut off) is the designer's to see and fix.
import { parsePrefab } from "@/game/prefabNotation"
import { printPrefab } from "@/game/prefabPrint"
import type { PlaceDef, PlaceKind, PlaceLayer, Prefab, SpecialPlace } from "@/game/prefabTypes"
import { WALL_DECORATION_KINDS, decorationFootprint } from "@/game/siteTypes"
import type { DecorationKind, PropFootprint } from "@/game/siteTypes"

type Footprints = (kind: DecorationKind) => PropFootprint
type Patch = Partial<Pick<PlaceDef, "optional" | "kinds" | "group">>

// Every letter a place may take; "d" is a door place.
const LETTERS = "abcefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
const FIXED = new Set(["#", ".", "d"])

const isLetter = (ch: string | undefined): ch is string => ch !== undefined && !FIXED.has(ch)
const onRing = (cells: readonly string[], r: number, c: number): boolean =>
  r === 0 || c === 0 || r === cells.length - 1 || c === cells[0].length - 1

/** The prefab as its printed text reads back, or `before` when the notation refuses it. */
const sound = (before: Prefab, after: Prefab, footprintOf: Footprints): Prefab => {
  try {
    return parsePrefab(printPrefab(after), after.name, footprintOf)
  } catch {
    return before
  }
}

const withCells = (prefab: Prefab, layout: number, cells: readonly string[]): Prefab => ({
  ...prefab,
  layouts: prefab.layouts.map((drawn, i) => (i === layout ? { ...drawn, cells } : drawn)),
})

const setCell = (cells: readonly string[], r: number, c: number, ch: string): string[] =>
  cells.map((row, i) => (i === r ? `${row.slice(0, c)}${ch}${row.slice(c + 1)}` : row))

/** The cells of the object drawn at r,c: its letter's connected group. */
const blobAt = (cells: readonly string[], r: number, c: number): [number, number][] => {
  const letter = cells[r][c]
  const found: [number, number][] = [[r, c]]
  const seen = new Set([`${r},${c}`])
  for (let i = 0; i < found.length; i++) {
    const [y, x] = found[i]
    for (const [dy, dx] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (cells[y + dy]?.[x + dx] === letter && !seen.has(`${y + dy},${x + dx}`)) {
        seen.add(`${y + dy},${x + dx}`)
        found.push([y + dy, x + dx])
      }
  }
  return found
}

/** The cells with the object at r,c taken out: wall where it hung on the ring, free floor inside. */
const clearBlob = (cells: readonly string[], r: number, c: number): string[] =>
  blobAt(cells, r, c).reduce<string[]>(
    (next, [y, x]) => setCell(next, y, x, onRing(cells, y, x) ? "#" : "."),
    [...cells]
  )

/** The prefab without the legend lines of letters no layout draws any more, nor a `per` naming one. */
const withoutUndrawn = (prefab: Prefab): Prefab => {
  const drawn = (letter: string) => prefab.layouts.some(layout => layout.cells.some(row => row.includes(letter)))
  const places: Record<string, PlaceDef> = {}
  for (const [letter, place] of Object.entries(prefab.places)) {
    if (!drawn(letter)) continue
    const per = place.group?.per
    places[letter] =
      place.group && per && !drawn(per) ? { ...place, group: { take: place.group.take, of: place.group.of } } : place
  }
  const specials = Object.fromEntries(Object.entries(prefab.specials).filter(([letter]) => drawn(letter)))
  return { ...prefab, places, specials }
}

const freeLetter = (prefab: Prefab): string | undefined =>
  [...LETTERS].find(letter => !(letter in prefab.places) && !(letter in prefab.specials))

/** Paints a wall, free floor or a door place, taking out the object that stood there. */
export const paintCell = (
  prefab: Prefab,
  layout: number,
  r: number,
  c: number,
  sign: "#" | "." | "d",
  footprintOf: Footprints = decorationFootprint
): Prefab => {
  const cells = prefab.layouts[layout].cells
  if (cells[r]?.[c] === undefined || cells[r][c] === sign) return prefab
  const cleared = isLetter(cells[r][c]) ? clearBlob(cells, r, c) : [...cells]
  return sound(prefab, withoutUndrawn(withCells(prefab, layout, setCell(cleared, r, c, sign))), footprintOf)
}

/** Sets a special place on free floor; the stop moves there, since a layout has one. */
export const setSpecial = (
  prefab: Prefab,
  layout: number,
  r: number,
  c: number,
  special: SpecialPlace,
  footprintOf: Footprints = decorationFootprint
): Prefab => {
  const cells = prefab.layouts[layout].cells
  if (cells[r]?.[c] !== ".") return prefab
  const stop = Object.keys(prefab.specials).find(letter => prefab.specials[letter] === "stop")
  const letter = special === "stop" && stop ? stop : freeLetter(prefab)
  if (!letter) return prefab
  const moved = cells.map(row => row.replaceAll(letter, "."))
  return sound(
    prefab,
    { ...withCells(prefab, layout, setCell(moved, r, c, letter)), specials: { ...prefab.specials, [letter]: special } },
    footprintOf
  )
}

/** Draws an object of `cols` x `rows` from r,c (its north-west cell) on free floor, or for a wall item on the
 * north wall; a wall place stands on the first inside row. */
const claim = (prefab: Prefab, layout: number, r: number, c: number, place: PlaceDef): Prefab | undefined => {
  let cells = [...prefab.layouts[layout].cells]
  if (place.layer === "wall" && r !== 1) return undefined
  for (let y = r; y < r + place.rows; y++)
    for (let x = c; x < c + place.cols; x++) {
      const here = cells[y]?.[x]
      const fits = place.layer === "wallItem" ? y === 0 && here === "#" : here === "." && !onRing(cells, y, x)
      if (!fits) return undefined
      cells = setCell(cells, y, x, place.letter)
    }
  return { ...withCells(prefab, layout, cells), places: { ...prefab.places, [place.letter]: place } }
}

const layerOf = (kind: PlaceKind, footprint: PropFootprint): PlaceLayer =>
  (WALL_DECORATION_KINDS as readonly string[]).includes(kind) ? "wallItem" : footprint.ground ? "ground" : "floor"

/** Drops a kind on r,c as a new place of the kind's registered footprint; `layer: "wall"` stands it against the
 * north wall. Refused over the ring, a door, a wall or another place. */
export const dropKind = (
  prefab: Prefab,
  layout: number,
  r: number,
  c: number,
  kind: PlaceKind,
  { layer, footprintOf = decorationFootprint }: { layer?: PlaceLayer; footprintOf?: Footprints } = {}
): Prefab => {
  const letter = freeLetter(prefab)
  if (!letter) return prefab
  const single = kind === "patron" || (WALL_DECORATION_KINDS as readonly string[]).includes(kind)
  const footprint = single ? { cols: 1, rows: 1, tall: 0 } : footprintOf(kind as DecorationKind)
  const place: PlaceDef = {
    letter,
    layer: layer ?? layerOf(kind, footprint),
    optional: false,
    kinds: [kind],
    cols: footprint.cols,
    rows: footprint.rows,
  }
  const claimed = claim(prefab, layout, r, c, place)
  return claimed ? sound(prefab, claimed, footprintOf) : prefab
}

/** Draws one more object of an existing place at r,c, in the place's footprint. */
export const copyPlace = (
  prefab: Prefab,
  layout: number,
  r: number,
  c: number,
  letter: string,
  footprintOf: Footprints = decorationFootprint
): Prefab => {
  const place = prefab.places[letter]
  const claimed = place && claim(prefab, layout, r, c, place)
  return claimed ? sound(prefab, claimed, footprintOf) : prefab
}

/** Takes out the object or special place drawn at r,c; its legend line goes when no layout draws it any more. */
export const removePlace = (
  prefab: Prefab,
  layout: number,
  r: number,
  c: number,
  footprintOf: Footprints = decorationFootprint
): Prefab => {
  const cells = prefab.layouts[layout].cells
  if (!isLetter(cells[r]?.[c])) return prefab
  return sound(prefab, withoutUndrawn(withCells(prefab, layout, clearBlob(cells, r, c))), footprintOf)
}

/** Changes a place's options; `group: undefined` fills every place of the letter again. */
export const editPlace = (
  prefab: Prefab,
  letter: string,
  patch: Patch,
  footprintOf: Footprints = decorationFootprint
): Prefab => {
  const place = prefab.places[letter]
  if (!place) return prefab
  const { group, ...rest } = { ...place, ...patch }
  const next: PlaceDef = { ...rest, ...(group ? { group } : {}) }
  return sound(prefab, { ...prefab, places: { ...prefab.places, [letter]: next } }, footprintOf)
}

/** A copy of a layout under a new name, to rework by hand. */
export const addLayout = (
  prefab: Prefab,
  fromIndex: number,
  name: string,
  footprintOf: Footprints = decorationFootprint
): Prefab => {
  const from = prefab.layouts[fromIndex]
  if (!from || name === "" || prefab.layouts.some(layout => layout.name === name)) return prefab
  return sound(prefab, { ...prefab, layouts: [...prefab.layouts, { name, cells: from.cells }] }, footprintOf)
}
