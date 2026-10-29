# Story on floors — authoring cleanup plan

How story beats reach a carved floor, where that is still content-driven instead of authored, and what to change.
Written against `camp/home-and-loot` at `4b2480fb` (2026-10-29); line numbers are from there. Settle items 1–2 before
room prefabs land (`docs/superpowers/specs/2026-10-29-room-prefabs*`): prefabs ("pinned story rooms") build on the same
seam.

Delete this file when every item is done or rejected.

## How it works now

A story beat is a node selector, the same vocabulary as puzzles and traps:

```ts
pathPuzzles: 1, // floor authored one room longer
nodes: [{ where: "last", encounter: "conversation", activity: "selling" }],
```

- `conversation` and `reading` are families the story mod registers (`src/mods/story/game/conversation/meta.ts`,
  `src/mods/story/game/reading/meta.ts`, `ownerMod: "story"`). Core sees an ordinary encounter.
- `activity` becomes `RoomCell.authoredActivity` (`src/game/carve/mainRooms.ts:113`, `roomSpecs.ts:102`,
  `seatChambers.ts:157`). It wins over every other room purpose and makes the room a chamber even in a corridor
  (`src/game/roomFootprint.ts:78`).
- Who stands in the room comes from a registry the story mod fills (`src/app/SiteMap/roomOccupants.ts`). Core draws
  what it is given.

The carve engine names no scene, character or story journey. Keep it that way. The debt is in authoring.

## 1. The scene is guessed from the journey id

`src/mods/story/game/conversation/sceneFor.ts`:

```ts
export const FEZ_MET_IN = "starter_1"
/^(starter|junior|expert|master|wizard)_treasure_tomb(?:_([a-z]))?$/
```

A hardcoded journey, a regex over tier names, and a naming convention that must match the script keys. A second
conversation in one journey cannot be expressed. An override exists (`encounterArgs.conversation`, `sceneOfRoom`) but
`encounterArgs` is per floor, so it cannot target one node.

**Do:**
- Add per-node args to `NodeSelector` (`src/worldGen/dsl.ts:67`), e.g.
  `{ where: "last", encounter: "conversation", activity: "ledger", args: { conversation: "tomb.starter" } }`.
- Author the scene on every conversation node in `src/worldGen/spec/*.ts`.
- Delete `sceneFor`'s regex and `FEZ_MET_IN`. Replace with a check: every conversation room names a scene the
  script has.
- Check what reads `FEZ_MET_IN` elsewhere before deleting it.

Encounter args are free fields (`docs/game-design/world-spec-stability.md`), so this should not move corridors. Confirm
with a baseline diff of `generatedWorld.ts`.

## 2. Story rooms are added by count arithmetic

Specs add a room for a beat by hand, two numbers that must stay in step:

- starter: `pathPuzzles: N + 1` plus `where: "last"` (`src/worldGen/spec/starter.ts:110`, `:274`).
- tombs: `pathPuzzles: TOMB_ROOMS_PER_FLOOR.x + 2` plus `where: TOMB_ROOMS_PER_FLOOR.x + 2`, on 8 tomb floors in
  `junior.ts:232`, `expert.ts:236,278`, `master.ts:217`, `wizard.ts:205,254,294`.

Each carries a comment explaining why. Story rooms count as "puzzles" though they are not.

**Do:** an additive selector that grows the path itself, e.g.
`extraRooms: [{ at: "end", encounter: "conversation", activity: "ledger" }]`. Adding a room is structural (it
re-carves), stated once by the DSL instead of in every spec. Design it so pinned prefab rooms can use it too.

Brainstorm the shape with the user first: this is a DSL vocabulary change.

## 3. Story toggle-off is unproven for floors

Only topology has a toggle-off check (`src/mods/topology/toggleOff.spec.ts`, `toggleOff.verify.ts`;
helpers in `src/game/testSupport/modOff.ts`). Not verified: with story off, a `conversation` node likely resolves to
the path default, so the extra rooms become puzzles nobody authored. Corridors stay, content changes.

**Do:** decide what a room whose mod is off becomes (bare room fits "mod off = same carve, bare nodes"; ask the user),
then add `src/mods/story/toggleOff.verify.ts` pinning it.

## 4. The Sphinx tileset is a core type literal

`src/game/siteTypes.ts:559`: `Tileset = Difficulty | "cave" | "sphinx"`, for one floor
(`src/worldGen/spec/starter.ts:149`). The same list is retyped in `scripts/mechanismColour.ts` (`TILESETS`) and
`scripts/importPanel.ts:27` (`PANEL_TIERS`).

**Do:** one exported tileset list as data; derive the type and both scripts from it. Ideally the art layer
registers tilesets the way occupants register, and authoring checks a named tileset exists.

Leave `toFloor`/`depth` (only the Sphinx tunnel uses them): generic and guarded in `buildSite`.

## 5. `activity` also means "this room is a stage"

An authored activity always makes a chamber (`isChamber`), so a corridor stop cannot be dressed without claiming floor.
That fits "puzzles are corridor stops", but the meaning is implicit.

**Do (with prefabs):** when prefabs bring "pinned/central", give it its own field (a prefab id or `stage: true`) and
let `activity` mean dressing only.

## Related: room rules to unify before prefabs

Prefabs will lean on these. Each is one rule written several times:

- Claims floor: `src/game/carve/seatChambers.ts:135` (`claimsFloor`) re-implements `roomFootprint.claimsFloorAt`
  with a different branch-leaf test. Make "leave out authored activities" a parameter of the one rule.
- Has a middle: `carve/render.ts:350` (`takesCentre`), `carve/growRooms.ts:63` (`growsAt`), `siteValidator.ts:329`.
  One `hasMiddle()` in `roomFootprint`.

## Rules for whoever picks this up

- `generatedWorld.ts` and tableaus stay byte-identical where an item claims to be free; capture a baseline first.
- Tests carry the claim (test name + assertion), not doc comments. No tests on authored content.
- Items 2, 3 and 5 change authoring vocabulary or behaviour: plan first and ask at forks.
