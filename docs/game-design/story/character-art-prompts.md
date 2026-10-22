# Character art — generation prompts

For the explorer's conversation portraits and the five tomb ghosts. Written for an image model that
accepts a reference image, and **the reference is the whole trick**: hand it `src/assets/fez-250.png` and
the large explorer artwork, every time, or the set drifts.

Same loop as [starter-art-prompts.md](../starter-art-prompts.md): one file at a time, both of us look, the
accepted file becomes the reference for the next.

**`yarn repaint`** lists what is still owed here, tiles included, and **`yarn repaint <key>`** — `ipi`,
`point-explorer` — puts that entry's prompt on the clipboard with §0 already folded into it and reveals its
references in the Finder. An entry whose file exists is not owed and drops off the list. The paste is yours;
everything before it is prepared.

## 0. The house style, stated once

Every prompt below assumes this preamble. Paste it in front of each one.

> Flat cartoon vector illustration. Thick, even charcoal-black outlines on every shape, including interior
> detail. Flat colour fills with exactly one darker shade per colour for form — no gradients, no
> airbrushing, no texture. Simple rounded shapes, friendly proportions, slightly oversized head. Full
> figure, standing, facing the viewer, weight on one leg. Plain white background, no shadow on the ground,
> no frame, no text. Upright 2:3 portrait canvas, the figure filling its height — head near the top edge,
> feet on the bottom edge.

The two characters already share a **red neckerchief**, which is the strongest link between them — keep it
in both, exactly the same red.

**The canvas is 250×375, and it is not negotiable.** Every companion sprite is that size — `fez-250.png`
and its three poses — and `Fez.tsx` draws them 200px wide with the bottom 60px past the screen edge, so a
figure that does not stand on the bottom of its own canvas floats. Aspect is the one thing that cannot be
fixed after generation. Match `fez-250.png`'s head height too: same head, same scale, same two people.

**Generate on white.** The sprites are RGBA with real transparency, and white is only what an image model
can give you — §3 cuts it out on the way in.

## 1. The explorer — conversation portraits

The neutral pose IS the original character artwork, imported — `art/masters/characters/explorer.jpeg` is
his master, and every other pose and face of his is an edit of it (§5). The grin and the point below are
separate paintings the game draws only until §5's `explorer-face-cool` and `explorer-pose-point` replace
them; then their entries go.

**Match the existing explorer exactly**: olive-green utility vest with
four flap pockets, cream rolled-sleeve shirt, red neckerchief, wide brown felt bush hat, cream cargo
trousers, laced tan boots, coiled rope and small brown satchel on a shoulder strap, brass compass.

**No gendered read.** Keep the face young and neutral, hair short and mid-brown under the hat, and do not
add stubble, eyelashes, jewellery, makeup or a waist. A player of any description should be able to see
themselves standing next to this person — the explorer is a character anybody is glad to be beside, not a
portrait of one kind of person.

