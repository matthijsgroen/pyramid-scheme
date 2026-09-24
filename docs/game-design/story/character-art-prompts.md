# Character art — generation prompts

For the explorer's conversation portraits and the five tomb ghosts. Written for an image model that
accepts a reference image, and **the reference is the whole trick**: hand it `src/assets/fez-250.png` and
the large explorer artwork, every time, or the set drifts.

Same loop as [starter-art-prompts.md](../starter-art-prompts.md): one file at a time, both of us look, the
accepted file becomes the reference for the next.

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

**Generate on white, then cut the background.** The sprites are RGBA with real transparency; white is only
what an image model can give you. A file is not ready to import until its background is alpha.

## 1. The explorer — conversation portraits

The large artwork is full-body at high resolution; these are the 250px companions to `fez-250.png`, drawn
to sit at the same scale beside it. **Match the existing explorer exactly**: olive-green utility vest with
four flap pockets, cream rolled-sleeve shirt, red neckerchief, wide brown felt bush hat, cream cargo
trousers, laced tan boots, coiled rope and small brown satchel on a shoulder strap, brass compass.

**No gendered read.** Keep the face young and neutral, hair short and mid-brown under the hat, and do not
add stubble, eyelashes, jewellery, makeup or a waist. A player of any description should be able to see
themselves standing next to this person — the explorer is a character anybody is glad to be beside, not a
portrait of one kind of person.

### `explorer-250.png` — neutral, talking

> [preamble] A young explorer in a wide brown bush hat and olive utility vest, standing relaxed and facing
> the viewer, one hand resting at their side and the other holding a folded map. Calm, dry, pleasant
> expression — mouth closed or barely smiling, eyebrows level. Not grinning. Reference the supplied
> explorer artwork for every item of clothing and equipment.

### `grin-explorer-250.png` — the solve

> [preamble] The same explorer, same clothing and equipment, now wearing dark sunglasses and grinning
> broadly, head tilted very slightly. One thumb hooked in a vest pocket. Pleased rather than smug.
> Reference the supplied explorer artwork.

### `point-explorer-250.png` — drawing attention

> [preamble] The same explorer, same clothing and equipment, pointing upward and slightly off-camera with
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

> [preamble + ghost preamble] **Not translucent, not a ghost** — nobody is there. Instead: a small
> abandoned camp, drawn in the same style. A rolled canvas bedroll, a battered tin kettle, a rope coiled on
> a stone, an open notebook face down, and a hat very like the explorer's, left behind. No figure, no
> remains, no blood. The scene should read as somebody who left in a hurry and meant to come back.

## 3. The placeholder in the meantime

`src/assets/explorer-placeholder.svg` stands in until §1 is drawn: a flat bust in the right palette — brim,
neckerchief, olive vest over cream — with no face. It is deliberately unfinished, and a featureless face
cannot accidentally commit to a read the character is not supposed to have. Replace it with
`explorer-250.png` and delete it.

## 4. What is not here

**The bust crops.** They are crops of the files above, not new generations — the expressive part is head and
shoulders and that is a cut, not a drawing.

**The Sphinx inscription, the seals and the props.** Those are objects rather than characters, they need
their own reference set, and the inscription is the ending — it wants its own pass with the writing legible
enough to read at phone width.
