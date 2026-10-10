/** The lock text rides in the URL hash, so a link reproduces the lock. */
export const LOCK_HASH_PREFIX = "#lock="

/** A tiny lock that parses, compiles and solves: the editor's starting point. */
export const START_LOCK = "in -[L]- out\nL toggle @in\nin ?\nout ?\n"

export const encodeLockHash = (text: string): string => `${LOCK_HASH_PREFIX}${encodeURIComponent(text)}`

/** The lock text a hash carries, or null when the hash is not a lock link (or is damaged). */
export const decodeLockHash = (hash: string): string | null => {
  if (!hash.startsWith(LOCK_HASH_PREFIX)) return null
  try {
    return decodeURIComponent(hash.slice(LOCK_HASH_PREFIX.length))
  } catch {
    return null
  }
}

/** The text a link carries, or the starting lock. */
export const initialLockText = (hash: string): string => decodeLockHash(hash) ?? START_LOCK