**The palette is named, not described.** Measured off the original artwork, which is also what the walking
sprites on the site map were drawn from — so these are the values already in the game, and a portrait that
misses them is a second explorer. Three rolls attached that artwork as a reference and repainted the fills
anyway: skin came back \`#f0b890\` against its \`#d89060\`, a fifth brighter and a third less saturated, and
the cream trousers came back tan. A generator copies a number and interprets a word. \`[palette]\` in the
prompts below is substituted with this:

> Use these exact flat colours: skin #d89060, shaded skin #c07850. Shirt and cargo trousers both cream
> #f0e0b8. Utility vest olive #807850. Bush hat brown #685038. Neckerchief red #c83818, its shadow #a82020.
> Boots khaki #988868. Satchel and belt leather #a88058. Hair dark brown #503028. Do not lighten,
> desaturate or reinterpret any of these — they are the colours of the character as he already appears
> elsewhere in the game.

### `explorer-250.png` — neutral, talking

> [preamble] [palette] A young explorer in a wide brown bush hat and olive utility vest, standing relaxed and facing
> the viewer, one hand resting at their side and the other holding a folded map. Calm, dry, pleasant
> expression — mouth closed or barely smiling, eyebrows level. Not grinning. Reference the supplied
> explorer artwork for every item of clothing and equipment.

### `grin-explorer-250.png` — the solve

> [preamble] [palette] The same explorer, same clothing and equipment, now wearing dark sunglasses and grinning
> broadly, head tilted very slightly. One thumb hooked in a vest pocket. Pleased rather than smug.
> Reference the supplied explorer artwork.

### `point-explorer-250.png` — drawing attention

> [preamble] [palette] The same explorer, same clothing and equipment, pointing upward and slightly off-camera with
> one index finger, looking where they point. Mouth open as if mid-sentence. Reference the supplied
> explorer artwork.

## 2. The five tomb ghosts

One per tier, and the register is set in [cast.md](cast.md): **not scary**. They are inconvenienced rather
than vengeful, lit rather than shadowed, and already present rather than appearing. That is a drawing brief
as much as a writing one.

> **Ghost preamble**, in addition to §0: Translucent pale-blue-green tint over the whole figure, outlines
> the same charcoal as everything else, and **lit from the front like every other character** — no glow
> from below, no light source in the figure, no smoke, no tattered edges, no chains, no empty eye sockets.
> Feet visible and on the ground. Eyes ordinary and open. The figure should read as a person who happens to
> be a colour, not as an apparition.

### `ghost-ipi-250.png` — starter, the merchant's bookkeeper

> [preamble + ghost preamble] An elderly ancient Egyptian bookkeeper, translucent pale blue-green, in a
> plain white linen kilt and a simple shoulder sash, holding a reed pen and a small clay tablet against his
> chest. Bald, slight, spectacles-free, faintly exasperated — eyebrows raised, mouth in a flat line, as
> though he has been waiting for you to arrive and is about to mention it. Entirely unthreatening.

### `ghost-henut-250.png` — junior, the noblewoman

> [preamble + ghost preamble] An ancient Egyptian noblewoman, translucent pale blue-green, in a long
> pleated linen dress, an elaborate braided wig, a broad beaded collar and heavy bracelets. Chin slightly
> lifted, pleased with herself, one hand displaying the other's rings. Vain and warm rather than cold.

### `ghost-priest-250.png` — expert, the high priest

> [preamble + ghost preamble] An ancient Egyptian high priest, translucent pale blue-green, head shaved, in
> a white linen robe with a leopard-skin sash over one shoulder. Hands clasped in front. Precise, patient,
> faintly disapproving — the expression of a man who has been waiting a very long time for somebody to do
> something properly.

### `ghost-pharaoh-250.png` — master, the king

> [preamble + ghost preamble] An ancient Egyptian pharaoh, translucent pale blue-green, in a nemes
> headcloth with a uraeus, a pleated kilt and a broad gold collar, arms folded. Delighted and imperious at
> once — the faint smile of somebody enjoying himself enormously at someone else's expense.

### `ghost-other-250.png` — wizard, the one who came before

**References:** `src/assets/fez-250.png` for the drawing style, and `art/masters/characters/explorer.jpeg`
for the hat — the anchor alone gave a generator a lizard in a fez and it drew the fez.

**What this picture has to say**, because every line of the prompt below is one of these and nothing else:

1. **Somebody like you was here.** It is the only beat in the game carried by a picture instead of a line,
   and it lands or fails on one object: a hat the player has been looking at all game, lying on the ground.
   A fez there says something else entirely — see the note under the prompt.
2. **He meant to come straight back.** A notebook laid face down keeps your place. That single gesture is
   the difference between a camp that was abandoned and a camp that was left, and the second is the sad one.
3. **And nobody has touched it since.** Undisturbed dust over everything, nothing scattered, nothing broken.
   The two readings have to sit on top of each other: stepped away a minute ago, and a very long time ago.
4. **It stands where a person stands.** This takes a character's place in a conversation, beside Fez. A
   pile on the ground is wider than a person, so `import-portrait` seats a wide subject by its width and
   leaves the air above it, where the speech bubble goes. Compose it as one group with everything touching
   or overlapping; a scene spread across the frame comes back small.

> [preamble] **There is no figure in this picture** — ignore every instruction above about a standing figure
> and its pose. **Nothing here is translucent or blue-green.** This is not a ghost; it is a place.
>
> A small camp that somebody walked away from, arranged as one compact group with the objects touching or
> overlapping, resting on bare ground. Fill the frame with it; leave no object stranded on its own.
>
> In it: a canvas bedroll unrolled and laid flat, a battered tin kettle set on three stones, a coil of rope,
> and a notebook lying FACE DOWN and open — spine upward, pages against the ground, the way somebody holds
> their place when they mean to come straight back.
>
> Resting on top of the bedroll, and the most visible object in the picture, one wide-brimmed brown felt
> bush hat. It is the explorer's own, from the second reference image: soft felt, broad flat brim, a band
> around the crown, brown #685038. **It is not a fez** — no red, no cylindrical cap, no tassel. That hat
> belongs to a different character and must not appear anywhere in this picture.
>
> Everything lies under a fine even layer of pale dust, undisturbed. Nothing is broken, torn or scattered.
> It should read at once as though the owner stepped away a minute ago and as though nobody has touched any
> of it in a very long time.
>
> No tent, no campfire, no flame, no smoke, no figure, no bones, no blood. Every object whole and inside the
> frame with air around it, nothing cropped by an edge.

**If the fez ever belongs here, it is a decision and not a return.** The first roll drew one, and it would
be the loudest tell in the game — the ending is Fez's own name, and his hat in the predecessor's camp says
it four tiers early, in a picture, where `cast.md` budgets one tell an act and asks each to read as a joke
the first time. Putting it back means writing it into `cast.md` and the Act V script first.

## 3. Cutting a generated file down to a sprite

```
yarn import-portrait ~/Downloads/whatever-it-saved-as.jpeg --name=explorer
```

Keys the white out from the edges inward, trims to the figure, pads back to 2:3 with the feet on the bottom
edge, resizes to 250×375, and writes `src/assets/<name>-250.png`. Flags: `--key=#ffffff`, `--tolerance=20`.

