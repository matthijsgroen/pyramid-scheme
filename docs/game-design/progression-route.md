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

## Reshuffling it to the story

Nothing placed these perks for a reason a player could feel — there was no story when they were assigned.
There is one now, so the question is what verb each act wants the player to be given.

### Two facts that make it cheap

**Twelve of the forty floors grant no capability**: four typed `tier-unlock` and eight `none`. And the four
are not really spent, because **a floor can be a tier key and grant a perk at the same time** —
`starter_a_2` admits the player to junior _and_ hands over compass L1. Possession of the id is what opens
the tier (`isTierUnlocked` reads ids, never perk types), so a `tier-unlock` perk is a floor declining to
give anything it was not already giving.

**The shuffle is one file.** The key ids are core structure (`src/data/treasurePerks.ts`, which world-gen
wires ward gates from); which perk an id grants is mod data
(`src/mods/tombTreasure/game/treasurePerks.ts`). Changing the catalog regenerates no world and touches no
solver.

### What each act wants

| Act     | The story's verb       | So the tier should hand over                                                             |
| ------- | ---------------------- | ---------------------------------------------------------------------------------------- |
| starter | learning to read       | compass L1 (already) — and **scribes-eye L1**, since the tableau is where reading pays   |
| junior  | telling real from copy | **compass L2** and **detection L1** — narrowing, and noticing what is not in plain sight |
| expert  | being refused          | traps and armour (already) — the tier where the world pushes back                        |
| master  | finding what is hidden | **detection L2**, compass L3 — the tier the arc hides something in                       |
| wizard  | reading it             | every detector topped out                                                                |

### The two moves that matter

**Compass L2 into junior.** Today L1 is the second thing the player ever earns and L2 does not arrive until
the Pharaoh's Secret Hoard — the tool taught in hour two does not improve for three tiers. Junior is the
act about telling one thing from another, and narrowing from _which pyramid_ to _which floor_ is that idea
as a mechanic.

**Detection L1 out of Hall of Osiris and into junior or late expert.** It currently arrives on the fifth
floor of master's second tomb, so hidden corridors are unfindable-by-tool for three and a half tiers and
most players meet the mechanic roughly once. L1 is only proximity notification — mild enough to hand over
early, and it makes _there are things behind things_ an idea the game establishes rather than reveals.

It also decides what the offering arc's hidden corridor means. With detection arriving in junior, the
corridor in `master_2` is a **use** of a familiar tool. Left where it is, finding it is the tool's
introduction, which is more dramatic and asks a player to learn a new verb during the story's biggest turn.

**And junior stops being empty.** Four of its six floors currently grant nothing; two capabilities and its
existing health leave it with a verb of its own, which matters because junior is where a new player decides
whether to keep going.

### What it costs

- **Saves.** Players hold perk ids; changing what an id grants changes what an existing save has. Alpha, but
  the practice is to migrate rather than reset.
- **Difficulty.** Detection three tiers earlier makes hidden loot easier to find for most of the game. That
  is a real balance change, not a reshuffle.
- **Nothing else.** No world regeneration, no reachability change, no new perk types.

### Open — the reshuffle

4. **Is detection early a gift or a loss?** Early makes hidden corridors a language the game speaks
   throughout; late makes them a late-game reveal that the story can use as a turn.
5. **Do the four `tier-unlock` floors take a perk as well?** They already admit the player without one.
6. **Does scribes-eye belong in starter?** It serves the tableau, which is the game's best idea and its
   least-used family — handing its aid over early is one way to push players at it.

## Open

1. **Does junior want a capability?** Four of its six floors grant nothing, and it is the one tier with no
   new verb. A proposal is above.
2. **Should the compass improve before master?** Or is a deliberately blunt tool for three tiers the point?
3. **Is detection arriving that late deliberate?** It makes hidden corridors a late-game idea, which the
   story can use — or a mechanic most players meet once.
