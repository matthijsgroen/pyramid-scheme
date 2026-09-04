export const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/** A deterministic 0..1 from a name, so anything placed by it lands in the same spot every time — a
 * mote that moved when the player opened a chest would read as something happening.
 *
 * The avalanche matters. `hashString` is `hash * 31 + char`, so two names differing only in their last
 * character hash one apart, and reducing that straight to a fraction put all three scarabs on the same
 * floor tile, 0.003 of a cell apart. Mixing the bits down from the top is what makes an index into a
 * position rather than into a neighbour. */
export const hashUnit = (scope: string, salt: string, index: number): number => {
  let h = hashString(`${scope}:${salt}:${index}`)
  h = Math.imul(h ^ (h >>> 15), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