Edges-inward is the part that matters and the reason this is not `import-tile`: a prop on magenta has no
magenta of its own, but a person on white has white in their eyes, and keying by colour alone punches them
out. Generate on white and let the script do the rest — it prints how much of its canvas the figure ended
up filling, which is the number to compare against the last one in the set.

### The holes the flood cannot reach

Background enclosed BY the figure is never reached from an edge, so it ships opaque: the gap inside a bent
elbow, the wedge between a held map and the hand, the slot behind a neck. **No rule tells those from an
eye.** Measured on `explorer.jpeg`, the map gap is 1232 pixels and the near eye is 1072; their mean
colours are (252.8, 253.0, 253.2) and (252.1, 251.4, 250.1). Neither size nor colour separates them, and
the far eye at 501 pixels is smaller than a gap in the rope coil at 441.

So they are named, and the script prints every patch it left opaque after each run — the list is the prompt
to look. Pass the ones that are not eyes:

```
yarn import-portrait art/masters/characters/explorer.jpeg --name=explorer --bust=0.55 --centre=1160 --behind=0.4 \
  --holes="574,1299;631,1503;1242,1025;646,1062;748,642"
yarn import-portrait art/masters/characters/grin-explorer.jpeg --name=grin-explorer --bust=0.55 --centre=1160 --behind=0.4 \
  --holes="582,1329;1243,1026;646,1061;929,599;749,642"
yarn import-portrait art/masters/characters/point-explorer.jpeg --name=point-explorer --bust=0.55 --centre=1085 --behind=0.4 \
  --holes="586,1330;649,1059;753,638"
yarn import-portrait art/masters/characters/ghost-ipi.jpeg     --name=ghost-ipi     --bust=0.55 --behind=0.4
yarn import-portrait art/masters/characters/ghost-henut.jpeg   --name=ghost-henut   --bust=0.55 --behind=0.4
yarn import-portrait art/masters/characters/ghost-priest.jpeg  --name=ghost-priest  --bust=0.55 --behind=0.4
yarn import-portrait art/masters/characters/ghost-pharaoh.jpeg --name=ghost-pharaoh --bust=0.55 --behind=0.4
```

Coordinates are in the MASTER image, so they survive as long as the master does; a redrawn master needs new
ones off its own report. **The four ghosts need none** — their robes are near-white and enclosed, and the
flood is right to leave them alone, which is the case that makes the conservative default worth keeping.

Check the result over a dark ground rather than in a file browser: white on white is invisible until the
sprite is drawn over a lit tomb, which is where these are actually seen.

### Why every human is cut waist-up

Fez is a cartoon lizard whose head is most of him. A human drawn full-length in the same 250×375 frame has
a head a third the size, and the two of them talking read as two scales rather than as two characters —
which is the thing a player notices first. `--bust=0.55` keeps the top 55% of the figure and brings the
faces level. Every ghost wants it too: they are all humans, and they were all small beside him.

