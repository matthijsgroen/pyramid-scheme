# Themed rooms — a floor that reads as a place

A floor of a pyramid should read as ONE place: here goods were weighed, here they were packed, here the stock
stood, here it was sold. Every room says one thing, and together they say where you are.

Decided 2026-10-18 with the user. Builds on [visual-direction.md](visual-direction.md) (ground plus metal, the
light/dark floor rule, the tier themes) and on the room dressing that already exists: `PROP_ROLES` in
`src/game/dressingTags.ts`, `worldGen/dressingRoles.ts`, and "one purpose per room" in
`src/game/carve/render.ts`.

## What exists today, and what is missing

- A **role** per wing (`trade`, `funerary`, …) narrows the rank's prop pool at world-gen time.
- **Only chambers are dressed** — forks, and dead-end stairheads and exits (`isChamber` in
  `src/game/roomFootprint.ts`, the rule the map claims floor by). A puzzle stands in a 1-wide corridor and has
  no floor for a prop.
- **One prop and one wall item per dressed room**, plus an optional second prop of the same purpose in about a
  third of rooms (`companionProps.ts`). The prop leads, the wall item follows.
- Props stand against the **north wall**, are **one sprite with no orientation**, and may have numbered art
  variants (`offeringTable-2`) picked per cell.

Missing: a level **below the role** — the activity a single room is for.

## 1. An activity is a small fixed set

One table in `src/game/` beside `PROP_ROLES`, shared by every rank (a kind is a silhouette, the rank is its
skin):

| Activity | Props                                            | Wall                                 | Roles                         |
| -------- | ------------------------------------------------ | ------------------------------------ | ----------------------------- |
| weighing | **scale**, **weightsTable**                      | tallyBoard                           | trade, shop                   |
| packing  | **basketStack**, **bales**                       | —                                    | trade, logistics              |
| storage  | jarRack, shelf, basin                            | niche                                | trade, logistics, agriculture |
| selling  | **counter**, mat, offeringTable (market variant) | — (the awning is the `hanging` prop) | trade, shop                   |
| ledger   | **scribeDesk**, shelf                            | tallyBoard, niche                    | trade, scribe                 |

**Bold** kinds are new (6). Rules:

- A rank shows an activity only when it has that activity's props painted — each rank fills the list by what
  exists, with no per-rank table.
- A kind may serve several activities (a shelf stores and keeps the books).
- **An activity matches its wing's role**: it is eligible only where its Roles meet the role the wing was
  authored for, so a funerary wing whose pool holds an offering table and a hanging is not a market. A wing with
  no authored role, or one no kind furnishes (`puzzle`), takes any activity its pool furnishes.
- Untagged kinds (rubble, pillar, mat) stay filler that fits anywhere.
- **`PROP_ROLES` is derived from the activities**, so there is one list, not two that drift.

Junior and up get their own activities when their rank is repainted. **The count grows by one per rank**, as the
floors grow (designer, 2026-10-27): starter 5, junior 6, expert 7, master 8, wizard 9. The lists as they stand:
purification, offering, sanctuary, House of Life, star-watching (expert); treasury, audience, burial chamber,
armoury (master); the weighing of the heart, Nut's sky, the sun barque, the primordial waters (wizard) — each
filled to its count at its repaint. **Weighing returns at the end**: goods in the merchant's storehouse, the heart
before the gods — the same scale.

### Junior — a nobleman's house

