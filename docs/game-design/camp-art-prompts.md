# Camp art — generation prompts

The art for `CampScene` (`docs/superpowers/specs/2026-10-23-camp-scene-design.md`). One entry per image,
under the key `camp/<piece>`; the key is the piece id in `src/ui/atoms/campScene/campCatalogue.ts`, and the
file lands as `src/assets/camp/<piece>.webp`.

**`yarn repaint`** lists what is still owed here, and **`yarn repaint camp/<piece>`** puts that entry's prompt
on the clipboard with §0 folded in and reveals its attachments in the Finder. An entry whose file exists
drops off the list.

## How the set is built

**One image per spot per step, each one replacing the one before.** A spot is painted ONCE in its final
state — the wizard camp — and every earlier step is an edit of the step after it: "the same picture,
without the flag". Walking the chain backwards is what keeps one spot the same tent, the same donkey and
the same light from its first step to its last. So per spot the order is: the LAST entry first, then up.

**Each spot attaches its own crop of the wizard impression** (`art/masters/camp/ref-<spot>.webp`): the whole picture holds too many objects for the generator to find one spot in it. **The anchor is the wizard impression** (`art/masters/camp/impression-wizard.webp`), attached to every entry, for the viewing angle,
scale, composition **and colours**. **The painting is the world's**, from `docs/game-design/visual-direction.md`
(on `tomb/cave-and-cavern` until it merges): matte, no outlines — an edge is a change of value. Only the
characters keep outlines. So: the impressions' palette, the world's brushwork — not their outlined,
glossy look.

**Value first:** the sand is pale, so every object is clearly darker than it. The scene adds a contact
shadow in code, so the art carries none. A final-state entry also attaches the chest once it has landed, so every
spot is painted against one finished object; an edit attaches the image it edits.

**What a return must have**, or roll it again:

- Square canvas. The group stands on an invisible ground line low in the frame, centred.
- Flat `#ff00ff` background to all four edges: no sand, no ground patch, no cast shadow under it.
- Neutral, even light and full colour. **The night is drawn by code** (a night tint over the scene),
  so a piece painted as night is dimmed twice and comes out murky. **No glow cast by fire on anything
  around it** either — flames themselves are fine; the scene's firelight is drawn by code too.
- In an edit: nothing moved. The same framing, position and size as the image it edits. A part that has
  moved breaks the step-to-step swap in the scene.

**Import:** `yarn import-camp <download> --name=<piece>` keys the magenta out, keeps the canvas (no trim:
every step of a spot must share one frame), writes the shipped file and keeps the master in
`art/masters/camp/`.

## Working the loop

The same steps for every piece, so a piece painted next month matches one painted today.

1. **`yarn repaint camp/<piece>`, in a NEW chat.** It stages the attachments in `~/tile-previews/attach/`:
   the spot's crop of the impression (shape, angle, colour) and the chest (brushwork). Drag both, paste.
2. **Judge the image on screen, not only the download.** A download can carry things the displayed image
   does not (an attached object painted in, a ground bar); then a screenshot of the displayed image is the
   better master (`art/README.md`).
3. **Fix a near miss as an edit in the same chat** ("repaint only the flames …"), not as a new generation:
   the composition, size and position stay. A new roll is for a wrong shape or angle.
4. **Land it:** `yarn import-camp <file> --name=<piece>`. Then check it on sand under the night tint (no
   pink fringe, darker than the sand, colours of the impression) and in Storybook.
5. **What a prompt never carries:** a light direction per spot, ground, a cast shadow, a glow. The art is
   lit the same way every time (neutral, upper left); everything that depends on where a piece stands —
   the contact shadow, the warm and cool side toward the fire, the glows — is drawn by the scene.

**A step that only removes a free-standing object needs no generation.** If the object stands apart from
the rest (an island in the picture, touching nothing), cut it out of the next step instead:
`yarn camp-cut <next-step> --name=<this-step> --at=<x>,<y>` (a point on the object, as shares of width and
height), then import as usual. Every other pixel stays exactly as it was. An object that touches the rest is
not an island; that step stays an edit.

A burning piece may get a second frame, `<piece>-b`, as an edit of the first (see `camp/campfire-b`): the
scene alternates the two. Without one the fire stands still.

## 0. The house style, stated once