**Waist-up rather than head-and-shoulders, because the props do the characterising.** Ipi is the bookkeeper
by way of the reed pen and tablet, Henut is mid-gesture, and the pointing pose exists for a raised finger.
0.55 keeps all of it; 0.38 overshoots Fez's head and throws the hands away.

**A bust is framed on the head and sized by its height**, which is the opposite of what a full figure gets.
Fit a band by its width and the scale depends on how far the arms happen to reach — the explorer holds a
map out at arm's length, so fitted that way he came out smaller than every ghost. Framed on the head they
all match.

`--centre` moves the window off the face where a drawing needs it, and only the explorer needs it. He is
drawn mirrored on the right of a conversation, so his far side faces the middle of the screen: a map or a
finger clipped there shows the cut mid-screen. His window is pushed towards the map and the raised finger,
and the clip falls on the rope side, which ends at the screen edge. Named per drawing, the way the holes are.

`--behind=0.4` puts that rope side back: it widens the window by 40% on the side behind the figure, so every
human sprite is 350x375 with the 250 wide face frame on its right. On a phone `Fez.tsx` hangs the extra
past the screen edge, so he looks as the face frame alone did; in the centred column of a wider screen he
stands whole. The ghosts get it too, for Henut's raised hand, so every human sprite has the same width.

**The full-length versions are still what the journey card and the title want.** Same command without
`--bust`.

## 4. What is not here

**The Sphinx inscription, the seals and the props.** Those are objects rather than characters, they need
their own reference set, and the inscription is the ending — it wants its own pass with the writing legible
enough to read at phone width.

**The ghosts' map figures.** A ghost stands in the room they talk in, drawn the way the explorer is on the
map — a small pixel figure on magenta, imported with `import-tile` rather than `import-portrait`. So their
entries live in the tile queue, [repaint-queue.md](../../instructions/repaint-queue.md) § Ghosts on the map
(`yarn repaint ghost-ipi`, `ghost-henut`, `ghost-priest`, `ghost-pharaoh`), each one attaching the
explorer's front frame for style and scale and the portrait master above for who it is. Until one lands the
map stands the portrait's face frame in for it.

## 5. Pose and face: how every portrait is made

**Every portrait the game draws is a pose base and a face.** A pose base is the figure — body, hands,
props — wearing its own neutral face; a face is a layer laid over the head of any of that character's
bases. Both are EDITS of the character's one master (`fez.jpeg`, `explorer.jpeg`, a ghost's portrait),
never paintings of their own: rolled fresh, each picture is a slightly different Fez — the hat moves, the
scarf changes, the tail grows a curl — and a conversation that cuts between them reads as two lizards.

**There are two kinds of edit, and each changes one thing.**

- **A pose edit** changes the body and keeps the head pixel for pixel: same outline, same eyes, same face,
  same hat, in the same place on the canvas. It is imported whole and becomes a base.
- **A face edit** changes the face and nothing else. Diffed against the master, what moved is the face;
  `yarn import-portrait --face-of` cuts it out as a layer, and the game stacks it on whichever base the
  line asks for. Whatever the face wears goes in the layer with it — sunglasses included, since the diff
  takes them in.

**The names say which.** Master, sprite and `yarn repaint` key are one name:

| File                      | What it is                                       | Sprite                       |
| ------------------------- | ------------------------------------------------ | ---------------------------- |
| `<char>.jpeg`             | the master, and the `default` base with its face | `<char>-250.png`             |
| `<char>-pose-<name>.jpeg` | a pose edit of the master: a base                | `<char>-pose-<name>-250.png` |
| `<char>-face-<name>.jpeg` | a face edit of the master: a layer               | `<char>-face-<name>-250.png` |

`<name>` is the base or face it is registered as in `src/app/fez/portraits.ts` (`BASES`, `FACES`).

**Landing one**, in order:

1. `yarn repaint <key>`, generate, then `yarn repaint <key> --land` saves the download at the entry's
   `**Master:**` path.
2. Look at it against the pass criterion below. A pose edit that moved the head, or a face edit that moved
   anything outside the face, is re-rolled — never masked around, never accepted.
