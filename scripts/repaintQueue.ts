import { homedir } from "os"
import { join } from "path"

export type Entry = {
  key: string
  title: string
  attachments: string[]
  prompt: string
  /** Where the finished file goes, and what turns the download into it. */
  out: string
  importedBy: string
  /** Already on disk. Off the owed list, still fetchable by key — a landed file can need rolling again. */
  drawn?: boolean
  /** Why the landed file is not good enough. Set by a `**Re-roll:**` line, and puts it BACK on the list. */
  reroll?: string
  /** The generator return this was imported from, kept because it cannot be generated again. */
  master?: string
}

/** Every `### n. \`tier/kind\` — title` block, with its attachment list and its first fenced block. */
export const parse = (md: string): Entry[] =>
  md
    .split(/^### /m)
    .slice(1)
    .flatMap(block => {
      const key = /`([a-z]+\/[A-Za-z0-9-]+)`/.exec(block)?.[1]
      const prompt = /```\n([\s\S]*?)\n```/.exec(block)?.[1]
      if (!key || !prompt) return []
      // A render in `~/tile-previews`, or a master kept in the repo (an edit of a painted tile attaches that).
      // An entry that is not a prop (the explorer's sheet) gives its own `**Import:**` line, whose paths
      // are outputs and so never attachments.
      const importLine = /^\*\*Import:\*\*\s*`([^`]+)`/m.exec(block)?.[1]
      const attachments = [...block.matchAll(/`((?:~\/[^`]+\.png|art\/masters\/[^`]+\.(?:webp|png|jpe?g)))`/g)]
        .map(m => m[1])
        .filter(path => !importLine?.includes(path))
        .map(path => path.replace(/^~/, homedir()))
      return [
        {
          key,
          title: (block.split("\n")[0] ?? key).trim(),
          attachments,
          prompt,
          out: join("src/assets/tiles", key.split("/")[0], `${key.split("/")[1]}.png`),
          importedBy:
            importLine ?? `yarn import-tile <file> --tier=${key.split("/")[0]} --name=${key.split("/")[1]} --slot=prop`,
        },
      ]
    })
