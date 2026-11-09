/** The signs the compass offers: a piece of each found, the sign not yet complete. */
export const startedGlyphs = (
  symbols: Record<string, string>,
  progress: (id: string) => { found: number; required: number },
  held: (id: string) => boolean
) =>
  Object.entries(symbols).flatMap(([id, symbol]) => {
    const { found, required } = progress(id)
    return found > 0 && found < required && !held(id) ? [{ id, symbol, progress: `${found}/${required}` }] : []
  })