Decided 2026-10-27. A New Kingdom noble kept no room for art: the art is the house, murals on every wall, so it is
junior's ground and not an activity. Music belongs to the banquet. A reception hall is left to the ranks above, where the priest, the pharaoh and the gods each
receive in their own way (one activity, each rank's own dressing); the bakery-brewery gives the house more of its
own character.

| Activity         | Props                                                                        | Wall                       |
| ---------------- | ---------------------------------------------------------------------------- | -------------------------- |
| banquet          | **banquetTable** (bread, fruit, wine jars), **harp**, jarRack (wine)         | hanging (a banquet frieze) |
| dressing room    | **dressingTable** (copper mirror, kohl pots), **wigStand**, shelf (perfume)  | sconce (a mirror)          |
| household shrine | shrine (Bes, Taweret), offeringTable (flowers), lamp                         | stela (a false door)       |
| garden court     | basin (a lotus pool, copper rim), **pottedTree**, pillar (lotus column), mat | —                          |
| bedroom          | **bed** (lion legs), **headrest**, chestProp (linen)                         | —                          |
| bakery-brewery   | **grindstone**, **breadOven**, jarRack (beer)                                | —                          |

Footprints (`DECORATION_FOOTPRINTS`): banquetTable, bed and the lotus pool 2×1; harp and pottedTree 1×1 with
`tall: 1`; the rest 1×1. A kind stands in a room's middle only on a sized or floor place of a designed room the DSL
lays over it (a prefab, `placePrefabs.ts`): the banquet table and the pool stand where its file draws them, the player
walking round them. Every other kind stands against the north wall.

## 2. Who has the room: one purpose, by precedence

| Precedence | Purpose         | What the room shows                                     |
| ---------- | --------------- | ------------------------------------------------------- |
| 1          | story           | the scene's set — usually an activity's (below)         |
| 2          | mechanism       | the lock, lever or torch, and nothing competing with it |
| 3          | patron          | the god's statue and shrine (exists)                    |
| 4          | treasure / shop | the chest, or Fez's stall                               |
| 5          | activity        | every other chamber: a junction, a stairhead, the exit  |

Two layers lie **over** any purpose rather than beside it: the site's **condition** (overgrowth, flooding —
an overlay, exists) and a **ward pocket**, which is dressed in the rank it belongs to (exists).

**Story rooms are pinned prefabs** (`nodes: [{ room }]`): a scene happens in one designed room, dressed from an
activity's kinds, with an `actor` place for its figure beside the stop. Fez's meeting on `starter_1` floor 0 is
`fezStall`, a **selling** room (he is the merchant who overpaid for a map); Ipi's tomb room is `ipiLedger`, a
**ledger** room among his jars. A scene that needs a thing of its own (the Sphinx inscription) gets its own prop —
rare.

## 3. The carve dresses every chamber

- The carve picks a purpose per chamber by the precedence above, then the activity, then its props and wall
  item from that activity. Deterministic from the site id.
- **Only chambers are dressed**: forks, and dead-end stairheads and exits — the rooms that claim floor on the
  map. Puzzles stand in corridors and carry no prop; the entrance claims no floor and is bare. Props stay **out
  of the node's cell**, so a tap is never blocked.
- Lead plus companion both come from the room's activity; the companion odds stay as they are.
- **A prefab room dresses itself.** Where the DSL lays a designed room over a chamber (`rooms` on a floor or a
  pyramid, `src/game/rooms/<tier>/*.room`), the file's places choose its props and wall items, not the activity's
  pool. Starter names one room per activity (`STARTER_ROOMS` in `src/worldGen/spec/starter.ts`): the storeroom at
  the ends of a floor, the packing room and the ledger room between, the weighing and selling rooms in its middle.
- Changing the pools re-bakes `generatedWorld.ts` and the tier fingerprint; saves and runs are untouched
  (`world-spec-stability.md`: decorations are free fields).
- **No rotation.** One sprite per prop, against the north wall. Facing other walls would cost 2–4 drawings per
  prop plus renderer code; variants buy more variety for the same work.

## 4. Art, order, and the release

- **The first release is starter only**, finished: the new opening and the meeting with Fez on floor 0, the
  vivid starter, themed rooms. The gate `LAST_RELEASED_DIFFICULTY = "starter"` is set at release time; main
  is separate from releasing. Nothing has been released yet, and the release resets saves.
- Each later rank ships in its own release with its repaint and its activities.
- Every new prop follows `docs/instructions/prop-pipeline.md`: decide the object, geometry, scaffold, then the
  repaint. The generator only keeps the projection when there is geometry under it.
- New starter props are held to the light-rank rule: at least **25 L\*** darker than the floor (`#d8c8a8`),
  saturated terracotta, wood, red ochre and turquoise, with a dark base or contact shadow.

## How the work splits

| Who                | What                                                                                                       | How                                                                                                                                                        |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claude (subagents) | scaffolds for new props, prompts in the repaint queue, the activity table, the carve change, story content | in batches; the queue is always stocked in the order that matters                                                                                          |
| The user           | painting, in short sessions                                                                                | `yarn repaint` lists what is owed; generate; `yarn repaint <key> --land` imports and measures it; look in Storybook; a bad roll gets a `**Re-roll:**` line |
| Claude             | landing a batch                                                                                            | commits, tokens, docs, and the playtest backlog in one pass after a painting session                                                                       |
| The user           | story testing                                                                                              | Storybook's story beats (#319); in the game, develop-mode jumps straight to a story room; what is not yet played goes in `docs/playtest-backlog.md`        |
