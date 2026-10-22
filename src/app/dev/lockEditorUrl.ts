/** The lock text rides in the URL hash, so a link reproduces the lock. */
export const LOCK_HASH_PREFIX = "#lock="
/** A web's text rides the same way, and opens the editor in web mode. */
export const WEB_HASH_PREFIX = "#web="

/** A tiny lock that parses, compiles and solves: the editor's starting point. */
export const START_LOCK = "in -[L]- out\nL toggle @in\nin ?\nout ?\n"

/** A tiny web on the wizard tier: one lever in wizard_1 clears wizard_3. */
export const START_WEB = "// designed by: \n[w3]\nsand by sun\n\n[w1p1]\nlever sun @end\n"

export const encodeLockHash = (text: string): string => `${LOCK_HASH_PREFIX}${encodeURIComponent(text)}`
export const encodeWebHash = (text: string): string => `${WEB_HASH_PREFIX}${encodeURIComponent(text)}`

const decodeWith = (prefix: string, hash: string): string | null => {
  if (!hash.startsWith(prefix)) return null
  try {
    return decodeURIComponent(hash.slice(prefix.length))
  } catch {
    return null
  }
}

/** The lock text a hash carries, or null when the hash is not a lock link (or is damaged). */
export const decodeLockHash = (hash: string): string | null => decodeWith(LOCK_HASH_PREFIX, hash)

/** The web text a hash carries, or null when the hash is not a web link (or is damaged). */
export const decodeWebHash = (hash: string): string | null => decodeWith(WEB_HASH_PREFIX, hash)

/** The text a link carries, or the starting lock. */
export const initialLockText = (hash: string): string => decodeLockHash(hash) ?? START_LOCK

/** The web a link carries, or the starting web. */
export const initialWebText = (hash: string): string => decodeWebHash(hash) ?? START_WEB
