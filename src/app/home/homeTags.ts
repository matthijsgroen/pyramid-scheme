// What a mod says about the home as it stands (a heart missing, a rest taken), as plain tags. Core only merges
// and hands them to whoever listens; it never reads one. The registry is filled once at module load, so the
// hooks run in the same order every render.
//
// A source whose tags come from its own saved state has none until that state is read, so it says with the
// same reading whether it has: `loaded`. One reading, so the tags and the flag come from the same read.
export type HomeTagsReading = { tags: readonly string[]; loaded: boolean }
export type UseHomeTags = () => HomeTagsReading

const registry: UseHomeTags[] = []

export const registerHomeTags = (useTags: UseHomeTags) => registry.push(useTags)

// Every source's tags merged in registration order, and whether every source has read its save.
export const useHomeTags = (): HomeTagsReading => {
  const tags: string[] = []
  let loaded = true
  for (const useTags of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    const reading = useTags()
    for (const tag of reading.tags) if (!tags.includes(tag)) tags.push(tag)
    loaded = reading.loaded && loaded
  }
  return { tags, loaded }
}
