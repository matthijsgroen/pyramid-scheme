# Handover — the cave: art, shape and big rooms

Branch `tomb/cave-and-cavern` (worktree `prickly-gila`), built on `story-and-artstyle` (PR #322, still open) with
`origin/main` merged in. Nothing pushed. The tomb redesign itself is done: spec
`docs/superpowers/specs/2026-10-22-tomb-redesign-design.md`, plan `docs/superpowers/plans/2026-10-22-tomb-redesign.md`.

## The cave art, done

Floor, wall face, sill, encounter wall, nine props (basin, pillar, rubblePile, pit, crystal, brazier, stalagmite,
puddle, bones) and two wall items (roots, stalactites) are painted and imported; their masters are in
`art/masters/`, and their prompts left the repaint queue as they landed.

- **Value rules** (`docs/game-design/visual-direction.md`, "Light and dark floors"): the cave floor is dark (L\* 27),
  so the wall face and props are LIT and pale. `yarn rank-colour` prints a cave row. The wall face passes (−27.5,
  imported at `--brightness=1.25`). Props measure 12–22 L\* on their MATERIAL (lit half of the pixels); the
  whole-sprite 25 L\* is unreachable for stone under the props' double wash. Open: write that cave target into
  visual-direction.md — the designer has not yet said yes.
- **Repainting a prop lighter**: attach the accepted prop itself (`art/masters/props/cave/<kind>-dark.webp`) with
  "THIS VERY OBJECT … change only its values". Works far better than a fresh roll.
- **Generator quirks and their fixes**: shadow comes back MAGENTA → `art/deshadow.sh <render> clean.png
<kind>-shadow.png`, import with `--seat=… --seat-opacity=0.55`. Floor reference copied into the picture → cut the
  object out by difference against the reference (bones' Prepare line). A band instead of a square (floor, wall
  face) → the Prepare lines stack/lay copies and `make-seamless`.
- **Props can cover several cells** (`DECORATION_FOOTPRINT` in `src/game/siteTypes.ts`: cols × rows, `tall`);
  bones is 2×1. `import-tile --cells=CxR --tall=N`. Default 1×1 everywhere else.
- **The tableau's door** shows the wall behind it (`useWallBehind`), seamless with the encounter frame.
- A cave is not furnished: floor scatter never puts a `mat` in it.

## Open

1. **Rounded/ragged cave floor edge** — a subagent was building it when this was written (render-only, cave only,
   faces stay straight). Check `git log` for its commits and look at Storybook `app-sitemap-rankonthefloor--cave`
   against `--starter` (unchanged).
2. **Corner rocks** (`cave/cornerRock` in the wall/corner slots of `src/app/SiteMap/tileRegions.ts`, 252-296), only
   where the tileset has the art.
3. **Big authored chambers** (designer chose option A): `nodes: [{ where, chamber: { cols, rows } }]`; the carve
   keeps the room free (`src/game/roomFootprint.ts`, the claim ring `ORTHO_/DIAGONAL_OFFSETS` in
   `buildRoomClaims`), big props fill it. Default off, so lower tiers stay byte-identical; first used in EXPERT
   (memory: art tier roadmap).
4. **Art still to paint**: `cave/rubbleSpill` (prompt rewritten as fallen scree), `exteriors/cave-mouth`,
   `exteriors/cavern` (import with their Import line; `--land` cannot run exteriors).
5. **Finish the branch**: merge into `story-and-artstyle`, or push and open a PR against it — the designer's call.

## Checks to run

`yarn verify`, `yarn verify-content` (includes `tierFingerprints.verify.ts` — the `.spec.ts` alone is not enough),
`yarn rank-colour`, and look in Storybook (RankOnTheFloor → cave; PuzzleOnItsWall → `wall: cave`).
