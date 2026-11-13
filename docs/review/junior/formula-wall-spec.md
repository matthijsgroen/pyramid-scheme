# Spec: de formulemuur (de geesten geven het teken)

Aanleiding: de graf-formule ("I gave bread to the hungry, water to the thirsty, clothes to the naked, and a boat to
him who had none") is een lijst van dingen die iemand weggaf. De doden in de graven kwamen om rekeningen te vereffenen;
hier geven ze iets. Elk schatgraf vanaf junior krijgt één formulemuur met één leeg vak. Het teken voor dat vak krijgt de
speler van de geest van het graf één tier lager, bij een terugbezoek. Een gift, geen loot: het hele teken in één keer.

Status: slices 1–3 gebouwd (#405), slice 4 gebouwd (formulekamers, bake), slice 5 gebouwd (art geïmporteerd). Bouwde op #382 (`junior/henut-and-copy`: Henuts kamers en tekst) en #387
(`feat/reading-panel`: `Wall.panel`, `WallScreen`/`WallPanel`). Refs naar die branches staan erbij; de rest is `main`
op 2026-11-11 (na #400).

Vaste regels: één regel voor alle vier de muren, geen uitzondering per geval; geen tests die geschreven content
vastpinnen; docs en comments beschrijven alleen de huidige toestand; de mods hieroglyph en story houden hun eigen
content, de core blijft mod-agnostisch.

**De bake en de loot bewegen niet door de tekens:** ze zijn geen fragmenten, krijgen geen plek in de wereld en staan
niet in `HIEROGLYPH_REQUIRED`. Alleen de formulekamers (§4) veranderen de wereld, op verdieping 1 van vier graven die
nog niet zijn uitgebracht.

---

## 0. Besluiten in één oogopslag

| Wat               | Besluit / voorstel                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Tekens            | `o1` Brood (Ipi), `o2` Linnen (Henut), `o3` Water (hogepriester), `o4` Boot (farao), in een nieuwe groep "Offerings/Gaven" |
| Regel             | het graf van tier N heeft de muur met het vak voor het teken van de geest van tier N−1                                     |
| Muren             | junior ← brood van Ipi, expert ← linnen van Henut, master ← water van de priester, wizard ← boot van de farao              |
| Wizard-muur       | in `wizard_treasure_tomb`, dezelfde regel als de andere drie (`<tier>_treasure_tomb`, verdieping 1)                        |
| Wat de muur toont | de gaven tot nu toe, in de volgorde waarin ze gegeven worden, dan het lege vak (§3.2, V2)                                  |
| Hint              | Fez bij de lege muur: naar wie je terug moet. Geen kaartmarkering                                                          |
| Gift              | de geest geeft het teken bij een terugbezoek, pas als de speler de muur van tier N heeft gezien (§5)                       |
| Toekenning        | de conversatie-plugin roept de bestaande `applyReward`-prop aan met een `hieroglyphFragment` (§5.3). Geen core-wijziging   |
| Save              | geen nieuwe vorm: nieuwe sleutels in `conversations`, nieuwe waarden in `collectedFragments`. Geen double-write (§5.4)     |
| Starter           | krijgt Ipi's gift-beat; wereld, carve en loot van starter blijven byte-identiek (§6)                                       |

---

## 1. Catalogus, groep en vertalingen

### 1.1 De tekens

Codepunten nagerekend (`codePointAt`, Unicode-namen) en tegen Gardiners lijst gelegd:

| id   | gever        | naam (en / nl) | teken | codepunt | Gardiner | klopt?                                                                             | in font-subset? |
| ---- | ------------ | -------------- | ----- | -------- | -------- | ---------------------------------------------------------------------------------- | --------------- |
| `o1` | Ipi          | Bread / Brood  | 𓏐     | U+133D0  | X2       | ja: het hoge brood, het determinatief "brood" (zie hieronder)                      | **nee**         |
| `o2` | Henut        | Linen / Linnen | 𓋳     | U+132F3  | S28      | ja: doek met franje, determinatief van kleding (_ḥbs_, het woord in de formule)    | **nee**         |
| `o3` | hogepriester | Water / Water  | 𓈗     | U+13217  | N35A     | ja: drie golflijnen, woordteken _mw_ "water". Het standaardteken                   | ja              |
| `o4` | farao        | Boat / Boot    | 𓊛     | U+1329B  | P1       | ja: de boot, het determinatief van _mḫnt_ "veerboot", het woord in de formule (V1) | ja              |

**Brood: X2, niet X1.** X1 𓏏 (U+133CF) is ook "brood", maar is in de praktijk de klank _t_ (de vrouwelijke uitgang,
het meest gebruikte teken). Op tegelgrootte leest X1 als een halve boog; X2 leest als een brood. Niet R4 𓊵 (brood op
een mat, _ḥtp_): dat is het teken van de offerformule (_ḥtp-dj-nswt_), een andere tekst dan deze "ideale biografie".

**Boot: niet `art10`.** `art10` "Solar Barque" kan de farao niet geven, want de speler heeft hem dan al:

- het is een master-teken in `TOMB_SYMBOLS` (`src/mods/hieroglyph/game/tableaus.ts:32`), met 6 fragmenten in de
  wereld (`hieroglyphRequired.art10` in `src/data/generatedWorld.ts`);
- tableaus van `master_treasure_tomb_b` (run 2, 3, 4) en `wizard_treasure_tomb` (vanaf run 1) vragen erom. Wie de
  wizard-muur ziet, heeft `art10` dus al ingevuld.

Daarom een eigen gift-teken `o4`. Een losse vondst: `art10` tekent 𓂧 U+130A7, en dat is **D46, een hand** (de klank
_d_), geen boot. De echte heilige bark is P3 𓊞 (U+1329E). Dat herstellen raakt de bake niet (het id blijft), maar het is
een eigen taak (V1).

**Font:** `src/assets/hieroglyphs.subset.woff2` draagt alleen de tekens die de bron tekent. X2 en S28 staan er niet in
(`src/ui/tokens/hieroglyphFont.generated.ts`). Na het toevoegen: `yarn generate-font` (`scripts/generateFont.ts`,
verzamelt via `scripts/hieroglyphUsage.ts`). `src/ui/tokens/hieroglyphFont.spec.ts:31` faalt als dat vergeten wordt.
N35A en P1 staan er al in (P1 ook als verkoopwaar `sell_gold_2` in `src/data/sellables.ts:47` en in de procession-casts).

### 1.2 Waar ze staan

- `src/mods/hieroglyph/game/symbolCatalogue.ts`: nieuwe export `egyptianOfferings` (vier entries, `id`, `name`,
  `symbol`, `description`), met een doc-comment: dingen die weggegeven worden; een geest geeft elk teken heel; geen
  tableau-tekens, alleen voor de formulemuur. In `allItems` (`:380`) **vóór** `egyptianSigns`.
- **Niet** in `TOMB_SYMBOLS` (`src/mods/hieroglyph/game/tableaus.ts:28`, en het duplicaat in
  `src/mods/hieroglyph/app/plugin.tsx:21`). Daar zou de patch-lus ze in een grafbord drukken.
- **De microverhalen blijven heel.** De tableau-teksten (`tableaus.json`) noemen tekens bij naam; geen tableau gebruikt
  een gift-id. Een generieke test in `tableaus.spec.ts` ("geen tableau gebruikt een gift-teken") houdt dat zo.
- **Namen uniek houden.** `tableaus.ts:111` bouwt `nameToId` uit `allItems`, laatste wint. Een gift met dezelfde naam als
  een verhaalobject (`objectsForStories`) zou een tableau naar het gift-teken laten wijzen, en dan beweegt de bake wél.
  Vandaag botst "Bread", "Linen", "Water" en "Boat" met niets (grep). Een generieke test "elke naam in de catalogus komt
  één keer voor" in `symbolCatalogue.spec.ts` houdt dat zo; dat is geen content-pin.
- Id-prefix `o`: botst met geen bestaande prefix (`d`, `p`, `a`, `art`, `s`).

### 1.3 De groep in de Collectie

- `src/mods/hieroglyph/app/HieroglyphCollectionSection.tsx:18,21`: `"offerings"` aan het type en aan `CATEGORIES`,
  tussen `artifacts` en `signs`. Signs blijven laatst; hun comment ("the group that is not a noun") blijft waar.
- `src/mods/hieroglyph/app/useInventoryTranslations.ts:31-35`: prefix `o` → `offerings`; `:48-68`: case
  `"offerings"`. Liever dan nog een prefix-tak: één lijst `[prefix, category, items]` waar beide functies uit lezen.
  Optioneel, en alleen als het de diff niet groter maakt.
- **Tier op de tegel.** `getItemFirstLevel` (`src/mods/hieroglyph/game/itemLevelLookup.ts:16-17`) zoekt in
  `TOMB_SYMBOLS` en valt terug op `TIER_BY_HIEROGLYPH`. Een gift staat in geen van beide, dus de tegel blijft altijd
  "empty" (`HieroglyphCollectionSection.tsx:53`). Daarom een derde terugval op de gift-tabel van §5.2 (de tier van de
  muur). **Niet** in `TIER_BY_HIEROGLYPH`: dat is de plaatsingsfilter van de bake.
- Het kompas biedt een gift nooit aan: `startedGlyphs` toont alleen tekens die half verzameld zijn, en een gift is 1 van
  1. Geen wijziging nodig.

### 1.4 i18n-sleutels

| Bestand                            | Sleutel                                                             | en / nl                                            |
| ---------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| `public/locales/*/common.json:261` | `collection.categories.offerings`                                   | "🍞 Offerings" / "🍞 Gaven" (designer kiest emoji) |
| `public/locales/*/inventory.json`  | `offerings.o1.name`, `.description` (idem o2–o4)                    | designer schrijft                                  |
| `public/locales/*/common.json`     | `story.formula.{wrong,fixed,pick,cannot,gap}` (§3.4)                | designer schrijft                                  |
| `public/locales/*/fez.json`        | `formula.<tier>.hint`, `formula.<tier>.gift`, `reading.wizard` (§7) | designer schrijft                                  |

`en` en `nl` gaan mee in de slice zelf (`src/i18n/keys.spec.ts` eist beide). De andere locales vallen terug op `en`
(`src/i18n/index.ts`) tot de vertaalronde van de release.

---

## 2. Eén regel, vier muren

**Regel:** het eerste schatgraf van tier N (`<N>_treasure_tomb`) heeft op verdieping 1 een formulemuur. Het lege vak
vraagt het teken dat de geest van tier N−1 weggeeft. Fez wijst bij de muur naar die geest; de speler gaat terug naar het
graf van tier N−1; de geest geeft het teken; de muur kan hersteld worden.

| Muur in                | Leeg vak | Gever (scène)            | Waarom dit ding                                                |
| ---------------------- | -------- | ------------------------ | -------------------------------------------------------------- |
| `junior_treasure_tomb` | `o1`     | Ipi (`tomb.starter`)     | veertig jaar graanzakken geteld; dat hij iets geeft is de grap |
| `expert_treasure_tomb` | `o2`     | Henut (`tomb.junior`)    | haar kleedkamer (`src/game/rooms/junior/dressingRoom.room`)    |
| `master_treasure_tomb` | `o3`     | priester (`tomb.expert`) | plengoffers                                                    |
| `wizard_treasure_tomb` | `o4`     | farao (`tomb.master`)    | zijn bark; de man die alles meenam, geeft zijn boot weg        |

Het starter-graf heeft geen muur (er is geen tier eronder), en de geest in `wizard_treasure_tomb` geeft niets (er is
geen tier erboven). Dat volgt uit de tabel, het is geen uitzondering in code.

**Welk wizard-graf:** `wizard_treasure_tomb`, door dezelfde regel. Het is ook het eerste wizard-graf dat de speler
binnenkomt: `_b` en `_c` gaan pas open met sleutels en kaartstukken van de andere wizard-graven
(`src/worldGen/spec/wizard.ts:45-52`). Op verdieping 0 staat de rite van de priester (`tomb.wizard`) en de rietbloem
(`s1`); de muur op verdieping 1 komt daarna.

---

## 3. De muurdata

### 3.1 Sleutel: per plek, niet per reis

`WALLS` is `Record<journeyId, Wall>` en `wallFor(journeyId)` (`src/mods/story/game/reading/walls.ts:42-61`). In
`junior_treasure_tomb` staan straks twee leeskamers (Henut op verdieping 0, de formule op verdieping 1). Eén sleutel per
reis kan dat niet.

Voorstel (geen core-wijziging):

- `Wall` krijgt `at: { levelNr: number; floor: number }`. `WALLS: Record<journeyId, Wall[]>`.
  `wallFor(journeyId, levelNr, floor)`.
- De plugin (#387 `src/mods/story/app/reading/plugin.tsx`) leest `floor` uit `floorOfAddress(ctx.address)`
  (`src/app/SiteMap/cellIdentity.ts:13`) en `ctx.levelNr`.
- Henut: `at: { levelNr: 2, floor: 0 }`. De Sphinx: de plek die de bake geeft (`findEncounterRoom`,
  `src/game/encounterRoom.ts`).
- **Guard (wereld tegen data, geen content-pin):** elke `reading`-kamer in `generatedWorldConfigs` heeft precies één
  muur op haar plek, en elke muur staat op een `reading`-kamer. Zelfde vorm als
  `src/mods/story/game/conversation/placement.spec.ts`.
- Alternatief: `encounterArgs` op een `NodeSelector` (`src/worldGen/dsl.ts`), naar het voorbeeld van `sceneOfRoom`
  (`src/mods/story/game/conversation/sceneFor.ts:30-31`). Dan noemt de spec de muur bij naam. Maar dat is een core
  DSL-uitbreiding en groter. Niet nu.

### 3.2 Wat elke muur toont

De formule wordt pas aan het eind van het spel helemaal gelezen; daarvoor weet de speler er niets van. De volgorde mag
dus de volgorde van geven zijn, niet die van de oorspronkelijke tekst. Drie mogelijkheden:

| Optie                                   | junior    | expert    | master    | wizard    | Nadeel                                                                                                        |
| --------------------------------------- | --------- | --------- | --------- | --------- | ------------------------------------------------------------------------------------------------------------- |
| A. alleen het eigen woord               | `▯`       | `▯`       | `▯`       | `▯`       | geen lijst: "a list of things given away" valt pas op als hij groeit                                          |
| B. overal de hele regel, gat per tier   | `▯ 𓋳 𓈗 𓊛` | `𓏐 ▯ 𓈗 𓊛` | `𓏐 𓋳 ▯ 𓊛` | `𓏐 𓋳 𓈗 ▯` | onbekende tekens worden op 40% getekend (#387 `WallPanel.tsx:122`): de junior-muur toont al een boot en water |
| **C. de gaven tot nu toe, dan het gat** | `▯`       | `𓏐 ▯`     | `𓏐 𓋳 ▯`   | `𓏐 𓋳 𓈗 ▯` | elke muur is anders lang; `main-path.md` ("The wall never changes") moet bij de stand                         |

**Aanbeveling: C.** De speler leest op elke muur precies wat hij gekregen heeft, en het gat. Niets wordt verklapt. De
wizard-muur is de eerste plek waar de hele regel staat, en dat is het eind van het spel. Elke muur zelf verandert nooit;
ze zijn alleen verschillend lang. Een speler die een gift oversloeg, ziet dat teken op de volgende muur als vorm (40%),
zoals elk teken dat hij niet heeft. Geen faalstaat.

Afgeleid, niet vier keer overgetypt. In de story-mod één tabel:

```ts
// src/mods/story/game/reading/formula.ts
export const FORMULA = [
  { wall: "junior", giver: "tomb.starter", sign: "o1" },
  { wall: "expert", giver: "tomb.junior", sign: "o2" },
  { wall: "master", giver: "tomb.expert", sign: "o3" },
  { wall: "wizard", giver: "tomb.master", sign: "o4" },
] as const
```

`formulaWall(i)` bouwt de muur van rij _i_:

| Veld      | Waarde                                   |
| --------- | ---------------------------------------- |
| `at`      | `{ levelNr: 2, floor: 1 }`               |
| `cut`     | de tekens van rij 0 … *i*−1, dan `""`    |
| `wrongAt` | _i_                                      |
| `answer`  | het teken van rij _i_                    |
| `missing` | `true`                                   |
| `copy`    | `story.formula`                          |
| `hint`    | `formula.<wall>.hint` (nieuw veld, §5.1) |
| `after`   | `reading.<wall>`                         |
| `panel`   | `formulaPanel` (§3.3)                    |

- **Gat (`missing`), geen miscut** (V3). Een miscut vraagt "welk teken was het", met de tray als antwoordruimte. Een gat
  vraagt "heb je het". Dat is precies de vraag: de geest heeft het je net gegeven. Het `Wall.missing`-comment (#387
  `walls.ts:17-23`) beschrijft dit onderscheid al.
- Zonder het teken: de muur staat er, Fez geeft de hint, `cannot`-tekst, terug kan altijd. Geen faalstaat.
- **Geen content-tests.** De generieke checks in `walls.spec.ts` dekken de nieuwe muren: tekens bestaan in de
  catalogus, `wrongAt` binnen de regel, een gat is leeg. Nieuw, generiek: elk antwoord van een formulemuur is een
  gift-teken van de tier van die muur (§5.2). De tests die nu Henuts inhoud pinnen gaan naar een verzonnen muur.

### 3.3 Paneel en art

- Henuts `namePanel` is een **staande cartouche**. Een cartouche omsluit een naam, niet een zin. Dus **nieuwe art**.
- Eén gedeeld paneel `formulaPanel` voor alle vier de tiers (mechanic art is gedeeld; een tier-variant kan later via de
  tileset). Een liggende stele met één horizontaal register, `flow: "row"`, geen `frame`. Het register heeft plaats
  voor vier tekens; een kortere muur (§3.2 C) laat de rest van het register als onleesbaar geschilderd schrift, niet
  als tekens.
- Twee plekken voor dezelfde master, zoals `namePanel`:
  1. wandtegel: `"formulaPanel"` aan `WALL_DECORATION_KINDS` (`src/game/siteTypes.ts`), placeholder via
     `scripts/generateDummyTiles.ts`;
  2. leesachtergrond: `yarn import-reading art/masters/props/<tier>/formulaPanel.webp --name=formulaPanel`
     (#387 `scripts/importReading.ts`), en daarna `panel.art`, `aspect` en `signs` uit het schilderij.
- **Tot het geschilderd is:** `panel` zonder `art`. #387 `WallPanel` tekent dan altijd een liggende cartouche, en dat is
  fout voor een zin. Uniforme regel: **het touw wordt alleen getekend als `frame` gezet is**. Zonder `frame` komt er een
  kale stele. De Sphinx heeft `frame: 0` en verandert niet.
- **Repaint-queue:** een entry `formulaPanel` in `docs/instructions/repaint-queue.md`, naast `sphinx/namePanel` (#387),
  met `art/masters/props/junior/namePanel.webp` als bijlage voor steen, rand en verf. De import-regel komt in
  `art/rebuild.sh`. Een regel in `docs/game-design/tile-art-brief.md` (wat het ís) en `docs/instructions/art-tasks.md`.

### 3.4 Tekst bij de muur

Eén gedeelde prefix `story.formula` voor alle vier (`wrong`, `fixed`, `pick`, `cannot`, `gap`), want de muur werkt
overal hetzelfde (V8). Wat elke regel moet doen; de designer schrijft de tekst:

- `wrong`: een regel tekst met één vak leeg.
- `fixed`: de regel is weer heel (kort; de beat neemt het over).
- `pick`: zet het teken dat je kreeg in de lege plek.
- `cannot`: je hebt het teken dat hier hoort nog niet. Algemeen: wie het heeft zegt Fez (§5.1), want deze tekst is
  gedeeld en kan geen geest noemen.
- `gap`: de aria-naam van het gat ("The missing sign").

Zonder `frame` is er geen cartouche om mee te tellen, dus "het eerste teken" klopt hier gewoon (anders dan bij Henut,
#387).

---

## 4. De kamer en waar ze vastgepind wordt

### 4.1 De `.room`-bestanden

Namen zijn wereldwijd uniek en de `tier`-header moet gelijk zijn aan de map (`docs/instructions/room-prefabs.md`).
Dus vier bestanden met **één tekening**:

- `src/game/rooms/junior/formulaWallJunior.room`
- `src/game/rooms/expert/formulaWallExpert.room` (de **eerste** expert-prefab; de map bestaat nog niet)
- `src/game/rooms/master/formulaWallMaster.room` (idem)
- `src/game/rooms/wizard/formulaWallWizard.room` (idem)

Voorstel, zonder `activity` (expert, master en wizard hebben geen activiteiten, `src/game/activities.ts`; uniform dus
ook niet bij junior):

```
// designed by: Claude
// <tier>. The tomb's formula: the list of things given away on a stela on the north wall, an offering table before it, a lamp either side, the stop facing it.
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

`reading` heeft geen `actor` (`src/mods/story/game/reading/meta.ts`), dus de kamer hoeft niet "fit" te zijn. Controleer
met `yarn room formulaWallJunior` (enz.). `lamp`, `offeringTable` en `sconce` hebben tegels in `src/assets/tiles/junior/`,
`expert/` en `default/`; master en wizard vallen terug op `default` (tier → default). Geen placeholder nodig (V6).

### 4.2 Waar vastgepind

Uniforme regel: **verdieping 1 (de tweede) van de graf-site (`levelNr` 2) van `<tier>_treasure_tomb`, als
één-na-laatste kamer; `pathPuzzles` van die verdieping +1.** Verdieping 1 komt na de geest op verdieping 0. Dezelfde
plaatsingsregels als elke verhaalkamer: nooit vóór een tableau, nooit de laatste kamer (de krokodil)
(`docs/game-design/story/IMPLEMENTATION.md`, "Two placement rules"; `placement.spec.ts`).

| Graf                   | Spec (`floors[1]`)                | wordt                                                                                                                                              |
| ---------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `junior_treasure_tomb` | `src/worldGen/spec/junior.ts:254` | `pathPuzzles: TOMB_ROOMS_PER_FLOOR.junior + 3`, node `{ where: TOMB_ROOMS_PER_FLOOR.junior + 2, encounter: "reading", room: "formulaWallJunior" }` |
| `expert_treasure_tomb` | `src/worldGen/spec/expert.ts:222` | idem met `expert`                                                                                                                                  |
| `master_treasure_tomb` | `src/worldGen/spec/master.ts:203` | idem met `master`                                                                                                                                  |
| `wizard_treasure_tomb` | `src/worldGen/spec/wizard.ts:187` | idem met `wizard`                                                                                                                                  |

Junior verdieping 1 wordt: tableau, expert-puzzel, tableau, tableau, **muur**, krokodil.

Wat dat aan de wereld doet: verdieping 1 van vier graven wordt opnieuw uitgehakt. Een leeskamer draagt geen beloning
(`READING_META.rewardPriority: 0`), dus de loot verschuift niet. Junior, expert, master en wizard zijn niet uitgebracht;
`src/data/juniorCarve.json` bestaat nog niet (`yarn junior-freeze` slaat over), dus de kamer moet erin vóór junior wordt
vastgelegd. `src/data/tierFingerprints.json` neemt junior t/m wizard opnieuw op, als bewuste daad
(`docs/game-design/world-spec-stability.md`).

Alleen het eerste graf van een tier, niet `_b` of `_c`: één regel per tier, één beat (V4).

### 4.3 Dev-sprong

`src/mods/story/game/storyRooms.ts:15-22`: vier entries "Jump: formula (junior/expert/master/wizard)" met `levelNr: 2,
floor: 1`. Henuts entry krijgt `levelNr: 2, floor: 0`, anders vindt `findEncounterRoom` toevallig de eerste. De dev-grant
"All hieroglyphs" (`src/mods/hieroglyph/app/index.ts:79-93`) loopt over `HIEROGLYPH_REQUIRED` en mist dus de gaven:
die tabel uitbreiden met de gift-tabel, zodat een sprong naar een muur ook te herstellen is.

---

## 5. Hint, gift en save

### 5.1 Fez bij de lege muur

- `Wall` krijgt een optioneel veld `hint?: string`: een conversatie die speelt als de speler de muur opent zonder het
  teken (`!canRepair`). Henut en de Sphinx hebben er geen; ze hebben het niet nodig. Elke formulemuur heeft er een.
- Speelt als `showConversation(wall.hint, undefined, { story: true, forceReplay: true })`. **Elke keer**, zolang het
  teken ontbreekt (V7): het is één regel, en het is het enige dat zegt naar wie je terug moet (`cannot` is gedeeld en
  noemt niemand). Zo werken de revisit-regels van de geesten ook: dezelfde wijzer bij elk bezoek.
- Geen kaartmarkering: de hint is de enige wegwijzer (besluit).
- De eerste keer dat de hint speelt, schrijft `FezCompanion` hem als gehoord in `conversations`
  (`src/app/fez/FezCompanion.tsx:49-53`, ook bij overslaan). **Dat is het bewijs dat de speler de muur zag**, en dat is de
  poort van de gift (§5.2). Geen nieuwe opslag.

### 5.2 De geest geeft

Hoe terugbezoeken nu werken: `src/mods/story/game/conversation/revisits.ts`. `REVISITS` is per scène een lijst
toestanden, laatste eerst; de eerste waarvan `after` gehoord is wint. `sceneOnVisit(scene, heard)` speelt de hele scène
tot hij gehoord is, daarna één regel uit die toestand. `ConversationComponent`
(`src/mods/story/app/conversation/plugin.tsx:27-50`) roept `sceneOnVisit` aan; `conversationOpensAt`
(`arrivals.ts:8-14`) opent de kamer bij binnenkomst alleen als de scène nog niet gehoord is, anders staat de regel achter
de prompt.

Toevoeging, in dezelfde module:

```ts
/** The gift a ghost owes on this visit: its wall has been seen, the gift not yet heard. */
export const giftDue = (scene: string, heard: Readonly<Record<string, boolean>>) =>
  FORMULA.find(
    f => f.giver === scene && heard[scene] && heard[`formula.${f.wall}.hint`] && !heard[`formula.${f.wall}.gift`]
  )
```

- `sceneOnVisit`: ongehoorde scène → de scène; daarna **gift verschuldigd → `formula.<wall>.gift`**; anders de
  revisit-regel. De gift wint van elke revisit-toestand, voor elke geest. Geen uitzondering per geest (V9).
- `conversationOpensAt`: een kamer opent ook bij binnenkomst als er een gift verschuldigd is. De speler kwam ervoor
  terug; een prompt waar hij langs kan lopen zou dat verbergen.
- Na de gift is `formula.<wall>.gift` gehoord en valt de geest terug op zijn gewone revisit-regels.
- `formula.<wall>.gift` is een korte scène (de geest, eventueel een reactie van Fez of de verkenner), geen regel van
  één zin. Revisit-regels zijn van de geest alleen omdat Fez vóór de ontmoeting niets mag zeggen
  (`revisits.ts:9-10`); bij een gift is Fez allang ontmoet.

De gift-tabel in de hieroglyph-mod (`src/mods/hieroglyph/game/hieroglyphData.ts`):

```ts
// Signs a ghost gives away whole, on a revisit: never placed in the world, so never in HIEROGLYPH_REQUIRED.
export const GIVEN_SIGNS: Record<string, Tier> = { o1: "junior", o2: "expert", o3: "master", o4: "wizard" }
```

De tier is die van de muur: daar wordt het teken iets waard. Gebruikt door:

- `useHieroglyphProgress` (`src/mods/hieroglyph/app/useHieroglyphProgress.ts`): de vereiste-aantallen zijn nu
  `hieroglyphRequired` uit de bake. Voor `completedHieroglyphKeys` en `hieroglyphProgress` wordt dat
  `{ ...hieroglyphRequired, ...<elke gift: 1> }`. Zonder dat valt een gift op de standaard 2 en wordt hij nooit compleet.
- `getItemFirstLevel` als derde terugval (§1.3) en de dev-grant (§4.3).
- Twee generieke tests: een gift staat nooit in `HIEROGLYPH_REQUIRED` (dus nooit in de bake), en één stuk maakt hem
  compleet.

### 5.3 Het teken in de inventaris: bestaand mechanisme

Er bestaat een weg, zonder core-wijziging: elke family-component krijgt `applyReward` als prop
(`src/app/families/familyRegistry.ts:104`). Dat is `useApplyReward` (`src/app/SiteMap/applyReward.ts`): de core-handler
plus het effect dat een mod voor dat beloningstype registreerde. De hieroglyph-mod registreert
`hieroglyphFragment` → `addFragment` (`src/mods/hieroglyph/app/index.ts:35-47`). De winkel doet het al zo
(`src/mods/shop/app/fezShop/plugin.tsx:75`).

Dus: `ConversationComponent` neemt `applyReward` uit de props, en als `sceneOnVisit` een gift kiest:

```ts
applyReward({ type: "hieroglyphFragment", hieroglyphId: gift.sign, pieceIndex: 0 })
```

- **Vóór** de scène speelt, niet erna. `addFragment` is idempotent; sluit de speler de app midden in de gift, dan heeft
  hij het teken al en speelt de gift bij het volgende bezoek nog eens (en voegt niets toe). Omgekeerd ("gehoord maar
  niet ontvangen") kan dan niet bestaan.
- De story-mod importeert de hieroglyph-mod hiervoor niet; hij noemt alleen het beloningstype, zoals de muren
  hieroglyph-ids noemen. Hieroglyph uit: de gift speelt, er gebeurt niets (de muur is dan ook niet te lezen). Story uit:
  geen conversatie- en leesplugin, de kamers zijn doorloop (bestaand).
- Na de scène het bestaande beloningsscherm, met de kop "Je kreeg:" in plaats van "Je vond:" (V5): een gift, geen vondst.

### 5.4 Save

Geen opgeslagen vorm verandert:

- `conversations` (`Record<string, boolean>`): nieuwe sleutels `formula.<wall>.hint`, `formula.<wall>.gift`,
  `reading.wizard`.
- hieroglyph-modstate `collectedFragments: string[]`: nieuwe waarden `o1:0` … `o4:0`, dezelfde vorm als elk fragment.
- `EXPECTED_HIEROGLYPH_FRAGMENTS` en de fragmentteller blijven gelijk (gaven zijn geen wereldfragmenten).

Een double-write met backfill is dus niet nodig. Een bestaande save heeft geen van de nieuwe sleutels, en dat is precies
de beginstand.

### 5.5 De bestaande open copy

- `revisit.junior.wall1` ("The wall. Third sign." / nl "Het derde teken") gaat scheef met #382: Henuts juiste teken
  wordt Hathor (`d15`), en #387 laat het paneel de cartouche als eerste teken tellen, zodat het foute teken als tweede
  leest (`story.wall` is daar al op aangepast). De designer past `wall1` aan; `wall2` ("that goose") klopt nog, `a7`
  blijft het foute teken.
- `reading.junior/expert/master` (`public/locales/*/fez.json:727`) noemen water als tweede en kleren als derde; dat
  wordt linnen en water (§7).
- `revisit.*` van de vier gevers: blijven, de gift gaat ervoor (§5.2).

---

## 6. Starter blijft byte-identiek

Ipi's gift is nieuw gedrag in het starter-graf. Dat mag:

- spelers konden het nog niet bereiken en dus niet missen: hij speelt pas als `formula.junior.hint` gehoord is, en dat kan
  alleen in het junior-graf;
- het raakt hun save niet tot dan (§5.4).

Het model raakt geen enkel starter-gegeven: geen wijziging in `src/worldGen/spec/starter.ts`, geen kamer, geen loot. De
gift speelt in de conversatiekamer die er al staat. Dus ongewijzigd: `src/data/starterCarve.json` (`yarn starter-freeze`),
`src/data/releasedLoot.json`, de starter-hash in `src/data/tierFingerprints.json`. Elke slice die bakt checkt dat: is
starter rood, dan is dat de fout; zoek de oorzaak en neem niets opnieuw op.

---

## 7. Nieuwe tekst per tier (placeholders, de designer schrijft)

Alles in `public/locales/{en,nl}/fez.json`, in de bestaande vorm `<scene>.<n>.<speaker>`.

| Sleutel                  | Wie                      | Bedoeling                                                                                                                        |
| ------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `formula.junior.hint`    | Fez                      | het vak bij de muur vraagt brood; wie telde veertig jaar graanzakken? Terug naar Ipi                                             |
| `formula.junior.gift`    | Ipi (+ Fez/verkenner)    | Ipi geeft het brood, met tegenzin; dat hij íets weggeeft is de grap. Hij wil het misschien opgeschreven zien                     |
| `formula.expert.hint`    | Fez                      | het vak vraagt kleren/linnen; Henut en haar kleedkamer                                                                           |
| `formula.expert.gift`    | Henut (+ …)              | Henut geeft linnen; het beste dat te koop was, door haar gekozen                                                                 |
| `formula.master.hint`    | Fez                      | het vak vraagt water; de priester die plengoffers bracht                                                                         |
| `formula.master.gift`    | priester (+ …)           | de priester geeft water, zoals een plengoffer: gebracht, neergezet, uitgesproken                                                 |
| `formula.wizard.hint`    | Fez                      | het vak vraagt een boot; de farao en zijn bark                                                                                   |
| `formula.wizard.gift`    | farao (+ …)              | de farao geeft zijn boot; de man die alles meenam                                                                                |
| `reading.junior.1`       | verkenner                | nu: "There is a line here I can read now." Bij een actieve muur heeft de speler net één teken gezet: "Now I can read it."        |
| `reading.junior.4`       | verkenner                | nu: "It is in the last one too." Wordt: het brood kwam uit Ipi's graf; van alle mensen gaf híj het                               |
| `reading.expert.1`, `.2` | verkenner, Fez           | nu water als tweede; wordt kleren/linnen: "Bread, and now clothes"                                                               |
| `reading.expert.3`       | verkenner                | "the same two lines": klopt (twee tekens op de muur)                                                                             |
| `reading.master.1`, `.2` | verkenner, Fez           | nu kleren als derde; wordt water. "It is a list of things given away" kan hier blijven of naar wizard                            |
| `reading.master.3`       | verkenner                | "In the tomb of a man who took everything with him": het master-graf is van de farao; klopt nog, en wijst vooruit naar zijn gift |
| `reading.wizard.*`       | verkenner, Fez           | **nieuw.** De hele regel, voor het eerst: de vier gaven, en wie ze gaf. Het eind van de formule                                  |
| `story.formula.*`        | (muurtekst, common.json) | §3.4                                                                                                                             |

Optioneel: per gever één revisit-regel na de gift (`revisit.<tier>.gave1`, toestand `after: "formula.<wall>.gift"`),
bijvoorbeeld Ipi die het brood terug wil (V10).

---

## 8. Docs om bij te werken (in de slice die het waar maakt)

| Doc                                                                                                          | Wat                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/game-design/story/main-path.md:195-203`                                                                | de catalogus heeft zes groepen (de vier, Gaven, Signs); de formule staat als muur per tier, de tekens komen van de geesten; "The wall never changes" geldt per muur. **De finale blijft Fez' naam** |
| `main-path.md:223-241` (alternatief A)                                                                       | blijft een overwogen alternatief voor het **einde**. Eén zin erbij: de formule staat als muur in het spel, het einde is de naam                                                                     |
| `docs/game-design/story/IMPLEMENTATION.md:227-235`                                                           | "one entry per journey" → per plek (`at`); het formulegat, de hint, de gift, het gedeelde paneel                                                                                                    |
| `IMPLEMENTATION.md:261-267` ("What is left")                                                                 | rij `reading.junior/expert/master` eruit zodra de kamers staan                                                                                                                                      |
| `script-act-2.md:133-134`, `script-act-3.md`, `script-act-4.md`, `script-act-5.md`                           | trigger: speelt als de formulemuur in het graf hersteld is; de gift-scènes per act; `reading.wizard` in act 5                                                                                       |
| `docs/review/junior/story-beats.md:336-344` (§2.2)                                                           | status van `reading.junior`                                                                                                                                                                         |
| `src/mods/hieroglyph/game/hieroglyphData.ts`, `itemLevelLookup.ts`                                           | comments: gaven naast hele tekens en fragmenten                                                                                                                                                     |
| `docs/instructions/repaint-queue.md`, `docs/game-design/tile-art-brief.md`, `docs/instructions/art-tasks.md` | `formulaPanel` (§3.3)                                                                                                                                                                               |
| `CHANGELOG.md`                                                                                               | geen entry: junior en hoger zijn niet uitgebracht, en Ipi's gift speelt pas met junior                                                                                                              |

---

## 9. Slices

Voorwaarde: #382 en #387 gemerged.

| #   | Slice                                                                                                                                                                                                                                                                                             | Grootte | Bake? |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----- |
| 1   | **Muur per plek + kale stele + hint.** `Wall.at`, `wallFor(journeyId, levelNr, floor)`, plugin leest de verdieping, wereld↔muren-guard, touw alleen bij `frame`, `Wall.hint`, Henut/Sphinx krijgen `at`, content-pins in `walls.spec.ts` naar een verzonnen muur. Eventueel V7b (herstel blijft). | S       | nee   |
| 2   | **De gaven.** Catalogus `egyptianOfferings`, groep, `en`/`nl`, `yarn generate-font`, `GIVEN_SIGNS`, vereisten in `useHieroglyphProgress`, tegel-tier, dev-grant, unieke-namen-test.                                                                                                               | S       | nee   |
| 3   | **De gift.** `FORMULA`, `giftDue` in `sceneOnVisit` en `conversationOpensAt`, `applyReward` in `ConversationComponent`, placeholders `formula.<tier>.hint/gift` en/nl.                                                                                                                            | S       | nee   |
| 4   | **De formulekamers.** Vier `.room`-bestanden, `formulaPanel` wandsoort + placeholder, nodes in vier graven, `formulaWall(i)` in `WALLS`, `story.formula.*` en `reading.wizard` (designer-tekst of duidelijke placeholder), dev-sprongen, bake, fingerprints junior t/m wizard, docs §8.           | M       | ja    |
| 5   | **Art.** `formulaPanel` op de repaint-queue; de gebruiker schildert (`yarn repaint`), Claude importeert en zet `panel.art/aspect/signs`.                                                                                                                                                          | S       | nee   |

Slices 1–3 kunnen samen in één PR (geen bake, samen ±1 dag). Slice 4 bakt één keer; daarna `yarn verify` en
`yarn verify-content`, de starter-guards van §6, en in een schone worktree `gh pr checks` per job.

---

## 10. Besluiten (designer, 2026-11-11)

| #   | Vraag                                                                                                             | Besluit                                                                                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | De boot: `art10` kan niet (de speler heeft hem al, §1.1). Welk teken wordt `o4`? En `art10` zelf tekent een hand. | **`o4` = P1 𓊛**, de gewone boot: het woord in de formule is een veerboot "voor wie er geen had", en hij staat al in het font. `art10` apart herstellen naar P3 𓊞 (de heilige bark die hij zegt te zijn); raakt de bake niet. Dan zijn de twee boten verschillend en allebei juist.                                                        |
| V2  | Wat toont elke muur: alleen het eigen woord (A), overal de hele regel (B), of de gaven tot nu toe (C)?            | **C.** Niets wordt verklapt, de lijst groeit zichtbaar, en de wizard-muur is de eerste plek met de hele regel (§3.2).                                                                                                                                                                                                                     |
| V3  | Gat (`missing`) of miscut?                                                                                        | **Gat.** De geest gaf je het teken net; de vraag is "heb je het", niet "welk".                                                                                                                                                                                                                                                            |
| V4  | Ook een formulemuur in `_b`/`_c`-graven?                                                                          | **Nee.** Eén regel per tier, één beat. Wizard: `wizard_treasure_tomb`, door dezelfde regel.                                                                                                                                                                                                                                               |
| V5  | Popup bij de gift, of alleen de scène?                                                                            | **Beloningsscherm met de kop "Je kreeg:".** Een gift, geen vondst.                                                                                                                                                                                                                                                                        |
| V6  | Expert/master/wizard: de eerste prefab-kamers van die tiers. Mogen ze al vóór de art-ronde?                       | **Ja.** Dezelfde props als junior; master en wizard vallen terug op de `default`-tegels (§4.1).                                                                                                                                                                                                                                           |
| V7  | Hint: één keer of bij elk bezoek zolang het teken ontbreekt?                                                      | **Elk bezoek.** Eén regel, en de enige wegwijzer (geen kaartmarkering, gedeelde `cannot`).                                                                                                                                                                                                                                                |
| V7b | Blijft een herstelde muur hersteld?                                                                               | **Ja, voor alle muren tegelijk, en zonder nieuwe opslag:** een muur waarvan `after` gehoord is, staat hersteld (Henut `tomb.juniorFixed`, Sphinx `reading.sphinx`, formule `reading.<tier>`). Nu belangrijker: de speler houdt het teken, dus een kapotte muur bij een tweede bezoek nodigt uit tot opnieuw doen. Klein, past in slice 1. |
| V8  | Tekst: één gedeelde `story.formula.*` voor vier muren?                                                            | **Ja.** De muur werkt overal hetzelfde; wat per muur verschilt (wie) zegt Fez in de hint.                                                                                                                                                                                                                                                 |
| V9  | Gift vóór de eigen vraag van een geest? (Henut kan linnen geven terwijl haar naammuur nog fout is)                | **Ja, de gift wint altijd.** Eén regel; haar gift-scène kan erover mopperen.                                                                                                                                                                                                                                                              |
| V10 | Een revisit-regel per gever na de gift?                                                                           | **Ja, optioneel per geest, dezelfde vorm** (`after: "formula.<wall>.gift"`). Ipi die het brood terug wil is te goed om te laten liggen.                                                                                                                                                                                                   |
| V11 | Brood: X1 𓏏 of X2 𓏐?                                                                                              | **X2.** Het determinatief "brood"; X1 leest als een halve boog en is in de praktijk de klank _t_.                                                                                                                                                                                                                                         |
| V12 | Tier op de tegel van een gift: die van de muur of die van de gever?                                               | **Van de muur.** Daar wordt het teken bruikbaar, en daar haalt de speler het.                                                                                                                                                                                                                                                             |
