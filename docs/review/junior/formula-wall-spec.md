# Spec: de formulemuur (brood, water, kleren)

Aanleiding: de designer besloot dat de graf-formule ("I gave bread to the hungry, water to the thirsty, clothes to
the naked") leesbaar wordt via drie nieuwe verzamelbare tekens, één per tier, en dat elk schatgraf vanaf junior één
formulemuur krijgt die de speler actief herstelt, net als Henuts naammuur.

Status: spec, niets gebouwd. Bouwt op twee open PR's: #382 (`junior/henut-and-copy`: Henuts kamers, `namePanel`) en
#387 (`feat/reading-panel`: `Wall.panel`, `WallScreen`/`WallPanel`). Refs naar die branches staan erbij; de rest is
`main` op 2026-11-11.

Vaste regels: één regel voor alle drie de graven, geen uitzondering per geval; geen tests die geschreven content
vastpinnen; docs en comments beschrijven alleen de huidige toestand; de mods hieroglyph en story houden hun eigen
content, de core blijft mod-agnostisch.

---

## 0. Besluiten in één oogopslag

| Wat                    | Voorstel                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Tekens                 | `o1` Brood (junior), `o2` Water (expert), `o3` Linnen/kleren (master), in een nieuwe groep "Offerings / Gaven"       |
| Stukken per teken      | `FRAGMENT_MATRIX[tier].revisit`: 4 / 5 / 6, dezelfde afleiding als elk teken dat geen grafbord vraagt                |
| Waar de stukken liggen | geschreven "thuisplekken": per stuk één ongegate zijpad met `endReward: "hieroglyph:oN"` in een piramide van de tier |
| Muur                   | in elk graf dezelfde regel `[o1, o2, o3, art10]`; het gat zit op het teken van die tier                              |
| Kamer                  | verdieping 1 (de tweede) van de graf-site, één-na-laatste kamer, het pad `+1` langer                                 |
| Trigger                | `Wall.after = "reading.<tier>"`, al bestaand mechanisme in de reading-plugin                                         |
| Starter                | blijft byte-identiek; gemeten, zie §2.4                                                                              |

---

## 1. Catalogus, groep en vertalingen

### 1.1 De tekens

Codepunten nagerekend (`codePointAt`) en tegen Gardiners lijst gelegd:

| id   | naam (en / nl) | teken | codepunt | Gardiner | klopt?                                                                                                    | in font-subset? |
| ---- | -------------- | ----- | -------- | -------- | --------------------------------------------------------------------------------------------------------- | --------------- |
| `o1` | Bread / Brood  | 𓏏     | U+133CF  | X1       | ja: "bread loaf". Maar X1 is in de praktijk de klank _t_ (vrouwelijke uitgang, het meest gebruikte teken) | ja              |
| `o2` | Water / Water  | 𓈗     | U+13217  | N35A     | ja: drie golflijnen, woordteken _mw_ "water". Het standaardteken                                          | ja              |
| `o3` | Linen / Linnen | 𓋳     | U+132F3  | S28      | ja: doek met franje, determinatief van kleding (_ḥbs_, het woord in de formule)                           | **nee**         |

**Beter teken voor brood:** X2 𓏐 (U+133D0), het hoge brood: het determinatief "brood" zelf, dat in _t_ "brood" achter
X1 staat. Op tegelgrootte leest X1 als een halve boog; X2 leest als een brood. Niet R4 𓊵 (brood op een mat, _ḥtp_):
dat is het teken van de offerformule (_ḥtp-dj-nswt_), een andere tekst dan deze "ideale biografie". Voorstel: X2.
S28 en N35A zijn de goede keuzes.

**Font:** `src/assets/hieroglyphs.subset.woff2` draagt alleen de tekens die de bron tekent. S28 (en X2, als die het
wordt) staan er niet in (`src/ui/tokens/hieroglyphFont.generated.ts`). Na het toevoegen: `yarn generate-font`
(`scripts/generateFont.ts`, verzamelt via `scripts/hieroglyphUsage.ts:44`). `src/ui/tokens/hieroglyphFont.spec.ts:31`
faalt als dat vergeten wordt.

### 1.2 Waar ze staan

- `src/mods/hieroglyph/game/symbolCatalogue.ts:362-378`: nieuwe export `egyptianOfferings` (drie entries, `id`,
  `name`, `symbol`, `description`), met een doc-comment: dingen die gegeven worden, geen tableau-tekens, alleen voor de
  formulemuur. In `allItems` (`:380`) **vóór** `egyptianSigns`.
- **Niet** in `TOMB_SYMBOLS` (`src/mods/hieroglyph/game/tableaus.ts:28`, en het duplicaat in
  `src/mods/hieroglyph/app/plugin.tsx:21`). Daar zou de patch-lus (`tableaus.ts:203-230`) ze in een grafbord drukken.
- Id-prefix `o`: botst met geen bestaande prefix (`d`, `p`, `a`, `art`, `s`).

### 1.3 De groep in de Collectie

- `src/mods/hieroglyph/app/HieroglyphCollectionSection.tsx:18,21`: `"offerings"` aan het type en aan `CATEGORIES`,
  tussen `artifacts` en `signs`. Signs blijven laatst; hun comment ("the group that is not a noun") blijft waar.
- `src/mods/hieroglyph/app/useInventoryTranslations.ts:31-36`: prefix `o` → `offerings`; `:48-68`: case
  `"offerings"`. Liever dan nog een prefix-tak: één lijst `[prefix, category, items]` waar beide functies uit lezen.
  Dat is optioneel, en alleen als het de diff niet groter maakt.
- De tier op de tegel komt uit `getItemFirstLevel` (`src/mods/hieroglyph/game/itemLevelLookup.ts:16-17`), dat
  terugvalt op `TIER_BY_HIEROGLYPH`. Werkt zonder wijziging zodra §2.1 staat.

### 1.4 i18n-sleutels

| Bestand                            | Sleutel                                              | en / nl                                            |
| ---------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| `public/locales/*/common.json:257` | `collection.categories.offerings`                    | "🍞 Offerings" / "🍞 Gaven" (designer kiest emoji) |
| `public/locales/*/inventory.json`  | `offerings.o1.name`, `.description` (idem o2, o3)    | designer schrijft                                  |
| `public/locales/*/common.json`     | `story.formula.{wrong,fixed,pick,cannot,gap}` (§3.4) | designer schrijft                                  |

`en` en `nl` gaan mee in de slice zelf (`src/i18n/keys.spec.ts:38,53` eist beide). De andere 40 locales vallen terug op
`en` (`src/i18n/index.ts:23`) tot de vertaalronde van de release.

---

## 2. Verdeling van de stukken

### 2.1 Hoe ze in de bake komen

1. `src/mods/hieroglyph/game/hieroglyphData.ts`: een tabel `OFFERING_SIGNS: Record<string, Tier>` =
   `{ o1: junior, o2: expert, o3: master }`. `HIEROGLYPH_REQUIRED` (`:33-47`) zet ze op `FRAGMENT_MATRIX[tier].revisit`,
   precies de waarde die de bestaande lus al geeft aan een teken dat geen grafbord vraagt (`:43`). Geen nieuw getal.
2. `src/mods/hieroglyph/game/hieroglyphCurrency.ts:51-60`: `TIER_BY_HIEROGLYPH` leest dezelfde tabel (naast `s1`).
3. Niets eist ze op (geen tableau heeft ze in `requiredKeyIds`), dus de completion pass plaatst ze:
   `allBuckets()` (`hieroglyphCurrency.ts:157`) → `src/worldGen/placeFragments.ts:413-421`.
4. `EXPECTED_HIEROGLYPH_FRAGMENTS` (`hieroglyphCurrency.ts:31`) groeit met 15. Dat is de teller "fragmenten x/y" in de
   Collectie, dus zichtbaar voor de speler.

### 2.2 Thuisplekken (geschreven, niet gezocht)

**Gemeten, zonder thuisplekken** (de tekens geregistreerd, `yarn generate-world`, daarna teruggedraaid): o1 landde in
`expert_2`, `expert_3`, `wizard_1` en `wizard_3`, in junior-zakken achter `junior_a_1`, de eerste sleutel uit Henuts
graf. Dat is de `foreignHost`-voorkeur (`hieroglyphCurrency.ts:220`). Brood is dan **niet** te halen vóór Henuts graf.
Expert, master en wizard bewogen; starter en junior niet.

Dus elk stuk krijgt een thuisplek, zoals `s1` (`src/worldGen/spec/wizard.ts:212-216`):

```ts
sidePath({ puzzles: 1, endReward: "hieroglyph:o1", label: "offering" })
```

- **Regel:** één thuisplek per stuk, in de piramides van de tier van het teken, ongegate, op de hoofdverdieping.
  Maximaal één per piramide (de `uniqueBy` per piramide, `hieroglyphCurrency.ts:233-236`). Verspreid over de reizen:
  stuk _k_ in reis `k mod J`.
  - junior, 4 stukken: één in elk van `junior_1..4`. Dat is allemaal vóór het graf, dus brood is af vóór Henut.
  - expert, 5 stukken: `expert_1..4`, plus een tweede in een andere piramide van één reis.
  - master, 6 stukken: `master_1..4`, plus twee reizen met een tweede.
  - Welke piramide precies kiest de designer (§8 V3). Schrijfvorm: `.pyramid(n, { sideSections: [...] })`, zoals
    `holdChest` in `src/worldGen/spec/junior.ts` (`journey("junior_2").pyramid(3, …)`). **Niet** via `.floor()`: die
    laat de tier-zijpaden vallen (`junior.ts:46-51`).
  - `label: "offering"` legt het adres van de sectie vast (`world-spec-stability.md`, "Adding or removing a section").
- **Exacte voorkeur is een harde regel, in twee richtingen.** Vandaag reserveert `claimedByAnother`
  (`hieroglyphCurrency.ts:226-229`) een `hieroglyph:<id>`-plek alleen tégen andere tekens. Een gewone
  `hieroglyph`-plek scoort ook `prefMatch` +2 (`:198`), dus een vreemde junior-plek met `end: "fragment"` haalt
  2 + 1 (`foreignHost`) en wint van de thuisplek (2). Voorstel: heeft een bucket thuisplekken, dan filtert `rank`
  alleen daarop. De bake faalt hardop als er minder thuisplekken zijn dan `required`. Dit raakt vandaag alleen `s1`
  (de enige exacte voorkeur in `src/worldGen/spec/`, gecontroleerd met grep), en `s1` heeft 1 plek voor 1 stuk. De
  wereld beweegt er dus niet door. Het is regelwerk in de hieroglyph-mod, de core verandert niet.
- Waarom nieuwe paden en geen omgevlagde bestaande: een omgevlagd fragmentpad duwt een echt junior-teken weg, en die
  plek moet dan ergens anders gevonden worden. Groeien met geschreven loot is de regel na de doom-loop.

### 2.3 Wat beweegt in junior, expert en master

- **Junior:** 4 nieuwe zijpaden, dus 4 hoofdverdiepingen worden opnieuw uitgehakt. Daarbij komt de formulekamer
  (§4): tombe-verdieping 1 wordt een kamer langer. De geldvulling van junior schuift, want er zijn nieuwe
  puzzelplekken. `src/data/juniorCarve.json` bestaat nog niet (`tierCarveFreeze.testing.ts:25-28`), dus de
  junior-freeze slaat over. Junior is niet uitgebracht: vrij.
- **Expert/master:** 5 en 6 nieuwe zijpaden plus een kamer op tombe-verdieping 1. Vrij, niet uitgebracht.
- **Wizard:** kan meebewegen, omdat de geldvulling van een tier de lagere tiers als inkomen leest
  (`src/mods/shop/game/loot.ts:22-25`). De bake laat het zien. Neem het nieuwe getal alleen op als de beweging zo
  verklaard is.
- `src/data/tierFingerprints.json`: junior, expert, master (en eventueel wizard) opnieuw opnemen, als bewuste daad
  (`world-spec-stability.md:134-145`). `yarn loot-report` ververst `docs/loot-report.md`.

### 2.4 Starter blijft byte-identiek

Waarom het niet kan schuiven:

1. **Tierfilter is hard:** een stuk landt alleen op een plek met `slot.tier === demand.tier`
   (`hieroglyphCurrency.ts:229`). Starter-plekken komen niet in aanmerking.
2. **Junior-zakken in starter-reizen** (`teaseChest("junior")`, `starter_1` verdieping 1 op junior,
   `src/worldGen/spec/starter.ts:246`) zijn wél kandidaat voor o1. De harde thuisplekken (§2.2) sluiten ze uit.
3. **Geld en snuisterijen van starter** komen uit `src/data/releasedLoot.json` (`loot.ts:360-366`). Een plek die het
   record noemt maar die iets anders kreeg, laat de bake falen (`loot.ts:198`).
4. **Gemeten:** zelfs in het slechtste geval, zonder thuisplekken en met `foreignHost` vrij spel, bleef de
   starter-hash in `tierFingerprints.json` gelijk (`tierFingerprints.verify.ts`: alleen expert, master en wizard
   rood).

Elke slice die bakt moet hier groen op zijn: `yarn vitest run --config vitest.verify.config.ts
src/data/tierFingerprints.verify.ts` (starter ongewijzigd), `yarn starter-freeze` (`src/data/starterCarve.json`), en
een diff van `releasedLoot.json` die leeg is. Is starter rood, dan is dat de fout: zoek de oorzaak en neem de hash niet
opnieuw op.

---

## 3. De muurdata

### 3.1 Sleutel: per plek, niet per reis

`WALLS` is `Record<journeyId, Wall>` en `wallFor(journeyId)` (#387 `src/mods/story/game/reading/walls.ts:46-80`). In
`junior_treasure_tomb` staan straks twee leeskamers (Henut op verdieping 0, de formule op verdieping 1). Eén sleutel per
reis kan dat niet.

Voorstel (geen core-wijziging):

- `Wall` krijgt `at: { levelNr: number; floor: number }`. `WALLS: Record<journeyId, Wall[]>`.
  `wallFor(journeyId, levelNr, floor)`.
- De plugin (#387 `src/mods/story/app/reading/plugin.tsx:31`) leest `floor` uit `floorOfAddress(ctx.address)`
  (`src/app/SiteMap/cellIdentity.ts:13`) en `ctx.levelNr`.
- Henut: `at: { levelNr: 2, floor: 0 }`. De Sphinx: de plek die de bake geeft (`findEncounterRoom`,
  `src/game/encounterRoom.ts:12`).
- **Guard (wereld tegen data, geen content-pin):** elke `reading`-kamer in `generatedWorldConfigs` heeft precies één
  muur op haar plek, en elke muur staat op een `reading`-kamer. Zelfde vorm als
  `src/mods/story/game/conversation/placement.spec.ts:32-42`.
- Alternatief: `encounterArgs` op een `NodeSelector` (`src/worldGen/dsl.ts:71-91`, nu zonder dat veld), naar het
  voorbeeld van `sceneOfRoom` (`src/mods/story/game/conversation/sceneFor.ts:36-37`). Dan noemt de spec de muur bij
  naam en hangt niets aan een verdiepingsindex. Maar dat is een core DSL-uitbreiding en groter. Niet nu.

### 3.2 De drie muren: één regel, één vorm

De formule staat in elk graf, "because it genuinely was" (`script-act-2.md:134`). Dus elk graf heeft **dezelfde
regel**. Alleen het gat verschilt. Dat volgt `main-path.md:197-198`: "The wall never changes — the player does."

```
FORMULA = ["o1", "o2", "o3", "art10"]   // brood, water, kleren, boot (Solar Barque, master)
```

| Graf                   | `at`                       | `cut`                       | `wrongAt` | `answer` | `missing` | `after`          |
| ---------------------- | -------------------------- | --------------------------- | --------- | -------- | --------- | ---------------- |
| `junior_treasure_tomb` | `{ levelNr: 2, floor: 1 }` | `["", "o2", "o3", "art10"]` | 0         | `o1`     | true      | `reading.junior` |
| `expert_treasure_tomb` | `{ levelNr: 2, floor: 1 }` | `["o1", "", "o3", "art10"]` | 1         | `o2`     | true      | `reading.expert` |
| `master_treasure_tomb` | `{ levelNr: 2, floor: 1 }` | `["o1", "o2", "", "art10"]` | 2         | `o3`     | true      | `reading.master` |

- Afgeleid, niet drie keer overgetypt: `formulaWall(tier)` in `walls.ts` bouwt de rij uit `FORMULA` en de index van
  het teken van die tier.
- Wat de speler ziet: in junior is alleen het gat te vullen; o2, o3 en de boot zijn vormen (`legible`, #387
  `walls.ts:86-87`). In expert leest brood mee, in master brood en water (en de boot als die al af is). Dat sluit aan
  op de regels: "Bread. In a tomb." / "Bread, and now water." / "Bread, water, clothes."
- **Gat (`missing`) en geen miscut.** Een miscut vraagt "welk teken was het", met de tray van ~62 tekens als
  antwoordruimte. Een gat vraagt "heb je het". Dat is precies de vraag hier: het teken is net voor deze muur verzameld.
  Ook heeft de catalogus geen geloofwaardige verkeerde lezing van een brood (vgl. gans/uil bij Henut). Het
  `Wall.missing`-comment (#387 `walls.ts:17-23`) beschrijft dit onderscheid al. De designer beslist (§8 V1).
- Zonder het teken: de muur staat er, `cannot`-tekst, terug kan altijd. Geen faalstaat (#387 `plugin.tsx:16-25`).
- **Geen content-tests.** De generieke checks in `walls.spec.ts` dekken de nieuwe muren: tekens bestaan in de
  catalogus, `wrongAt` binnen de regel, een gat is leeg. De twee tests die nu Henuts inhoud pinnen (#387
  `walls.spec.ts:29-40`: `a12`, `art5`) gaan naar een verzonnen muur.

### 3.3 Paneel en art

- Henuts `namePanel` is een **staande cartouche**. Een cartouche omsluit een naam, niet een zin. Junior kan het dus
  niet hergebruiken: **nieuwe art**.
- Eén gedeeld paneel `formulaPanel` voor alle drie de tiers (mechanic art is gedeeld; een tier-variant kan later via de
  tileset). Het is een liggende stele met één horizontaal register, `flow: "row"`, geen `frame`.
- Twee plekken voor dezelfde master, zoals `namePanel`:
  1. wandtegel: `"formulaPanel"` aan `WALL_DECORATION_KINDS` (`src/game/siteTypes.ts`, #382 voegt daar `namePanel` aan
     toe), placeholder via `scripts/generateDummyTiles.ts`;
  2. leesachtergrond: `yarn import-reading art/masters/props/<tier>/formulaPanel.webp --name=formulaPanel`
     (#387 `scripts/importReading.ts`), en daarna `panel.art`, `aspect` en `signs` uit het schilderij.
- **Tot het geschilderd is:** `panel` zonder `art`. #387 `WallPanel` tekent dan altijd een liggende cartouche
  (`panel.ts:14`), en dat is fout voor een zin. Uniforme regel: **het touw wordt alleen getekend als `frame` gezet
  is** (de cartouche ís dan dat teken). Zonder `frame` komt er een kale stele. De Sphinx heeft `frame: 0` en verandert
  niet.
- **Repaint-queue:** een entry `formulaPanel` in `docs/instructions/repaint-queue.md`, naast `sphinx/namePanel`
  (#387), met `art/masters/props/junior/namePanel.webp` als bijlage voor steen, rand en verf. De import-regel komt in
  `art/rebuild.sh`. Een regel in `docs/game-design/tile-art-brief.md` (wat het ís) en `docs/instructions/art-tasks.md`.

### 3.4 Tekst bij de muur

Eén gedeelde prefix `story.formula` voor alle drie (`wrong`, `fixed`, `pick`, `cannot`, `gap`), want de muur is
overal dezelfde. Wat elke regel moet doen, de designer schrijft de tekst:

- `wrong`: dezelfde regels als in elk graf, en één teken is weggesleten.
- `fixed`: de regel is weer heel (kort; de beat neemt het over).
- `pick`: zet het teken dat je draagt in de lege plek.
- `cannot`: je kent het teken dat hier hoort nog niet.
- `gap`: de aria-naam van het gat ("The missing sign").

Let op (#387 PR-body): Henuts tekst telt de cartouche als teken. Zonder `frame` is er geen cartouche, dus "het eerste
teken" klopt hier gewoon.

---

## 4. De kamer en waar ze vastgepind wordt

### 4.1 De `.room`-bestanden

Namen zijn wereldwijd uniek en de `tier`-header moet gelijk zijn aan de map (`docs/instructions/room-prefabs.md:3-6`).
Dus drie bestanden met **één tekening**:

- `src/game/rooms/junior/formulaWallJunior.room`
- `src/game/rooms/expert/formulaWallExpert.room` (de **eerste** expert-prefab; de map bestaat nog niet)
- `src/game/rooms/master/formulaWallMaster.room` (idem master)

Voorstel, naar `henutWall.room` (#382), zonder `activity` (expert en master hebben geen activiteiten,
`src/game/activities.ts:44-96`; uniform dus ook niet bij junior):

```
// designed by: Claude
// <tier>. The tomb's formula: the offering list on a stela on the north wall, an offering table before it, a lamp either side, the stop facing it.
room formulaWall<Tier>
tier <tier>

layout
# # n f n # #
# l . o . l #
d . . s . . d
# . . . . . #
# # d # d # #

f wallItem formulaPanel
n wallItem sconce
l wall lamp
o wall offeringTable
s stop
```

`reading` heeft geen `actor` (#387 `src/mods/story/game/reading/meta.ts`), dus de kamer hoeft niet "fit" te zijn.
Controleer met `yarn room formulaWallJunior` (enz.). `lamp`, `offeringTable` en `sconce` hebben expert-tegels
(`src/assets/tiles/expert/`). Master moet nagekeken worden (§8 V6).

### 4.2 Waar vastgepind

Uniforme regel: **verdieping 1 (de tweede) van de graf-site (`levelNr` 2) van `<tier>_treasure_tomb`, als
één-na-laatste kamer; `pathPuzzles` van die verdieping +1.** Verdieping 1 komt na de geest op verdieping 0 (Henut, de
priester, de farao), dus in junior na Henuts naammuur (wens van de designer). Dezelfde volgorde als bij Henut: geen
verhaalkamer vóór een tableau, en nooit de laatste kamer (die is de krokodil) (`IMPLEMENTATION.md`, "Two placement
rules").

| Graf                   | Spec                                                                   | wordt                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `junior_treasure_tomb` | `src/worldGen/spec/junior.ts:287` (main; op #382 ~`:302`), `floors[1]` | `pathPuzzles: TOMB_ROOMS_PER_FLOOR.junior + 3`, node `{ where: TOMB_ROOMS_PER_FLOOR.junior + 2, encounter: "reading", room: "formulaWallJunior" }` |
| `expert_treasure_tomb` | `src/worldGen/spec/expert.ts:248`, `floors[1]`                         | idem met `expert`                                                                                                                                  |
| `master_treasure_tomb` | `src/worldGen/spec/master.ts:228`, `floors[1]`                         | idem met `master`                                                                                                                                  |

Junior verdieping 1 wordt dan: tableau, expert-puzzel, tableau, tableau, **muur**, krokodil (nu: `1 1 junior 5`
tableau/sumplete/tableau/tableau/crocodile).

Alleen het eerste graf van een tier, niet `expert_treasure_tomb_b` of `master_treasure_tomb_b`: één regel per tier,
één beat (§8 V4).

### 4.3 Dev-sprong

`src/mods/story/game/storyRooms.ts:15-22`: drie entries "Jump: formula (junior/expert/master)" met `levelNr: 2,
floor: 1`. Henuts entry krijgt `levelNr: 2, floor: 0`, anders vindt `findEncounterRoom` toevallig de eerste.

---

## 5. Triggers: `reading.junior/expert/master`

- Geen nieuwe bedrading: #387 `plugin.tsx` speelt `wall.after` na het herstel (`showConversation(wall.after, …, {
story: true, forceReplay: true })`). Dat `after` staat in §3.2.
- Tekst staat al: `public/locales/{en,nl}/fez.json:727` (`reading.junior` 4 regels, `.expert` 5, `.master` 4).
- **Voorstellen voor de tekst (de designer beslist en schrijft):**
  - `reading.junior.1` "There is a line here I can read now.": bij een actieve muur heeft de speler net één teken gezet
    en leest hij alleen het begin. Bijvoorbeeld "Now I can read the start of it."
  - `reading.junior.4` "It is in the last one too.": Ipi's graf (starter) heeft geen formulemuur, en daar mag ook geen
    komen (starter blijft byte-identiek, §2.4). Óf de regel blijft bewust (de formule stond er onzichtbaar, de speler
    herkent het achteraf), óf hij wordt "I have walked past this in every tomb."
  - `reading.expert.3` "the same two lines": klopt met de muur (twee leesbare tekens).
  - `reading.master.2` "Bread, water, clothes.": met `art10` op de muur kan de boot al leesbaar zijn. Of Fez de boot
    noemt, of laat liggen tot wizard, is aan de designer (§8 V2).
- Verhaallog: `ALL_SCENES` toont `reading.*` niet (`IMPLEMENTATION.md:267`). Dat staat er los van en hoort niet in
  deze spec.
- Een gerepareerde muur wordt niet onthouden (`picked` is lokale state in de plugin). Bij een tweede bezoek is hij weer
  kapot en speelt de beat opnieuw. Dat geldt ook voor Henut en de Sphinx, dus hier niets apart regelen. Wel een open
  vraag (§8 V7).

---

## 6. Docs om bij te werken (in de slice die het waar maakt)

| Doc                                                                                                          | Wat                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/game-design/story/main-path.md:195-203`                                                                | "58 nouns in four groups … cannot write the tomb-autobiography formula": wordt de huidige stand (zes groepen: de vier, Offerings, Signs). De formule wordt geschreven met de drie gaven plus de boot, als tombe-regel per tier. **De finale blijft Fez' naam** (`:210`). |
| `main-path.md:223-241` (alternatief A)                                                                       | blijft een overwogen alternatief voor het **einde**. Eén zin erbij: de formule staat als tombe-regel in het spel, het einde is de naam.                                                                                                                                  |
| `docs/game-design/story/IMPLEMENTATION.md:227-235`                                                           | "one entry per journey" → per plek (`at`). Het formulegat en het gedeelde paneel.                                                                                                                                                                                        |
| `IMPLEMENTATION.md:261-267` ("What is left")                                                                 | rij `reading.junior/expert/master` eruit zodra slice 3 staat.                                                                                                                                                                                                            |
| `script-act-2.md:133-134`, `script-act-3.md:139`, `script-act-4.md:142`                                      | trigger: speelt als de formulemuur in het graf hersteld is, niet "the first time the player can read a full line".                                                                                                                                                       |
| `docs/review/junior/story-beats.md:336-344` (§2.2)                                                           | status van `reading.junior`.                                                                                                                                                                                                                                             |
| `src/mods/hieroglyph/game/hieroglyphData.ts:28-31`, `hieroglyphCurrency.ts:52-55,222-225`                    | comments: gaven (in stukken, met thuisplekken) naast hele tekens; exacte voorkeur is een harde regel.                                                                                                                                                                    |
| `docs/instructions/repaint-queue.md`, `docs/game-design/tile-art-brief.md`, `docs/instructions/art-tasks.md` | `formulaPanel` (§3.3).                                                                                                                                                                                                                                                   |
| `docs/loot-report.md`                                                                                        | `yarn loot-report` na de bake.                                                                                                                                                                                                                                           |
| `CHANGELOG.md`                                                                                               | geen entry: junior, expert en master zijn nog niet uitgebracht.                                                                                                                                                                                                          |

---

## 7. Slices

Voorwaarde: #382 en #387 gemerged.

| #   | Slice                                                                                                                                                                                                                                                                       | Grootte | Bake?                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------- |
| 1   | **Muur per plek + kale stele.** `Wall.at`, `wallFor(journeyId, levelNr, floor)`, plugin leest de verdieping, wereld↔muren-guard, touw alleen bij `frame`, Henut/Sphinx krijgen `at`, de content-pins in `walls.spec.ts` gaan naar een verzonnen muur. Geen wereldwijziging. | S       | nee                             |
| 2   | **De gaven.** Catalogus, groep, `en`/`nl`, `yarn generate-font`, `OFFERING_SIGNS`, harde exacte voorkeur, 15 thuisplekken in de junior-, expert- en master-spec, bake, fingerprints opnieuw opnemen (behalve starter), loot-report.                                         | M       | ja; starter-guards groen (§2.4) |
| 3   | **De formulekamers.** Drie `.room`-bestanden, `formulaPanel` wandsoort + placeholder, nodes in drie graven, `formulaWall(tier)` in `WALLS`, `story.formula.*` en/nl (designer-tekst of duidelijke placeholder), dev-sprongen, bake, docs §6.                                | M       | ja                              |
| 4   | **Art.** `formulaPanel` op de repaint-queue; de gebruiker schildert (`yarn repaint`), Claude importeert en zet `panel.art/aspect/signs`.                                                                                                                                    | S       | nee                             |

Slices 2 en 3 kunnen in één PR als de designer de plekken (V3) en de tekst tegelijk aanlevert. Zo hoeft er één keer
gebakken te worden. Elke bake: `yarn verify` en `yarn verify-content`; daarna, in een schone worktree, `gh pr checks`
per job.

---

## 8. Open vragen voor de designer

| #   | Vraag                                                                                                 | Aanbeveling                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| V1  | Gat (`missing`) of miscut op de formulemuur?                                                          | **Gat.** Het teken is net voor deze muur verzameld; de vraag is "heb je het", niet "welk". Geen geloofwaardige verkeerde lezing van brood in de catalogus.                                                               |
| V2  | Staat de boot (`art10`, Solar Barque, master) als vierde teken op de muur?                            | **Ja.** Het is de echte formule, en de vier-delige lijst uit `main-path.md` alt. A. Zonder gat blijft het een vorm tot de speler hem heeft. Een wizard-regel ("a boat to him who had none") kan later, buiten deze spec. |
| V3  | In welke piramide per reis ligt elk thuispad?                                                         | Een middelste piramide per reis, niet de eerste (eerst de tier leren) en niet de laatste (anders ligt brood vlak voor het graf). Regel: stuk _k_ in reis `k mod J`.                                                      |
| V4  | Ook een formulemuur in `expert_treasure_tomb_b` / `master_treasure_tomb_b`?                           | **Nee.** Eén regel per tier, één beat.                                                                                                                                                                                   |
| V5  | Brood: X1 𓏏 of X2 𓏐?                                                                                  | **X2.** Het determinatief "brood"; X1 leest als een halve boog en is in de praktijk de klank _t_.                                                                                                                        |
| V6  | Expert/master: de eerste prefab-kamers van die tiers. Mogen ze al vóór de art-ronde van die tiers?    | Ja: dezelfde props als junior, met bestaande expert-tegels. Master nakijken op `lamp`/`offeringTable`/`sconce`. Anders een placeholder op de repaint-queue.                                                              |
| V7  | Moet een herstelde muur hersteld blijven (opgeslagen)?                                                | Ja, maar voor alle muren tegelijk (Henut, Sphinx, formule), als eigen taak. Buiten deze spec.                                                                                                                            |
| V8  | Tekst: `reading.junior.1` en `.4` bij een actieve muur; `story.formula.*` (één set voor drie graven)? | Zie §5. Eén gedeelde set, omdat de muur overal dezelfde is.                                                                                                                                                              |
| V9  | Aantal stukken: revisit (4/5/6) of eerste-sectie (3/4/5)?                                             | **Revisit.** Dat is wat de bestaande afleiding geeft voor een teken dat geen grafbord vraagt; er komt geen nieuw getal bij.                                                                                              |
