/**
 * Which scene a conversation room plays, from the journey it stands in.
 *
 * Derived rather than authored: the script already names a tomb's beat after its tier
 * (`tomb.starter`, `tomb.wizardB`), so a room in that tomb needs no argument to know whose it is —
 * the same trick the arrivals use, where a journey id IS the key. A second conversation in one
 * journey would need an authored argument; there is no second one yet.
 */
export const sceneFor = (journeyId: string): string | undefined => {
  const tomb = /^(starter|junior|expert|master|wizard)_treasure_tomb(?:_([a-z]))?$/.exec(journeyId)
  if (!tomb) return undefined
  const [, tier, suffix] = tomb
  return `tomb.${tier}${suffix ? suffix.toUpperCase() : ""}`
}
