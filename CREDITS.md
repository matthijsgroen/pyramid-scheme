# Credits

Original sources for every asset in this project that is not our own work.

Everything else — the map tiles, the props, the surfaces, the explorer — is drawn for this project, either
generated from a prompt over geometry modelled in `scripts/renderProp.py` or painted by hand. The pipeline
is in `docs/instructions/prop-pipeline.md` and the masters are in `art/masters/`.

## 3D scans

Used as the GEOMETRY a tile's repaint is drawn over: a scan gives the silhouette and the projection, the
generator supplies the material. See `meshscaffold` in `art/rebuild.sh`.

- **Stone shabtis of King Senkamanisken**\
  Artist: [Scan The World](https://www.myminifactory.com/users/Scan%20The%20World)\
  Artefact: shabty of Senkamanisken, [Brooklyn Museum](https://www.brooklynmuseum.org/opencollection/objects/3443)\
  [Source](https://www.myminifactory.com/object/3d-print-stone-shabtis-of-king-senkamanisken-74931) •
  [License](https://creativecommons.org/licenses/by-nc-sa/4.0/) (CC BY-NC-SA 4.0)\
  Drawn over for `src/assets/tiles/starter/statue.png`, via `art/masters/props/starter/statue-shabti.webp`

Two notes on that licence, because it reaches past this file:

- **SA.** The scaffold render and the repaint over it are DERIVATIVES of the scan, so `statue.png` and
  `statue-shabti.webp` are CC BY-NC-SA 4.0 themselves rather than whatever the rest of the project is
  under. One tile, nine rooms. The mesh in `art/masters/meshes/` is a redistribution of the scan and
  carries its licence unchanged.
- **BY.** Attribution has to reach the PLAYER, not only this file — a repository credits file does not do
  that once the game ships. An in-app panel is the part still missing; `block-sorting` renders exactly this
  markdown inside its settings screen, which is the pattern to copy.

**NC is not a constraint here:** this project is non-commercial.

## Fonts and libraries

Nothing beyond what `package.json` declares, under its own licences.
