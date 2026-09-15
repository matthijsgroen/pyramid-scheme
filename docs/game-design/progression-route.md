# The route through the game

What order the player meets the world in, and what opens each door. Assembled from
`journeyAvailability.ts`, `treasurePerks.ts` (core, structural) and the tomb-treasure mod's perk catalog —
not from intent. Regenerate rather than trust if those move.

## The three gates

| Gate                       | Rule                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| **Next pyramid in a tier** | the previous pyramid in that tier is **completed**                                                 |
| **Next tier**              | hold **any one** of the previous tier's four tier-unlock treasures                                 |
| **A tomb**                 | map pieces — and the 2nd and 3rd tombs of a tier need a **location-key** from the tomb before them |

## The route

```
starter   Dawn at the Sphinx → Papyrus Merchant's Route → Temple of Bastet → Scribe's Academy
          └ Forgotten Merchant's Cache          4 floors
junior    Sacred Ibis Migration → Valley of the Artisans → Temple of Thoth → Lighthouse of Alexandria
          └ Noble's Hidden Vault               6 floors
expert    Valley of the Kings → Karnak → Nile Delta → Pyramid of Djoser
          └ High Priest's Treasury             4 floors → location-key → Inner Sanctum   4 floors
master    Great Pyramid of Giza → Book of the Dead → Curse of the Pharaohs → Tomb of Nefertari
          └ Pharaoh's Secret Hoard             5 floors → location-key → Hall of Osiris  5 floors
wizard    Ra's Solar Journey → Secrets of the Sphinx → Chamber of Ma'at → Eternal Pyramid
          └ Vault of the Gods  4 → Realm of Cosmic Forces 4 → Throne of Eternity 4
```

## What each tomb floor grants

The tomb is where the game hands out capability; pyramids hand out collectables. Floor 1 of each tier's
first tomb is always the tier-unlock.

| Tomb                       | Floors and what they give                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Forgotten Merchant's Cache | tier-unlock · **compass L1** · pack-mule · max-health                                        |
| Noble's Hidden Vault       | tier-unlock · — · — · — · max-health · max-health                                            |
| High Priest's Treasury     | tier-unlock · location-key → Inner Sanctum · trap-insight · armor                            |
| Inner Sanctum              | **consumable-detector L1** · — · trap-insight · max-health                                   |
| Pharaoh's Secret Hoard     | tier-unlock · location-key → Hall of Osiris · — · **compass L2** · armor                     |
| Hall of Osiris             | consumable-detector L2 · **scribes-eye L1** · **compass L3** · max-health · **detection L1** |
| Vault of the Gods          | — · location-key → Realm · **detection L2** · —                                              |
| Realm of Cosmic Forces     | consumable-detector L3 · location-key → Throne · detection L3 · scribes-eye L2               |
| Throne of Eternity         | — · scribes-eye L3 · max-health · **detection L4**                                           |

## Four things this shows

**Tombs within a tier ARE ordered.** The second and third are opened by a location-key found on floor 2 of
the one before. So the sequence inside a tier is fixed, and `Part 4`'s claim that tomb openings are
unsequenced is only true **across** tiers — `master_treasure_tomb` can be opened before `Inner Sanctum`,
but `Inner Sanctum` can never come before `High Priest's Treasury`. A story beat may rely on the order
within a tier, and may not rely on it between them.

**The corridor detector does not exist until Hall of Osiris.** Hidden corridors are unfindable-by-tool for
three and a half tiers — `detection L1` arrives on the fifth floor of master's second tomb. Anything hidden
before then is found by walking into it.

That is either a problem or the best-timed thing in the game, depending on `arc-offering-to-the-gods.md`:
its hidden corridor sits in `master_2`, which is exactly when the tool to find one starts existing.

**The compass has a three-tier hole.** L1 is the second thing the player ever earns; L2 does not arrive
until the Pharaoh's Secret Hoard. So the fragment-finding aid the game teaches in hour two does not improve
for most of the game.

**Junior's tomb grants nothing but health.** Six floors: a tier-unlock, three blanks and two max-health.
Mechanically it is the flattest stretch in the route, and it is the tier the story was going to use to
teach what real looks like — which now has to carry that alone.

## Where the story sits on it

| Tier    | Story beat (`main-path.md`)    | Mechanically that tier is…                                  |
| ------- | ------------------------------ | ----------------------------------------------------------- |
| starter | you cannot read it yet         | teaching, and handing out the compass                       |
| junior  | what real looks like           | **empty** — health only                                     |
| expert  | the ask                        | traps and armour: the tier that starts pushing back         |
| master  | the thing itself, and the fake | the capability tier — compass L2/L3, scribes-eye, detection |
| wizard  | announced, and read            | topping every detector out                                  |

## Open

1. **Does junior want a capability?** Three of its six floors grant nothing, and it is the one tier with no
   new verb.
2. **Should the compass improve before master?** Or is a deliberately blunt tool for three tiers the point?
3. **Is detection arriving that late deliberate?** It makes hidden corridors a late-game idea, which the
   story can use — or a mechanic most players meet once.
