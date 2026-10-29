// A ROOM PREFAB WRITTEN BACK AS TEXT, in the notation prefabNotation.ts reads (PREFAB_SYNTAX). The canonical
// spelling: the header, the named lists, each layout, then the places and the special places; every comment at the top.
import type { PlaceDef, Prefab } from "./prefabTypes"

/** The kinds as written: a run of kinds a named list spells is written by its name, longest list first. */
const writtenKinds = (kinds: readonly string[], lists: Readonly<Record<string, readonly string[]>>): string[] => {
  const byLength = Object.entries(lists).sort(([, a], [, b]) => b.length - a.length)
  const written: string[] = []
  for (let i = 0; i < kinds.length;) {
    const list = byLength.find(([, spelled]) => spelled.every((kind, k) => kinds[i + k] === kind))
    written.push(list ? list[0] : kinds[i])
    i += list ? list[1].length : 1
  }
  return written
}

const placeLine = (place: PlaceDef, lists: Readonly<Record<string, readonly string[]>>): string => {
  const { group } = place
  const counted = group ? ` ${group.take} of ${group.of}${group.per ? ` per ${group.per}` : ""}` : ""
  return `${place.letter} ${place.layer}${place.optional ? "?" : ""} ${writtenKinds(place.kinds, lists).join(" | ")}${counted}`
}

/** The text of a prefab; parsePrefab reads it back to the same prefab. */
export const printPrefab = (prefab: Prefab): string => {
  const lists = prefab.lists ?? {}
  const lines = [
    prefab.designedBy ? `// designed by: ${prefab.designedBy}` : "// designed by:",
    ...(prefab.notes ?? []).map(note => (note ? `// ${note}` : "//")),
    `room ${prefab.name}`,
    `tier ${prefab.tier}`,
    ...(prefab.activity ? [`activity ${prefab.activity}`] : []),
    ...(prefab.mirror ? ["mirror"] : []),
    ...Object.entries(lists).map(([name, kinds]) => `${name} = ${kinds.join(" | ")}`),
    ...prefab.layouts.flatMap(layout => [
      "",
      layout.name ? `layout ${layout.name}` : "layout",
      ...layout.cells.map(row => [...row].join(" ")),
    ]),
    "",
    ...Object.values(prefab.places).map(place => placeLine(place, lists)),
    ...Object.entries(prefab.specials).map(([letter, special]) => `${letter} ${special}`),
  ]
  return `${lines.join("\n")}\n`
}
