# Themed rooms — a floor that reads as a place

A floor of a pyramid should read as ONE place: here goods were weighed, here they were packed, here the stock
stood, here it was sold. Every room says one thing, and together they say where you are.

Decided 2026-10-18 with the user. Builds on [visual-direction.md](visual-direction.md) (ground plus metal, the
light/dark floor rule, the tier themes) and on the room dressing that already exists: `PROP_ROLES` in
`src/game/dressingTags.ts`, `worldGen/dressingRoles.ts`, and "one purpose per room" in
`src/game/carve/render.ts`.

## What exists today, and what is missing

- A **role** per wing (`trade`, `funerary`, …) narrows the rank's prop pool at world-gen time.
- **Only forks and dead-end endpoints are dressed**; ordinary puzzle rooms get no prop (`carve/render.ts`).
- **One prop and one wall item per dressed room**, plus an optional second prop of the same purpose in about a
  third of rooms (`companionProps.ts`). The prop leads, the wall item follows.
- Props stand against the **north wall**, are **one sprite with no orientation**, and may have numbered art
  variants (`offeringTable-2`) picked per cell.

Missing: a level **below the role** — the activity a single room is for — and dressing for the rooms that are
not forks.

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
- Untagged kinds (rubble, pillar, mat) stay filler that fits anywhere.
- **`PROP_ROLES` is derived from the activities**, so there is one list, not two that drift.

Junior and up get their own activities when their rank is repainted — the list in the story review session:
banquet, dressing room, household shrine, garden court (junior); purification, offering, sanctuary, House of
Life, star-watching (expert); treasury, audience, burial chamber, armoury (master); the weighing of the heart,
Nut's sky, the sun barque, the primordial waters (wizard). **Weighing returns at the end**: goods in the
merchant's storehouse, the heart before the gods — the same scale.

## 2. Who has the room: one purpose, by precedence

| Precedence | Purpose         | What the room shows                                     |
| ---------- | --------------- | ------------------------------------------------------- |
| 1          | story           | the scene's set — usually an activity's (below)         |
| 2          | mechanism       | the lock, lever or torch, and nothing competing with it |
| 3          | patron          | the god's statue and shrine (exists)                    |
| 4          | treasure / shop | the chest, or Fez's stall                               |
| 5          | activity        | every other room, **puzzle rooms included**             |

Two layers lie **over** any purpose rather than beside it: the site's **condition** (overgrowth, flooding —
an overlay, exists) and a **ward pocket**, which is dressed in the rank it belongs to (exists).

**Story rooms borrow an activity's set** so a scene has a place on the floor without new art: Fez's meeting on
`starter_1` floor 0 is **selling** (he is the merchant who overpaid for a map), Ipi's tomb room is **ledger**.
A scene that needs a thing of its own (the Sphinx inscription) gets its own prop — rare.

## 3. The carve dresses every room

- The carve picks a purpose per room by the precedence above, then the activity, then its props and wall item
  from that activity. Deterministic from the site id, as today.
- **Every room with free cells is dressed**, puzzle rooms included. Props stay **out of the node's cell**, so
  a tap is never blocked.
- Lead plus companion both come from the room's activity; the companion odds stay as they are.
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
