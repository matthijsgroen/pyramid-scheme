/** The Finder reveal for an entry's attachments: nothing to reveal for a texture, which has none. */
export const revealArgs = (attachments: string[]): string[] | undefined =>
  attachments.length > 0 ? ["-R", ...attachments] : undefined
