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

The neutral and grinning poses ARE the original character artwork, imported — `art/masters/characters/`
holds both, and `yarn import-portrait` is the whole of the work. Only what the original does not have needs
drawing, which today is the pointing pose and any later one.

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

## 5. Composed expressions

An expression is a face, not a picture. Rolling a whole new portrait for every mood gives a slightly
different Fez each time — the hat moves, the scarf changes, the tail grows a curl — and a conversation that
cuts between them reads as two lizards. So an expression is painted as an EDIT of one base picture, and only
its face is kept: laid over the base, it is the same Fez with a different look on him.

**The face layer is the whole face region, cut with a feathered mask.** Diff the expression edit against its
base; the pixels that moved are the face, and the mask is an ellipse around them — head included, brows to
chin — with a soft edge tens of pixels wide, so the join fades over a band rather than sitting on a line.
The proof that this works is the explorer: the grin from `grin-explorer.jpeg`, cut that way and laid over
`explorer.jpeg`, shows no seam.

**Not separate eyes and mouth.** It would be the cheaper layer set, and it does not survive this style: an
expression moves the brows, the cheeks, the shape of the eye whites and the shading around all of them
together, and the outlines run continuously between them. Cut at the eye and the mouth, the parts of the
change outside those cuts are left behind, and the edge of every cut lands on an outline. One soft region
takes all of it.

**Baked offline, not composed in the app.** The face layer is laid over the base at master size and the
result goes through `yarn import-portrait` like any other master, so the game still ships one flat sprite
per expression. What changes is where the expression comes from, not what is loaded.

**The pass criterion**, for the proof and for every composed expression after it: at 100% there is no visible
seam anywhere around the face, and outside the head the composed picture is the base to within compression
noise. An edit that moved the hat, the scarf or the outline of the head fails, and is re-rolled rather than
masked around.

### The Fez proof

Three paintings, each landing as a MASTER only: these are inputs to the proof, and no shipped sprite in
`src/assets` is written by any of them. `yarn repaint <key> --land` saves the download at the entry's
`**Master:**` path and stops there.

Fez's colours, measured off `fez-250.png`, are substituted for `[fez palette]`:

> Keep Fez's exact flat colours: scales teal #42a892, shaded teal #118883, belly pale green #bcd8aa, eye
> whites cream #f2e6bf, fez dark red #a64b34, neckerchief red #d54f3b with its shadow #ba4637, outlines
> charcoal #1c2729. Do not lighten, desaturate or reinterpret any of these.

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

### `fez-worried` — the master, worried

**Master:** `art/masters/characters/fez-worried.jpeg`

Attach the landed master, `art/masters/characters/fez.jpeg`. It shows as MISSING in `--check` until
`fez-master` has landed — expected; paint that one first.

> [preamble] [fez palette] Edit the attached picture of Fez. Change ONLY his face, to worried and uneasy:
> brows raised and drawn together, a small open mouth. Keep the outline of his head, the position of his
> eyes, the fez, the neckerchief, his body, his tail and the white background exactly as they are — pixel
> for pixel. Same canvas, same size, same framing. Nothing outside his face moves.

### `fez-pointUp-base` — the master, pointing up

**Master:** `art/masters/characters/fez-pointUp-base.jpeg`

Attach the landed master, `art/masters/characters/fez.jpeg`, and `src/assets/point-fez-250.png` as the pose
reference. Like `fez-worried`, the master shows MISSING until `fez-master` has landed.

> [preamble] [fez palette] Edit the first attached picture of Fez so that he raises one finger, pointing
> upward, the way he does in the second attached picture. Use the second picture for the pose only — draw it
> in the first picture's size and detail. Keep his head exactly as it is: same outline, same eyes, same
> face, same fez, in the same place on the canvas. Same canvas, same framing, white background.
