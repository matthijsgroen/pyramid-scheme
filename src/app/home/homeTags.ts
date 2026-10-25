// What a mod says about the home as it stands (a heart missing, a rest taken), as plain tags. Core only merges
// and hands them to whoever listens; it never reads one. The registry is filled once at module load, so the
// hooks run in the same order every render.
export type UseHomeTags = () => readonly string[]

const registry: UseHomeTags[] = []

export const registerHomeTags = (useTags: UseHomeTags) => registry.push(useTags)

export const useHomeTags = (): readonly string[] => {
  const tags: string[] = []
  for (const useTags of registry) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- stable registry order; see above
    for (const tag of useTags()) if (!tags.includes(tag)) tags.push(tag)
  }
  return tags
}