> IMPORTANT: the reference image is outlined cartoon line art. Take only its objects, shapes, arrangement,
> angle and colours, NEVER its outlines: paint with no dark contour lines at all, every edge only a change
> of value between painted areas.
> Painted illustration of a vivid game prop, matte: soft brush texture, NO outlines anywhere, an edge is
> a change of value. Take the viewing angle, scale, composition AND THE COLOURS from the attached
> reference image: the same warm browns, golds and saturated hues as the matching objects in it. Do NOT
> take its line work or its glossy finish: same colours, new painting. Seen from slightly above, about 35
> degrees down, like the reference. Evenly lit by soft, neutral white light from the upper left: full,
> rich, saturated colour. Mid-tone to dark values with clear form shading, so the object
> stands out against pale sand, but never murky, grey or dull. Metals are saturated but matte, never
> glossy or shiny. No glow cast on anything, no light pool, no cast shadow on the ground, no sand, dirt,
> ash or ground patch under the objects. Flames are painted like the rest, with soft brushwork and
> varied warm colours, never a flat icon and never outlined; no glow halo around them, no loose sparks and
> no smoke. Paint only the object described: an attached image is a reference, and nothing from it
> appears in the picture unless the text asks for it. The objects
> stand isolated on a flat, solid #ff00ff magenta background that fills the whole square canvas to its
> edges. Square 1:1 canvas; the group stands on an invisible ground line at about 88% of the height,
> centred, filling about 80% of the width. No text, no frame, no border.

**Edit preamble** (`[edit]` below):

> Edit the second attached image. Change only what is described next. Keep everything else exactly as it
> is: the same framing, position, size, colours, painting and the same flat #ff00ff background. Do not
> re-compose, crop, zoom or redraw what is not mentioned.

## 1. Fixed objects

Paint the chest first: every later final-state entry attaches it.

### 1. `camp/chest` — Treasure chest

Attach: `art/masters/camp/impression-wizard.webp`

> [preamble] Paint the treasure chest from the reference image, in its colours: warm brown wooden planks, a domed lid, lid closed, broad gold metal bands and corners and a gold lock plate, all matte.

### 2. `camp/window` — Stained-glass window

The whole impression is too busy for the generator to find the window in, so this entry attaches a crop
of it: `ref-window` is the window cut from the wizard impression.

Attach: `art/masters/camp/ref-window.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly that window, with its shape,
> proportions and angle. The second attached image is a finished prop in the target painting style:
> match its brushwork, matte finish and lighting. A slender free-standing stained-glass window with a
> POINTED gothic arch, about twice as tall as it is wide, in a THIN dark-brown wooden frame, a flat board
> rather than a cabinet. It stands almost square to the viewer, turned only slightly, its bottom edge
> resting straight on the ground: no feet, no plinth, no base. Deep blue glass with gold-yellow lotus
> vines and a gold-yellow star-shaped sun at the top, in the colours of the reference. Paint the glass as
> coloured glass, not glowing.

### 3. `camp/campfire` — Small campfire

Attach: `art/masters/camp/impression-wizard.webp`, `art/masters/camp/chest.webp`

> [preamble] Paint a SMALL, low campfire, the kind a lone traveller makes: four or five thin, crossed
> sticks with small, lively flames. Not logs, not a bonfire. It is small in the frame: about a
> third of the canvas width, standing on the ground line, the rest of the canvas empty magenta. No
> stones around it, no ash bed, no ground patch: the sticks sit directly on the magenta.

### 4. `camp/campfire-b` — Small campfire, second frame

Edit of `camp/campfire`. A burning piece may have a second frame, `<id>-b`: the scene alternates the two
for a small flicker. A burning step of a spot (the fire, the clay oven) may get a `-b` entry the same way,
an edit of that step with only the flames repainted.

Attach: `art/masters/camp/impression-wizard.webp`, `art/masters/camp/campfire.webp`

> Edit the second attached image: the next frame of a gentle flicker, a SMALL change only. Keep the
> sticks, the flame's base, its overall height, width and lean exactly as they are. Change only the flame
> tips: shift each tongue a little sideways, make the tallest one slightly shorter and a side tongue
> slightly longer, and move the inner colours a touch. No new tongues, no floating fragments or sparks,
> nothing detached from the flame. Same painting style, crisp opaque outer edge, flat #ff00ff background.

The two frames alternate a few times a second, so they must be near twins: a frame that leans or grows
reads as the fire jumping, not flickering.

## 2. Camp spots

### Fire pit (`fire`)

#### 5. `camp/seatCushions` — Fire pit, step 7 of 7 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-fire.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the fire pit, complete: a ring of rough grey stones with a big crackling fire in it, a black iron pot hanging over the fire from a wooden crossbar on two forked sticks, two flat cooking stones beside the ring, three low flat seating stones around it, each with a woven rug laid over it and a few plump cushions on top, and a small dome-shaped clay oven behind it with firewood stacked at its side. Use the colours of the matching objects in the reference image.

#### 6. `camp/clayOven` — Fire pit, step 6 of 7 (master)

Edit of `camp/seatCushions`.

Attach: `art/masters/camp/ref-fire.webp`, `art/masters/camp/seatCushions.webp`

> [edit] Remove this, and only this: the woven rugs and cushions on the seating stones; the bare stones stay. Where they lay, show the stone or
> whatever was behind it.

#### 7. `camp/seatingStones` — Fire pit, step 5 of 7 (expert)

Edit of `camp/clayOven`.

Attach: `art/masters/camp/ref-fire.webp`, `art/masters/camp/clayOven.webp`

> [edit] Remove this, and only this: a small dome-shaped clay oven behind the fire, a stack of firewood at its side. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 8. `camp/pot` — Fire pit, step 4 of 7 (junior)

Edit of `camp/seatingStones`.

Attach: `art/masters/camp/ref-fire.webp`, `art/masters/camp/seatingStones.webp`

> [edit] Remove this, and only this: three low, flat seating stones set around the fire. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 9. `camp/cookingStones` — Fire pit, step 3 of 7 (starter)

Edit of `camp/pot`.

Attach: `art/masters/camp/ref-fire.webp`, `art/masters/camp/pot.webp`

> [edit] Remove this, and only this: a black iron pot hanging over the fire from a wooden crossbar on two forked sticks. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 10. `camp/fire` — Fire pit, step 2 of 7 (starter)

Edit of `camp/cookingStones`.

Attach: `art/masters/camp/ref-fire.webp`, `art/masters/camp/cookingStones.webp`

> [edit] Remove this, and only this: two flat cooking stones lying beside the ring. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 11. `camp/stoneRing` — Fire pit, step 1 of 7 (starter)

Edit of `camp/fire`.

Attach: `art/masters/camp/ref-fire.webp`, `art/masters/camp/fire.webp`

> [edit] Make the fire in the stone ring small and low again: a few sticks with small flames.

### Sleeping place (`sleeping`)

#### 12. `camp/pavilion` — Sleeping place, step 8 of 8 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the sleeping place, complete: a round cream canvas tent with an open flap and a small pale-blue pennant on top, a striped red-and-ochre rug in its doorway, a woven reed mat with a folded grey-blue blanket in front of it, a second smaller cream tent beside it, and an open pavilion with gauzy white curtains and a pile of coloured cushions beside the tents. Use the colours of the matching objects in the reference image.

#### 13. `camp/secondTent` — Sleeping place, step 7 of 8 (master)

Edit of `camp/pavilion`.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/pavilion.webp`

