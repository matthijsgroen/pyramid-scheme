// A sellable's painted picture, named `<id>.webp` in the sellables folder: dropping the file in is what
// puts it on screen. Until it exists the item keeps its glyph.
const FILES = import.meta.glob("../../../assets/sellables/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>

const byId = (files: Record<string, string>): ReadonlyMap<string, string> =>
  new Map(Object.entries(files).map(([path, url]) => [path.replace(/^.*\/([^/]+)\.webp$/, "$1"), url]))

const ART_BY_ID = byId(FILES)

export const sellableArtFrom = (files: Record<string, string>, id: string): string | undefined => byId(files).get(id)

/** The painted file for a sellable, or nothing. */
export const sellableArt = (id: string): string | undefined => ART_BY_ID.get(id)