3. Run the entry's **Then:** line and add it to `art/rebuild.sh` with the character's others.
4. Register it in `portraits.ts`: a base under the speaker's `bases`, a face under `faces`. The game
   composes a base and a face as soon as both exist, ahead of any painting registered for that pair, so the
   painting it retires (its entry says which) is then deleted — from `paintings`, from `src/assets`, from
   `art/` and `rebuild.sh`, and its §1 entry if it has one.
5. Tag lines only for a new look: `> **Fez (pointUp, wistful):**` in the script and its key in
   `storyPoses.ts` (FORMAT.md). A face that replaces a painting retags nothing — the pose name already
   asks for it.

**What is never done.** No standalone portrait is painted any more: a new look is a face edit, a new
gesture a pose edit, both of the master. The paintings still in the game — `point-fez`,
`glasses-point-fez`, `cocktail-fez`, `point-explorer`, `grin-explorer` — are registered in `portraits.ts`
as `paintings` for their pose and face only until the edits below replace them.

**The ghosts stay one portrait each** — their master is their `default` base — until a scene needs a
second expression of one. The priest's peaceful face in Act V is the first; it is then a face edit of
`ghost-priest.jpeg`, cut with that ghost's import flags plus `--face-of`, exactly like the others.

### What the game draws

Lines name a pose (`Pose` in `portraits.ts`), and each pose name is a base and a face; a face named on
the line (`Fez (pointUp, worried)`) takes the place of the pose's own. What cannot be drawn gives way
face first, then base — `portraitFor`, held by `portraitsInUse.spec.ts` to every line in `storyPoses.ts`
and the tutorial table (`tutorialLines.ts`).

| Speaker  | Pose name      | Base            | Face    | Drawn today                                                                 | Used by                                 |
| -------- | -------------- | --------------- | ------- | --------------------------------------------------------------------------- | --------------------------------------- |
| Fez      | `default`      | default         | default | `fez` (master)                                                              | most lines                              |
| Fez      | any + worried  | default / point | worried | `fez` / `fez-pose-point` + `fez-face-worried`                               | 13 story lines                          |
| Fez      | `pointUp`      | point           | excited | painting `point-fez`                                                        | 24 story lines, 13 tutorial lines       |
| Fez      | `glassesPoint` | point           | cool    | painting `glasses-point-fez`                                                | 8 tutorial lines                        |
| Fez      | `cocktail`     | cocktail        | default | painting `cocktail-fez`                                                     | 5 shop lines, the shop screen           |
| Explorer | `default`      | default         | default | `explorer` (master)                                                         | his lines, the welcome tutorials        |
| Explorer | `pointUp`      | point           | default | painting `point-explorer`                                                   | 3 story lines                           |
| Explorer | `glassesPoint` | point           | cool    | painting `point-explorer` (`grin-explorer` is registered as default + cool) | none                                    |
| Ghosts   | `default`      | default         | default | their master                                                                | their scenes, the log, the map stand-in |

The explorer's `pointUp` is his point base with its own face: he has no excited face, and a face a speaker
has no art for gives way to the base's own.

### The pass criterion

For every pose and face edit: at 100% there is no visible seam anywhere around the face, and outside the
head the composed picture is the base to within compression noise. An edit that moved the hat, the scarf
or the outline of the head fails, and is re-rolled.

**The face layer is the whole face region, cut with a feathered mask.** The mask is an ellipse around what
moved — head included, brows to chin — with a soft edge tens of pixels wide, so the join fades over a band
rather than sitting on a line. Not separate eyes and mouth: an expression moves the brows, the cheeks, the
shape of the eye whites and the shading around all of them together, and the outlines run continuously
between them, so a cut at the eye and the mouth leaves part of the change behind and lands every edge on
an outline. The proof is Fez: `fez-face-worried`, laid over both `fez` and `fez-pose-point`, shows no seam.
It holds only for a true edit of the master — the explorer's grin is a separate painting whose head sits
slightly off his neutral one, and laid over it the mouth doubles.

**Every base and face of a character is cut through one frame**, so any face lands on any base pixel for
pixel. Fez's masters are painted in his sprite's frame, so each is imported `--whole`. The explorer's are
cut through his bust window: his flags (`--bust=0.55 --centre=1160 --behind=0.4`) on every one, the face
edits' `--face-of` framing them through `explorer.jpeg`, and his pose edits `--crop-from=` the master so
they share its band. His `--holes` are his master's for a face edit (the body did not move) and whatever
the import reports for a pose edit.

### Fez's colours

Measured off `fez-250.png`, and substituted for `[fez palette]`:

