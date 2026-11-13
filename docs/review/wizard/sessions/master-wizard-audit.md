# Sessie: master-wizard-audit

Je bent een van meerdere Claude-sessies die deze week tegelijk aan pyramid-scheme werken. Lees eerst `AGENTS.md`.

## Jouw spoor: alleen lezen en opschrijven

Breng in kaart wat master en wizard nodig hebben voordat ze uit kunnen, zodat een latere sessie kan bouwen en de
designer weet wat van hem is. Bouw niets, bak niets, verander geen code of content.

Lever twee documenten (Nederlands, kort, tabellen waar het helpt):

- `docs/review/master/readiness.md`
- `docs/review/wizard/readiness.md`

Per tier:

1. **Wat er staat:** expedities/journeys, pyramides en vloeren, locks (en of ze geplaatst zijn), puzzels per familie
   op die rang, kamers/prefabs, verhaal (beats, scenes), art (tiles, props, deuren, muren), economie (loot, winkel).
2. **Wat ontbreekt**, gerangschikt naar wat een speler het eerst mist.
3. **Wie het maakt:** de designer schrijft master/wizard-locks en -puzzels en verhaaltekst; Claude bouwt mechanieken
   en plaatst. Bekende designerwerk: `bathHouse.lock` (branch `designer/lock-drafts`), het zandweb van wizard_3
   (`.web`-lock), master/wizard-art (o.a. chestProp-repaints).
4. **Open beslissingen** voor de designer, met jouw aanbeveling.
5. **Afhankelijkheden** van expert (sessie expert-prep) en van de junior-freeze.

Bronnen: `docs/review-camp-release.md` §0, `docs/game-design/` (lock-curriculum, journeys, keys-and-locks, tile-art
brief, story), `docs/instructions/repaint-queue.md`, `src/game/locks/`, de world-gen DSL en de gebakken data.
Wizard betekent alleen de hoogste moeilijkheid, niets magisch.

Lever via één PR met alleen die twee documenten; merge bij groene CI (controleer elke job). Antwoord de designer in
het Nederlands, kort.
