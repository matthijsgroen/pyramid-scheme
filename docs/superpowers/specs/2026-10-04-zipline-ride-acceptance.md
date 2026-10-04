# Riding the zipline: acceptance criteria

Taking a zipline now hides the explorer, awaits `PlayTraversal`, and shows them at the landing
(`src/app/SiteMap/obstacleTraversal.ts`, `docs/instructions/zipline-is-taken-plan.md`). Nothing plays yet:
`crossAtOnce` resolves at once. This fills that seam with a ride the player can see. The seam stays the
same: `Traversal` already carries `from`, `to`, `dir` and `kind`.

## The ride

- [ ] When the player takes a zipline, they see the explorer **slide** from the launch to the landing
      along the cable, as a CSS transition or animation of one sprite. There are no frames to cycle.
- [ ] The sprite is picked by `dir`: `s` uses `explorer-zip-s`, `n` uses `explorer-zip-n`, and `e` uses
      `explorer-zip-e`. `w` is `e` mirrored with `scale(-1, 1)`, as the walking figure is.
- [ ] The promise settles when the slide ends (`animationend`/`transitionend`), so the length of the slide
      is the length of the ride. Nothing else holds a duration.
- [ ] The explorer appears at the landing straight after, as now. The map follows the ride the same way
      it follows a walk.
- [ ] Under `prefers-reduced-motion: reduce` the ride is crossed at once, as `crossAtOnce` does now.
- [ ] A zipline with no ride art for its facing is crossed at once, so the art can land after the code.
- [ ] Only a zipline rides like this. Any other obstacle kind keeps `crossAtOnce` until it gets its own
      art.
- [ ] Tests mock the slide's end and assert the order of events: hide, play, land, show. They never
      assert a duration.
- [ ] A **Zipline story** (`Zipline.stories.tsx`) plays all four directions over a real floor.

## The ride art

Three single sprites, the same person as the walking set: **hanging from a zipline handle by both
hands, legs tucked, the torch over the shoulder in the pack strap** (the same place the stone-carrying
pose puts it: `2026-10-04-stones-acceptance.md`, "The carrying explorer").

| file             | view                                    |
| ---------------- | --------------------------------------- |
| `explorer-zip-s` | front, coming toward the viewer         |
| `explorer-zip-n` | back, going away                        |
| `explorer-zip-e` | side, facing right; west is it mirrored |

- [ ] The sprites are in `src/assets/tiles/default/`, at 40 × 70 like the walking set. A bare name is a
      one-frame animation to `sharedTileFrames`. The handle is at the top of the box, so the hands sit on
      the cable line where the zipline art draws it.
- [ ] The Facings story shows the three beside the walking set, at 1:1 and 3x, over limestone and
      granite.
- [ ] The sheet's master is kept at `art/masters/props/default/explorer-zip.webp`, and its cut and import
      lines are in `art/rebuild.sh`.

Make it the way the carrying set is made: give the generator the current `explorer-s-1`, `explorer-n-1`
and `explorer-e-1` as the reference, then:

```
yarn cut-sheet art/masters/props/default/explorer-zip.webp --out=/tmp/zip --rows=front,back,side --min=0.8
yarn import-tile /tmp/zip/front-1.png --tier=default --name=explorer-zip-s --slot=explorer --filter=smooth
yarn import-tile /tmp/zip/back-1.png  --tier=default --name=explorer-zip-n --slot=explorer --filter=smooth
yarn import-tile /tmp/zip/side-1.png  --tier=default --name=explorer-zip-e --slot=explorer --filter=smooth
```

Prompt, beside the reference frames:

```
The same explorer as in the reference images, same hat, shirt, scarf, trousers, boots and pack, same
palette and pixel scale. He hangs from a wooden zipline handle gripped in both raised hands, the handle
at the very top of the frame, legs tucked up, body swung slightly back. His lit torch is tucked over his
right shoulder into the pack strap, flame beside his head. No cable drawn. Three rows, one pose each:
front view, back view, side view facing right. Wide margin around the whole sheet. Flat magenta #ff00ff
background, no shadow.
```

## Not in scope

A sound effect (it goes through the same seam later), a swing or sway cycle, ride art for other obstacle
kinds, and a ride while carrying a stone (that can't happen: a zipline takes empty hands).