> Keep Fez's exact flat colours: scales teal #42a892, shaded teal #118883, belly pale green #bcd8aa, eye
> whites cream #f2e6bf, fez dark red #a64b34, neckerchief red #d54f3b with its shadow #ba4637, outlines
> charcoal #1c2729. Do not lighten, desaturate or reinterpret any of these.

### The paint list, in order

Master only: each lands at its `**Master:**` path, and its **Then:** line writes the sprite. Ordered by
what the game uses — Fez's paintings retired first, then the five faces in the order they were approved,
then the explorer's pose and the last painting. Fez's faces stack on every base of his; the explorer's on
his.

### `fez-face-excited` — Fez, excited

**Master:** `art/masters/characters/fez-face-excited.jpeg`

Lines it serves: every `pointUp` of his — 24 story lines and 13 tutorial lines. Retired the `point-fez`
painting. Attached the landed master, `art/masters/characters/fez.jpeg`, and that painting for the expression
only. Landed.

> [preamble] [fez palette] Edit the first attached picture of Fez. Change ONLY his face, to the excited,
> delighted look of the second attached picture: eyes wide and bright, a big open smile with the tongue
> showing. Use the second picture for the expression only — draw it in the first picture's size and
> detail. Keep the outline of his head, the position of his eyes, the fez, the neckerchief, his body, his
> tail and the white background exactly as they are — pixel for pixel. Same canvas, same size, same
> framing. Nothing outside his face moves.

**Then:** `yarn import-portrait art/masters/characters/fez-face-excited.jpeg --name=fez-face-excited --whole --face-of=art/masters/characters/fez.jpeg`

### `fez-face-cool` — Fez, cool

**Master:** `art/masters/characters/fez-face-cool.jpeg`

Lines it serves: every `glassesPoint` — 8 tutorial lines. Laid on `fez-pose-point`, it retires the
`glasses-point-fez` painting. Attach the landed master, `art/masters/characters/fez.jpeg`, and
`src/assets/glasses-point-fez-250.png` for the expression only.

> [preamble] [fez palette] Edit the first attached picture of Fez. Change ONLY his face: he now wears
> black sunglasses over his eyes and grins broadly with his mouth open, as in the second attached picture.
> Use the second picture for the sunglasses and the grin only — draw them in the first picture's size and
> detail. Keep the outline of his head, the fez, the neckerchief, his body, his tail and the white
> background exactly as they are — pixel for pixel. Same canvas, same size, same framing. Nothing outside
> his face moves.

**Then:** `yarn import-portrait art/masters/characters/fez-face-cool.jpeg --name=fez-face-cool --whole --face-of=art/masters/characters/fez.jpeg`

### `fez-pose-cocktail` — Fez, holding a cocktail

**Master:** `art/masters/characters/fez-pose-cocktail.jpeg`

Lines it serves: every `cocktail` — 5 shop lines, and the shop screen's picture of him. Retires the
`cocktail-fez` painting; he wears his own face over the glass. Attach the landed master,
`art/masters/characters/fez.jpeg`, and `src/assets/cocktail-fez-250.png` as the pose reference.

> [preamble] [fez palette] Edit the first attached picture of Fez so that he holds a tall orange cocktail
> with a straw, an orange slice and a small paper umbrella, the way he does in the second attached
> picture — but held at chest height, the straw well clear of his mouth. Use the second picture for the
> glass and the hand only — draw them in the first picture's size and detail. Keep his head exactly as it
> is: same outline, same eyes, same face, same fez, in the same place on the canvas. Same canvas, same
> framing, white background.

**Then:** `yarn import-portrait art/masters/characters/fez-pose-cocktail.jpeg --name=fez-pose-cocktail --whole`

### `fez-face-wistful` — Fez, wistful

**Master:** `art/masters/characters/fez-face-wistful.jpeg`

Lines it serves: ≈17, the moved ones — the ending, the Sphinx reveal, the mural. Attach the landed master,
`art/masters/characters/fez.jpeg`.

> [preamble] [fez palette] Edit the attached picture of Fez. Change ONLY his face, to wistful and moved:
> eyes lowered and soft, the lids a little heavy, a small gentle smile or none. Keep the outline of his
> head, the position of his eyes, the fez, the neckerchief, his body, his tail and the white background
> exactly as they are — pixel for pixel. Same canvas, same size, same framing. Nothing outside his face
> moves.

