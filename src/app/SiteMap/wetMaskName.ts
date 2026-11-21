/** The file beside a prop's tile that holds its waterline at `depth` map units (`import-tile --wet`). */
export const wetMaskFile = (name: string, depth: number): string => `${name}.wet-${depth}.png`

/** A waterline file's tile name and depth, read back off its file name; undefined for any other file. */
export const parseWetMaskFile = (file: string): { name: string; depth: number } | undefined => {
  const match = /^(.+)\.wet-(\d+(?:\.\d+)?)\.png$/.exec(file)
  return match ? { name: match[1], depth: Number(match[2]) } : undefined
}
