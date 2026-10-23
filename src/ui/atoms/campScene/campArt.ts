/**
 * A piece's art: its picture, the contact shadow `yarn import-camp` writes beside it (`<id>-shadow`), and an
 * optional second frame (`<id>-b`) that a burning piece flickers with.
 */
export type CampArt = { url: string; shadow?: string; frameB?: string }

const SUFFIXES = [
  ["-shadow", "shadow"],
  ["-b", "frameB"],
] as const

/** Keyed by piece id; a shadow or second frame is listed under its piece, never as a piece of its own. */
export const groupCampArt = (urls: Record<string, string>): Map<string, CampArt> => {
  const byName = new Map(
    Object.entries(urls).map(([path, url]) => [path.replace(/^.*\/([^/]+)\.\w+$/, "$1"), url] as const)
  )
  const extra = (name: string) => SUFFIXES.find(([suffix]) => name.endsWith(suffix))
  const art = new Map<string, CampArt>()
  for (const [name, url] of byName) if (!extra(name)) art.set(name, { url })
  for (const [name, url] of byName) {
    const found = extra(name)
    const piece = found && art.get(name.slice(0, -found[0].length))
    if (found && piece) piece[found[1]] = url
  }
  return art
}

// The filename is the piece id, so adding a piece's art is dropping its file in.
const ART = groupCampArt(
  import.meta.glob("../../../assets/camp/*.{png,webp,svg}", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>
)

// A layer step's object alone, cut from its spot's pictures by `yarn camp-layers`.
const LAYER_ART = groupCampArt(
  import.meta.glob("../../../assets/camp/layers/*.webp", {
    eager: true,
    query: "?url",
    import: "default",
  }) as Record<string, string>
)

export const campArt = (id: string, layer = false): CampArt | undefined => (layer ? LAYER_ART : ART).get(id)
