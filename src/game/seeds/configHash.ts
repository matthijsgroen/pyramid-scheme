import { hashString } from "@/support/hashString"

/**
 * JSON with object keys in a fixed order and undefined values dropped, so two options objects that
 * mean the same thing serialise the same. Both matter: key order follows declaration order in a
 * literal, and an optional dial left out reads identically to one written as `undefined`.
 */
const stable = (value: unknown): string => {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  const entries = Object.entries(value)
    .filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => (left < right ? -1 : 1))
  return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`
}

/**
 * The key a family's seed list is filed under: a hash of the options object its generator is handed
 * (docs/offline-puzzle-seeds.md).
 *
 * Keying on the generator's own inputs rather than on family-and-tier is what makes the list
 * self-invalidating. Turn a dial and the options change, so the key changes, so the lookup misses and
 * the board is generated live — a bucket verified against different dials is unreachable rather than
 * wrong, and there is no version number to remember to bump.
 */
export const configHash = (options: unknown): string => hashString(stable(options)).toString()
