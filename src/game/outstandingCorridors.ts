/** Hidden corridors seen but not yet found, counted per level (pyramid). Keys are `${levelNr}:${sectionAddress}`. */
export const outstandingCorridorsByLevel = (
  known: readonly string[],
  found: readonly string[]
): ReadonlyMap<number, number> => {
  const done = new Set(found)
  const counts = new Map<number, number>()
  for (const key of known) {
    if (done.has(key)) continue
    const level = Number(key.slice(0, key.indexOf(":")))
    counts.set(level, (counts.get(level) ?? 0) + 1)
  }
  return counts
}