**Then:** `yarn import-portrait art/masters/characters/fez-face-wistful.jpeg --name=fez-face-wistful --whole --face-of=art/masters/characters/fez.jpeg`

### `fez-face-surprised` — Fez, stunned

**Master:** `art/masters/characters/fez-face-surprised.jpeg`

Lines it serves: ≈12 — the first ghost, wizard_3's turn. Attach the landed master,
`art/masters/characters/fez.jpeg`.

> [preamble] [fez palette] Edit the attached picture of Fez. Change ONLY his face, to stunned: eyes wide
> open, brows raised high, a small round open mouth. Keep the outline of his head, the position of his
> eyes, the fez, the neckerchief, his body, his tail and the white background exactly as they are — pixel
> for pixel. Same canvas, same size, same framing. Nothing outside his face moves.

**Then:** `yarn import-portrait art/masters/characters/fez-face-surprised.jpeg --name=fez-face-surprised --whole --face-of=art/masters/characters/fez.jpeg`

### `fez-face-sheepish` — Fez, corrected

**Master:** `art/masters/characters/fez-face-sheepish.jpeg`

Lines it serves: ≈9, the ones where he is put right — "…O. Juist." Attach the landed master,
`art/masters/characters/fez.jpeg`.

> [preamble] [fez palette] Edit the attached picture of Fez. Change ONLY his face, to sheepish, caught out
> being wrong: an awkward lopsided half-smile, eyes glancing to one side; a faint blush on the cheek or a
> single small sweat drop beside the head is allowed. Keep the outline of his head, the position of his
> eyes, the fez, the neckerchief, his body, his tail and the white background exactly as they are — pixel
> for pixel. Same canvas, same size, same framing. Nothing outside his face moves.

**Then:** `yarn import-portrait art/masters/characters/fez-face-sheepish.jpeg --name=fez-face-sheepish --whole --face-of=art/masters/characters/fez.jpeg`

### `explorer-face-surprised` — the explorer, surprised

**Master:** `art/masters/characters/explorer-face-surprised.jpeg`

Lines it serves: ≈9 — the meeting with Fez. Attach the explorer's master,
`art/masters/characters/explorer.jpeg`.

> [preamble] [palette] Edit the attached picture of the explorer. Change ONLY the face, to surprised: brows
> raised, eyes a little wider, mouth open. Keep the outline of the head and hair, the position of the eyes,
> the hat, the neckerchief, the vest, the rope, the map, the hands and the white background exactly as they
> are — pixel for pixel. Same canvas, same size, same framing. Nothing outside the face moves.

**Then:** `yarn import-portrait art/masters/characters/explorer-face-surprised.jpeg --name=explorer-face-surprised --bust=0.55 --centre=1160 --behind=0.4 --holes="574,1299;631,1503;1242,1025;646,1062;748,642" --face-of=art/masters/characters/explorer.jpeg`

### `explorer-face-deadpan` — the explorer, deadpan

**Master:** `art/masters/characters/explorer-face-deadpan.jpeg`

Lines it serves: ≈18, the dry register. Attach the explorer's master, `art/masters/characters/explorer.jpeg`.

> [preamble] [palette] Edit the attached picture of the explorer. Change ONLY the face, to deadpan: one
> eyebrow raised, the other level, a flat closed half-smile. Keep the outline of the head and hair, the
> position of the eyes, the hat, the neckerchief, the vest, the rope, the map, the hands and the white
> background exactly as they are — pixel for pixel. Same canvas, same size, same framing. Nothing outside
> the face moves.

**Then:** `yarn import-portrait art/masters/characters/explorer-face-deadpan.jpeg --name=explorer-face-deadpan --bust=0.55 --centre=1160 --behind=0.4 --holes="574,1299;631,1503;1242,1025;646,1062;748,642" --face-of=art/masters/characters/explorer.jpeg`

### `explorer-pose-point` — the explorer, pointing

**Master:** `art/masters/characters/explorer-pose-point.jpeg`

Lines it serves: his 3 `pointUp` story lines. Retires the `point-explorer` painting. Attach the
explorer's master, `art/masters/characters/explorer.jpeg`, and `art/masters/characters/point-explorer.jpeg`
as the pose reference.