> [edit] Remove this, and only this: an open pavilion with gauzy white curtains and a pile of coloured cushions, beside the tents. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 14. `camp/tentFlag` — Sleeping place, step 6 of 8 (expert)

Edit of `camp/secondTent`.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/secondTent.webp`

> [edit] Remove this, and only this: a second, smaller cream tent beside the first. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 15. `camp/tentRug` — Sleeping place, step 5 of 8 (junior)

Edit of `camp/tentFlag`.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/tentFlag.webp`

> [edit] Remove this, and only this: a small pale-blue pennant flag on top of the tent. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 16. `camp/tent` — Sleeping place, step 4 of 8 (junior)

Edit of `camp/tentRug`.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/tentRug.webp`

> [edit] Remove this, and only this: a striped red-and-ochre rug in the tent's doorway. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 17. `camp/windbreak` — Sleeping place, step 3 of 8 (starter)

Edit of `camp/tent`.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/tent.webp`

> [edit] Replace the round tent with a windbreak: pale cloth stretched between four wooden poles, standing behind the reed mat in the same place. The mat and blanket stay exactly as they are.

#### 18. `camp/blanket` — Sleeping place, step 2 of 8 (starter)

Edit of `camp/windbreak`.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/windbreak.webp`

> [edit] Remove this, and only this: a windbreak of pale cloth stretched between four wooden poles behind the mat. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 19. `camp/reedMat` — Sleeping place, step 1 of 8 (starter)

Edit of `camp/blanket`.

Attach: `art/masters/camp/ref-sleeping.webp`, `art/masters/camp/blanket.webp`

> [edit] Remove this, and only this: a folded grey-blue blanket on the mat. Where it stood, show the #ff00ff background or
> whatever was behind it.

### Water (`water`)

#### 20. `camp/wellPulley` — Water, step 6 of 6 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-water.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the water, complete: a round stone well with a small wooden roof on two posts, a roller with a crank and a rope over the well, a long low stone water trough with water in it, two terracotta water jars with small handles and a round dried gourd bottle. Use the colours of the matching objects in the reference image.

#### 21. `camp/well` — Water, step 5 of 6 (master)

Edit of `camp/wellPulley`.

Attach: `art/masters/camp/ref-water.webp`, `art/masters/camp/wellPulley.webp`

> [edit] Remove the wooden roof with its two posts, the roller, the crank and the rope; the round stone
> well stays exactly as it is. Where they stood, show the #ff00ff background or whatever was behind them.

#### 22. `camp/waterTrough` — Water, step 4 of 6 (expert)

Edit of `camp/well`.

Attach: `art/masters/camp/ref-water.webp`, `art/masters/camp/well.webp`

> [edit] Remove this, and only this: the round stone well. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 23. `camp/secondJar` — Water, step 3 of 6 (junior)

Edit of `camp/waterTrough`.

Attach: `art/masters/camp/ref-water.webp`, `art/masters/camp/waterTrough.webp`

> [edit] Remove this, and only this: a long low stone water trough with water in it. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 24. `camp/jar` — Water, step 2 of 6 (starter)

Edit of `camp/secondJar`.

Attach: `art/masters/camp/ref-water.webp`, `art/masters/camp/secondJar.webp`

> [edit] Remove this, and only this: a second terracotta jar. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 25. `camp/gourd` — Water, step 1 of 6 (starter)

Edit of `camp/jar`.

Attach: `art/masters/camp/ref-water.webp`, `art/masters/camp/jar.webp`

> [edit] Remove this, and only this: a terracotta water jar with two small handles. Where it stood, show the #ff00ff background or
> whatever was behind it.

### Cooking corner (`cooking`)

#### 26. `camp/feast` — Cooking corner, step 6 of 6 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-cooking.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the cooking corner, complete: a tall wooden tripod with a round black iron pot hanging from it over a small fire of a few logs, a small wooden spice rack with clay jars and bottles on its shelves, a round wooden bread board with two flatbreads leaning against the foot of the spice rack, a domed mud-brick bread oven with a short chimney, a small fire in its round mouth and firewood stacked in the opening underneath, a wooden drying rack of two A-frames and a crossbar with three fish hanging from it, and a patterned red rug set with plates of food, fruit and cups, striped cushions around it. Use the colours of the matching objects in the reference image.

#### 27. `camp/dryingRack` — Cooking corner, step 5 of 6 (master)

Edit of `camp/feast`.

Attach: `art/masters/camp/ref-cooking.webp`, `art/masters/camp/feast.webp`

> [edit] Remove this, and only this: a patterned red rug on the ground set with plates of food, fruit and cups, cushions around it. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 28. `camp/breadOven` — Cooking corner, step 4 of 6 (expert)

Edit of `camp/dryingRack`.

Attach: `art/masters/camp/ref-cooking.webp`, `art/masters/camp/dryingRack.webp`

> [edit] Remove this, and only this: a wooden drying rack of two A-frames and a crossbar with three fish hanging from it. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 29. `camp/breadBoard` — Cooking corner, step 3 of 6 (junior)

Edit of `camp/breadOven`.

Attach: `art/masters/camp/ref-cooking.webp`, `art/masters/camp/breadOven.webp`

> [edit] Remove this, and only this: the domed mud-brick bread oven with its chimney, the fire in its mouth and the firewood underneath. Where it stood, show the #ff00ff background or
> whatever was behind it. The round bread board with the two flatbreads leaned against the oven: keep its size and the spot
> where it stands on the ground, but tilt it back so it leans against the right side of the spice rack.

#### 30. `camp/spiceRack` — Cooking corner, step 2 of 6 (junior)

Edit of `camp/breadBoard`.

Attach: `art/masters/camp/ref-cooking.webp`, `art/masters/camp/breadBoard.webp`

> [edit] Remove this, and only this: a round wooden bread board with two flatbreads. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 31. `camp/tripod` — Cooking corner, step 1 of 6 (junior)

Edit of `camp/spiceRack`.

Attach: `art/masters/camp/ref-cooking.webp`, `art/masters/camp/spiceRack.webp`

> [edit] Remove this, and only this: a small wooden spice rack with clay jars and bottles. Where it stood, show the #ff00ff background or
> whatever was behind it.

### Donkey (`donkey`)

#### 32. `camp/paintedCart` — Donkey, step 6 of 6 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-donkey.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the donkey, complete: a wooden stake with a rope halter, a grey donkey lying down with woven saddlebags and a striped red-and-green blanket on its back, a second grey donkey lying down beside it, and a two-wheeled cart painted with bright geometric patterns in red, blue and gold, sacks, a cushion and bundles in it; its bed rests on a thick wooden axle with a spoked wheel on each end, the near wheel snug against the side of the bed, and its two shafts run along both sides of the grey donkey, strapped to a padded leather collar at its shoulders. Use the colours of the matching objects in the reference image.

#### 33. `camp/secondDonkey` — Donkey, step 5 of 6 (master)

Edit of `camp/paintedCart`.

Attach: `art/masters/camp/ref-donkey.webp`, `art/masters/camp/paintedCart.webp`

> [edit] Make the cart plain again: unpainted weathered wood, a few sacks in it, no cushion. Same cart, same place.

#### 35. `camp/cart` — Donkey, step 4 of 6 (expert)

Edit of `camp/secondDonkey`.

Attach: `art/masters/camp/ref-donkey.webp`, `art/masters/camp/secondDonkey.webp`

> [edit] Remove this, and only this: the brown donkey lying down in front of the cart. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 36. `camp/saddlebags` — Donkey, step 3 of 6 (junior)

Edit of `camp/cart`.

Attach: `art/masters/camp/ref-donkey.webp`, `art/masters/camp/cart.webp`

> [edit] Remove the cart with its sacks, its wheel, its axle and both its shafts, the padded collar and the straps that tied the shafts, and the striped
> blanket on the grey donkey. The leather bag stays, now hanging straight on its grey flank, and so does its halter. Where they stood, show the
> #ff00ff background or whatever was behind them.

#### 37. `camp/donkey` — Donkey, step 2 of 6 (junior)

Edit of `camp/saddlebags`.

Attach: `art/masters/camp/ref-donkey.webp`, `art/masters/camp/saddlebags.webp`

> [edit] Remove this, and only this: the leather bag on the donkey's flank and its strap. The halter stays. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 38. `camp/halter` — Donkey, step 1 of 6 (junior)

Painted on its own and placed by hand: the stake is its own picture, and `yarn import-camp` paints it in
behind every later donkey step (`BEHIND` in `scripts/importCamp.ts`). An edit that empties the cart
picture does not work: Gemini adds the stake instead. So the stake is painted alone, then scaled and set
into the donkey frame (behind the grey donkey's back, right of the cart's front post, where nothing of the
later steps covers its top) before import. Re-import the later steps from their masters once it lands.

Attach: `art/masters/camp/chest.webp`

> Painted illustration of a game prop, matte: soft brush texture, NO outlines anywhere, an edge is a change
> of value. Match the brushwork, matte finish and lighting of the attached image, but paint none of its
> content. Seen from slightly above, about 35 degrees down. Evenly lit by soft, neutral white light from the
> upper left: full, rich colour, mid-tone to dark values, so it stands out against pale sand. No cast
> shadow, no ground patch.
>
> Paint one thing: a short rough wooden stake, a weathered round post with a blunt top, driven straight into
> the ground, with a coiled rope halter hanging from a peg near its top. It stands upright in the middle of
> the canvas, its foot at about 90% of the height, its top at about 25%. Flat solid #ff00ff magenta
> background filling the whole square canvas to its edges. Square 1:1 canvas. No text, no frame.

### Camel (`camel`)

Three images, one per purchase: what Fez sells lands together (the camel with its rope and saddle; the
second camel with its trough), so no in-between step is ever on screen.

#### 39. `camp/caravanBanner` — Camel, step 3 of 3 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-camel.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the camels, complete: two camels lying down side by side, both facing left, the front one a little lower and closer; the back camel wears a padded saddle with a red saddle cloth with a woven border, the front camel a padded saddle with a blue saddle cloth with tassels; both wear rope halters with a rope lead hanging down. In front of them, to the left, a long low wooden water trough with water in it, on two small feet. Behind them, to the right, a tall wooden pole with a crossbar from which hangs a cream caravan banner painted with an orange falcon, tassels along its pointed bottom edge. Use the colours of the matching objects in the reference image.

#### 40. `camp/secondCamel` — Camel, step 2 of 3 (master)

Edit of `camp/caravanBanner`.

Attach: `art/masters/camp/ref-camel.webp`, `art/masters/camp/caravanBanner.webp`

> [edit] Remove this, and only this: the tall pole with its crossbar and the cream caravan banner with the falcon. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 41. `camp/camel` — Camel, step 1 of 3 (expert)

Edit of `camp/secondCamel`.

Attach: `art/masters/camp/ref-camel.webp`, `art/masters/camp/secondCamel.webp`

> [edit] Remove the front camel with its blue saddle cloth and halter, and the long wooden water trough. The back camel with its red saddle cloth, its halter and rope lead stays exactly as it is; where the front camel covered it, paint the rest of the back camel's body and legs as they would continue. Elsewhere show the #ff00ff background.

### Map table (`mapTable`)

#### 45. `camp/reedGlobe` — Map table, step 7 of 7 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-mapTable.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the map table, complete: a low dark wooden table on four square legs; a dark-blue star chart cloth spread across it, hanging down over its left end; on top a parchment map with rolled ends, drawn with three pyramids and a blue river; a red-brown leather scroll case lying on the table's left end; a round brass compass on the table's right end; a tall brass astrolabe standing upright at the back right of the table; and beside the table, on the right, a round globe woven from golden reeds on a wooden stand. Use the colours of the matching objects in the reference image.

#### 46. `camp/astrolabe` — Map table, step 6 of 7 (wizard)

Edit of `camp/reedGlobe`.

Attach: `art/masters/camp/ref-mapTable.webp`, `art/masters/camp/reedGlobe.webp`

> [edit] Remove this, and only this: the globe woven from golden reeds on its wooden stand beside the table. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 47. `camp/scrollCase` — Map table, step 5 of 7 (master)

Edit of `camp/astrolabe`.

Attach: `art/masters/camp/ref-mapTable.webp`, `art/masters/camp/astrolabe.webp`

> [edit] Remove this, and only this: the tall brass astrolabe standing at the back right of the table. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 48. `camp/starMap` — Map table, step 4 of 7 (master)

Edit of `camp/scrollCase`.

Attach: `art/masters/camp/ref-mapTable.webp`, `art/masters/camp/scrollCase.webp`

> [edit] Remove this, and only this: the red-brown leather scroll case lying on the table's left end. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 49. `camp/compass` — Map table, step 3 of 7 (expert)

Edit of `camp/starMap`.

Attach: `art/masters/camp/ref-mapTable.webp`, `art/masters/camp/starMap.webp`

> [edit] Remove this, and only this: the dark-blue star chart cloth under the map and over the table's end; the bare wooden table top shows there. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 50. `camp/table` — Map table, step 2 of 7 (expert)

Edit of `camp/compass`.

Attach: `art/masters/camp/ref-mapTable.webp`, `art/masters/camp/compass.webp`

> [edit] Remove this, and only this: the round brass compass on the table. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 51. `camp/map` — Map table, step 1 of 7 (expert)

Edit of `camp/table`.

Attach: `art/masters/camp/ref-mapTable.webp`, `art/masters/camp/table.webp`

> [edit] Remove the table. The same map now lies flat where the table stood, at the height of its feet, held down at two corners by small stones. Paint no ground under it: no sand, no slab, no base; the flat #ff00ff background shows right up to the edges of the map and the stones.

### Palm garden (`palmGarden`)

#### 52. `camp/figTree` — Palm garden, step 7 of 7 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-palmGarden.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the palm garden, complete: a low rectangular garden bed edged with pale stone slabs, filled with dark soil and a little grass; two tall date palms growing from it, the left one taller, their trunks leaning slightly apart, with bunches of orange dates hanging under both crowns; a small fig tree with purple figs at the front left of the bed; and in front of the bed, to the right, a low square stone planter with water, green lily pads and pink lotus flowers. Use the colours of the matching objects in the reference image.

#### 53. `camp/lotusPlanter` — Palm garden, step 6 of 7 (wizard)

Edit of `camp/figTree`.

Attach: `art/masters/camp/ref-palmGarden.webp`, `art/masters/camp/figTree.webp`

> [edit] Remove this, and only this: the small fig tree with purple figs at the front left of the bed; the palm trunk and the bed behind it show there. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 54. `camp/dates` — Palm garden, step 5 of 7 (master)

Edit of `camp/lotusPlanter`.

Attach: `art/masters/camp/ref-palmGarden.webp`, `art/masters/camp/lotusPlanter.webp`

> [edit] Remove this, and only this: the low square stone planter with water, lily pads and lotus flowers in front of the bed. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 55. `camp/secondPalm` — Palm garden, step 4 of 7 (master)

Edit of `camp/dates`.

Attach: `art/masters/camp/ref-palmGarden.webp`, `art/masters/camp/dates.webp`

> [edit] Remove this, and only this: bunches of orange dates hanging under both palms' crowns. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 56. `camp/palm` — Palm garden, step 3 of 7 (expert)

Edit of `camp/secondPalm`.

Attach: `art/masters/camp/ref-palmGarden.webp`, `art/masters/camp/secondPalm.webp`

> [edit] Remove this, and only this: the second, shorter date palm on the right, trunk and crown; the first palm and the bed stay exactly as they are. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 57. `camp/sprout` — Palm garden, step 2 of 7 (expert)

Edit of `camp/palm`.

Attach: `art/masters/camp/ref-palmGarden.webp`, `art/masters/camp/palm.webp`

> [edit] Replace the tall palm with a small green palm sprout, ankle-high, growing from the same spot in the same garden bed. The bed stays exactly as it is.

#### 58. `camp/seed` — Palm garden, step 1 of 7 (expert)

A seed is planted underground, so the step shows where it went in. Edit of `camp/bed` (see Layer sources).

Attach: `art/masters/camp/ref-palmGarden.webp`, `art/masters/camp/bed.webp`

> [edit] Add this, and only this: where the sprout grew, a small mound of freshly turned dark soil with a short
> wooden marker stick pushed into it. Everything else stays exactly as it is.

### Ibis pond (`ibisPond`)

#### 59. `camp/secondIbis` — Ibis pond, step 6 of 6 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-ibisPond.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the ibis pond, complete: a round pond of clear blue water, its rim edged with flat sandstone slabs, a clump of tall papyrus at one side, tall reeds and bulrushes along its back edge, lily pads and pink lotus flowers on the water, one white ibis with a black head and curved beak standing at the edge and a second ibis wading in the shallows. Use the colours of the matching objects in the reference image.

#### 60. `camp/lotus` — Ibis pond, step 5 of 6 (wizard)

Edit of `camp/secondIbis`.

Attach: `art/masters/camp/ref-ibisPond.webp`, `art/masters/camp/secondIbis.webp`

> [edit] Remove this, and only this: a second white ibis wading in the shallows. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 61. `camp/ibis` — Ibis pond, step 4 of 6 (master)

Edit of `camp/lotus`.

Attach: `art/masters/camp/ref-ibisPond.webp`, `art/masters/camp/lotus.webp`

> [edit] Remove this, and only this: lily pads and pink lotus flowers on the water. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 62. `camp/reeds` — Ibis pond, step 3 of 6 (master)

Edit of `camp/ibis`.

Attach: `art/masters/camp/ref-ibisPond.webp`, `art/masters/camp/ibis.webp`

> [edit] Remove this, and only this: a white ibis with a black head and curved beak standing at the water's edge. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 63. `camp/papyrus` — Ibis pond, step 2 of 6 (master)

Edit of `camp/reeds`.

Attach: `art/masters/camp/ref-ibisPond.webp`, `art/masters/camp/reeds.webp`

> [edit] Remove this, and only this: tall reeds and bulrushes along the pond's back edge. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 64. `camp/edgeStones` — Ibis pond, step 1 of 6 (master)

Edit of `camp/papyrus`.

Attach: `art/masters/camp/ref-ibisPond.webp`, `art/masters/camp/papyrus.webp`

> [edit] Remove this, and only this: the clump of tall papyrus at the side of the pond. Where it stood, show the
> #ff00ff background or whatever was behind it.

#### 65. `camp/oasis` — Oasis pool, fixed from the start

The plain pool the camp is pitched beside; the ibis pond's steps adorn it. Edit of `camp/edgeStones`.

Attach: `art/masters/camp/ref-ibisPond.webp`, `art/masters/camp/edgeStones.webp`

> [edit] Remove the flat sandstone slabs from the pond's rim; leave a natural sandy edge with two or three
> small rough stones. The water stays exactly as it is. Where the slabs lay, show the pond's edge or the #ff00ff
> background.

### Lookout tower (`lookout`)

#### 65. `camp/signalFire` — Lookout tower, step 6 of 6 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-lookout.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the lookout tower, complete: a wooden lookout tower: four tall posts braced with crossbeams, a plank platform with a low railing on top, a wooden ladder leaning up to it, a thatched straw roof on four short poles over the platform, a small pale-blue pennant at its corner and an iron brazier with a burning signal fire on the platform. Use the colours of the matching objects in the reference image.

#### 66. `camp/roof` — Lookout tower, step 5 of 6 (wizard)

Edit of `camp/signalFire`.

Attach: `art/masters/camp/ref-lookout.webp`, `art/masters/camp/signalFire.webp`

> [edit] Remove this, and only this: an iron brazier with a burning signal fire on the platform. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 67. `camp/flag` — Lookout tower, step 4 of 6 (master)

Edit of `camp/roof`.

Attach: `art/masters/camp/ref-lookout.webp`, `art/masters/camp/roof.webp`

> [edit] Remove this, and only this: a thatched straw roof over the platform on four short poles. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 68. `camp/ladder` — Lookout tower, step 3 of 6 (master)

Edit of `camp/flag`.

Attach: `art/masters/camp/ref-lookout.webp`, `art/masters/camp/flag.webp`

> [edit] Remove this, and only this: a small pale-blue pennant flag on a pole at the platform's corner. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 69. `camp/platform` — Lookout tower, step 2 of 6 (master)

Edit of `camp/ladder`.

Attach: `art/masters/camp/ref-lookout.webp`, `art/masters/camp/ladder.webp`

> [edit] Remove this, and only this: a wooden ladder leaning against the tower up to the platform. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 70. `camp/post` — Lookout tower, step 1 of 6 (master)

Edit of `camp/platform`.

Attach: `art/masters/camp/ref-lookout.webp`, `art/masters/camp/platform.webp`

> [edit] Remove this, and only this: a plank platform on top of the posts with a low railing. Where it stood, show the #ff00ff background or
> whatever was behind it.

### God statues (`godStatues`)

#### 71. `camp/ra` — God statues, step 4 of 4 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-godStatues.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the god statues, complete: a low stone bench with four statues in a row: Thoth ibis-headed in blue and gold, Bastet a seated black cat with gold jewellery, Anubis black jackal-headed in blue and gold, and Ra falcon-headed with a red sun disc. Use the colours of the matching objects in the reference image.

#### 72. `camp/anubis` — God statues, step 3 of 4 (wizard)

Edit of `camp/ra`.

Attach: `art/masters/camp/ref-godStatues.webp`, `art/masters/camp/ra.webp`

> [edit] Remove this, and only this: a fourth statue on the right end: Ra, falcon-headed with a red sun disc. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 73. `camp/bastet` — God statues, step 2 of 4 (wizard)

Edit of `camp/anubis`.

Attach: `art/masters/camp/ref-godStatues.webp`, `art/masters/camp/anubis.webp`

> [edit] Remove this, and only this: a third statue: Anubis, black jackal-headed, in blue and gold. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 74. `camp/thoth` — God statues, step 1 of 4 (wizard)

Edit of `camp/bastet`.

Attach: `art/masters/camp/ref-godStatues.webp`, `art/masters/camp/bastet.webp`

> [edit] Remove this, and only this: a second statue next to Thoth: Bastet, a seated black cat with gold jewellery. Where it stood, show the #ff00ff background or
> whatever was behind it.

### Star canopy (`starCanopy`)

#### 75. `camp/planets` — Star canopy, step 4 of 4 (wizard)

The final state; paint this one first for the spot.

Attach: `art/masters/camp/ref-starCanopy.webp`, `art/masters/camp/chest.webp`

> [preamble] The first attached image is the reference: paint exactly this camp spot, with its objects, shapes, proportions, arrangement and angle. The second attached image is a finished prop in the target painting style: match its brushwork, matte finish and lighting. Paint one camp spot, the star canopy, complete: four tall slim wooden poles with a deep-blue cloth canopy stretched between them, embroidered with small gold stars, a crescent moon and a few round planets, one of them ringed. Use the colours of the matching objects in the reference image.

#### 76. `camp/stars` — Star canopy, step 3 of 4 (wizard)

Edit of `camp/planets`.

Attach: `art/masters/camp/ref-starCanopy.webp`, `art/masters/camp/planets.webp`

> [edit] Remove this, and only this: a few round planets, one ringed, embroidered among the stars. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 77. `camp/cloth` — Star canopy, step 2 of 4 (wizard)

Edit of `camp/stars`.

Attach: `art/masters/camp/ref-starCanopy.webp`, `art/masters/camp/stars.webp`

> [edit] Remove this, and only this: small gold stars and a crescent moon embroidered on the canopy. Where it stood, show the #ff00ff background or
> whatever was behind it.

#### 78. `camp/poles` — Star canopy, step 1 of 4 (wizard)

Edit of `camp/cloth`.

Attach: `art/masters/camp/ref-starCanopy.webp`, `art/masters/camp/cloth.webp`

> [edit] Remove this, and only this: a deep-blue cloth canopy stretched between the poles. Where it stood, show the #ff00ff background or
> whatever was behind it.

## Layer sources

Finds show in any order (`docs/superpowers/specs/2026-10-23-camp-loot-design.md`): a spot is drawn as its base
plus one layer per object, and an object's layer is the pixels where its step differs from the step
without it. Where one object sits on another (the compass on the star cloth), the lower one was never
painted under the upper one, and its layer would have a hole. A layer source fills that: an extra edit,
never shown as a step, only cut from.

### `camp/bed` — the bare palm garden bed

The palm garden's base: its finds (palm seed, second palm, fig tree, lotus planter) arrive in any order, so
none of them can be the base. Edit of `camp/sprout`.

Attach: `art/masters/camp/sprout.webp`

> [edit] Remove this, and only this: the small palm sprout. Where it grew, show the same dark soil and a few
> blades of grass as around it. The bed, its stones and the leafy plant stay exactly as they are.

### `camp/starMap-cloth` — the star cloth without the compass

Edit of `camp/starMap`.

Attach: `art/masters/camp/starMap.webp`

> [edit] Remove this, and only this: the round brass compass on the right end of the table. The dark-blue
> cloth under it stays and continues where the compass stood, with its gold border.

## 3. Surroundings

Not cut-outs: these fill the scene behind the camp.

### 79. `camp/sand` — Sand ground

A seamless tile. If the generator cannot tile, make it with Midjourney `--tile`
(`docs/game-design/art-pipeline.md` §0). Import with `--key=none`.

Attach: `art/masters/camp/impression-wizard.webp`

> Seamless tileable square texture of fine desert sand seen from about 35 degrees above, soft wind
> ripples, painterly style like the attached reference, warm natural colour in neutral light. No objects, no
> footprints, no light pool, no vignette. The left edge continues into the right edge and the top into
> the bottom.

### 80. `camp/dunes` — Far dunes

Import with `--size=2048`.

Attach: `art/masters/camp/impression-wizard.webp`

> A wide horizontal strip of distant desert dunes in neutral light, 4:1 landscape canvas, painted and matte, warm sand
> colour. The dunes fill the lower half; above the dune line everything is
> flat solid #ff00ff magenta. The left edge continues seamlessly into the right edge. No pyramids, no
> objects.

### 81. `camp/pyramid` — Pyramid on the horizon

Attach: `art/masters/camp/impression-wizard.webp`

> [preamble] Paint one distant stone pyramid, sandstone blocks, lit by neutral light from the upper
> left, its right face in shadow, warm sandstone colour. Nothing else.

### 82. `camp/pyramidGold` — Pyramid with golden capstone

Edit of `camp/pyramid`.

Attach: `art/masters/camp/impression-wizard.webp`, `art/masters/camp/pyramid.webp`

> [edit] Add a shining gold capstone to the very top of the pyramid.
