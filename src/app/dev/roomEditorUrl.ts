/** The room text rides in the URL hash, so a link reproduces the room. */
export const ROOM_HASH_PREFIX = "#room="

/** A small hall that parses and passes the checks: the editor's starting point. */
export const START_ROOM = `// designed by:
room hall
tier starter
layout
# # # # # # #
# . . . . . #
# . . s . . #
# . . . . . #
# # # d # # #
s stop
`

export const encodeRoomHash = (text: string): string => `${ROOM_HASH_PREFIX}${encodeURIComponent(text)}`

/** The room text a hash carries, or null when the hash is not a room link (or is damaged). */
export const decodeRoomHash = (hash: string): string | null => {
  if (!hash.startsWith(ROOM_HASH_PREFIX)) return null
  try {
    return decodeURIComponent(hash.slice(ROOM_HASH_PREFIX.length))
  } catch {
    return null
  }
}

/** The text a link carries, or the starting room. */
export const initialRoomText = (hash: string): string => decodeRoomHash(hash) ?? START_ROOM
