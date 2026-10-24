import { basename, join } from "path"

/**
 * The names an entry's attachments get in the staging folder: numbered in the entry's own order, so the
 * scaffold comes before the material reference wherever the Finder sorts them by name.
 */
export const stagedNames = (attachments: string[]): string[] =>
  attachments.map((path, i) => `${i + 1}-${basename(path)}`)

/**
 * The Finder selection for staged attachments: every file at once, in one window. `open -R` selects only
 * the last of several files in one folder, which is why the attachments are staged into a folder of their
 * own first. Nothing to reveal for a texture, which has none.
 */
export const selectScript = (dir: string, names: string[]): string | undefined =>
  names.length > 0
    ? [
        'tell application "Finder"',
        `  reveal {${names.map(n => `POSIX file ${JSON.stringify(join(dir, n))} as alias`).join(", ")}}`,
        "  activate",
        "end tell",
      ].join("\n")
    : undefined
