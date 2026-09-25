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
4. **It stands where a person stands.** This takes a character's place in a conversation, beside Fez, at the
   same size as the four ghosts — so it is composed upright and compact, not as a landscape.

> [preamble] **There is no figure in this picture** — ignore every instruction above about a standing figure
> and its pose. **Nothing here is translucent or blue-green.** This is not a ghost; it is a place.
>
> A small camp that somebody walked away from, arranged as one tall compact group about two thirds as wide
> as it is tall, resting on bare ground, so that it fills the same upright frame a standing person would.
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

## 4. What is not here

**The bust crops.** They are crops of the files above, not new generations — the expressive part is head and
shoulders and that is a cut, not a drawing.

**The Sphinx inscription, the seals and the props.** Those are objects rather than characters, they need
their own reference set, and the inscription is the ending — it wants its own pass with the writing legible
enough to read at phone width.