> [preamble] [palette] Edit the first attached picture of the explorer so that the hand holding the map
> lowers it and the other hand comes up beside the shoulder, index finger raised and pointing upward, the
> way it does in the second attached picture. Keep the raised hand close in — no further from the body
> than the map is now. Use the second picture for the arm and hand only — draw them in the first
> picture's size and detail. Keep the head exactly as it is: same outline, same hair, same eyes, same
> face, same hat, in the same place on the canvas. Same canvas, same framing, white background.

**Then:** `yarn import-portrait art/masters/characters/explorer-pose-point.jpeg --name=explorer-pose-point --bust=0.55 --centre=1160 --behind=0.4 --crop-from=art/masters/characters/explorer.jpeg` — plus `--holes` for the gaps it reports.

### `explorer-face-cool` — the explorer, cool

**Master:** `art/masters/characters/explorer-face-cool.jpeg`

Lines it serves: none yet — his `glassesPoint`, which no line asks for. Retires the `grin-explorer`
painting, the last standalone one. Attach the explorer's master, `art/masters/characters/explorer.jpeg`,
and `art/masters/characters/grin-explorer.jpeg` for the expression only.

> [preamble] [palette] Edit the first attached picture of the explorer. Change ONLY the face: dark
> sunglasses over the eyes and a broad, pleased grin, as in the second attached picture. Use the second
> picture for the sunglasses and the grin only — draw them in the first picture's size and detail. Keep
> the outline of the head and hair, the hat, the neckerchief, the vest, the rope, the map, the hands and
> the white background exactly as they are — pixel for pixel. Same canvas, same size, same framing.
> Nothing outside the face moves.

**Then:** `yarn import-portrait art/masters/characters/explorer-face-cool.jpeg --name=explorer-face-cool --bust=0.55 --centre=1160 --behind=0.4 --holes="574,1299;631,1503;1242,1025;646,1062;748,642" --face-of=art/masters/characters/explorer.jpeg`

### The landed edits

`fez-master` is the base everything of his is an edit of: his sprite was 250px wide, too little for a
generator to edit faithfully, so it was asked for again at the master size the explorer's are.

### `fez-master` — Fez, the same picture at full size

**Master:** `art/masters/characters/fez.jpeg`

The base everything else is an edit of. The shipped sprite is 250px wide, which is too little detail for a
generator to edit faithfully, so this asks for the picture again at the master size the explorer's are
(1686x2528). Attach `src/assets/fez-250.png` alone — the picture being enlarged is the only reference.

> [preamble] [fez palette] Redraw the attached picture of Fez, the small teal lizard in a fez and a red
> neckerchief, at full size on an upright 2:3 portrait canvas, 1686x2528. The same picture, larger, nothing
> changed: same pose, same expression, same proportions, same outline weight relative to his size, the same
> position in the frame. Do not add detail, texture or shading that is not in the attached picture, and do
> not tidy or restyle anything. Plain white background.

**Then:** `yarn import-portrait art/masters/characters/fez.jpeg --name=fez --whole`

### `fez-pose-point` — Fez, pointing up

**Master:** `art/masters/characters/fez-pose-point.jpeg`

Attached the landed master, `art/masters/characters/fez.jpeg`, and the `point-fez` painting it replaces as
the pose reference. Landed.

> [preamble] [fez palette] Edit the first attached picture of Fez so that he raises one finger, pointing
> upward, the way he does in the second attached picture. Use the second picture for the pose only — draw it
> in the first picture's size and detail. Keep his head exactly as it is: same outline, same eyes, same
> face, same fez, in the same place on the canvas. Same canvas, same framing, white background.

**Then:** `yarn import-portrait art/masters/characters/fez-pose-point.jpeg --name=fez-pose-point --whole`

### `fez-face-worried` — Fez, worried

**Master:** `art/masters/characters/fez-face-worried.jpeg`

Attach the landed master, `art/masters/characters/fez.jpeg`. Landed.

> [preamble] [fez palette] Edit the attached picture of Fez. Change ONLY his face, to worried and uneasy:
> brows raised and drawn together, a small open mouth. Keep the outline of his head, the position of his
> eyes, the fez, the neckerchief, his body, his tail and the white background exactly as they are — pixel
> for pixel. Same canvas, same size, same framing. Nothing outside his face moves.

**Then:** `yarn import-portrait art/masters/characters/fez-face-worried.jpeg --name=fez-face-worried --whole --face-of=art/masters/characters/fez.jpeg`
