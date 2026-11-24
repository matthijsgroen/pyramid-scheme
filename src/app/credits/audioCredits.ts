import { z } from "zod"

/** A credit file stands next to its audio file as `<name>.credit.json` and holds every field but `file`. */
export const creditSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  authorUrl: z.url().optional(),
  source: z.url(),
  licence: z.string().min(1),
  licenceUrl: z.url(),
})

export type Credit = z.infer<typeof creditSchema> & { file: string }

const creditFiles = import.meta.glob<unknown>("@/assets/audio/**/*.credit.json", { eager: true, import: "default" })

export const audioCredits = (): Credit[] =>
  Object.entries(creditFiles)
    .map(([key, data]) => ({
      ...creditSchema.parse(data),
      file: key
        .split("/")
        .at(-1)!
        .replace(/\.credit\.json$/, ""),
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
