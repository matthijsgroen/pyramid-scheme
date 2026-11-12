# Save als QR-afbeelding — onderzoek

Gemeten op origin/main (f10a7e85), 2026-11-12. Alleen onderzoek, geen code in de repo.

## Kort

- **Vers**: past ruim (425 B gedeflate → QR v15-L / v17-M).
- **Starter af**: past **niet** als hele JSON gedeflate (3,7 kB > 2953). Past **wel** na trimmen (2,1 kB) of trimmen + compacte vorm (1,7 kB → v34-M).
- **Zwaar laatspel (alles verkend)**: past **niet** in één QR, ook getrimd niet (10,7–14,5 kB). Wel in **4 (L) à 5 (M) codes in één afbeelding**.
- Groei: na junior is ook de getrimde save ~4 kB. Eén QR houdt het dus alleen tot ongeveer starter/vroege junior. Multi-QR in één afbeelding is nodig voor de rest, geen randgeval.

## 1. Saves en grootte

Hoe de saves gemaakt zijn:

- (a) **vers**: echte IndexedDB-dump uit `yarn dev` (headless Chromium, eigen poort).
- (u) **"Unlock everything"**: echte dump. Deze grant raakt `journeys` niet; hij is dus *geen* realistische late save, alleen sleutels/hiërogliefen/aankopen.
- (b) **starter af** en (c) **zwaar**: `journeys` gebouwd door elke vloer van de gebakken wereld te assembleren (`assemblerFor`, zoals de runtime) en elke cel met adres als verkend te noteren. De mod-state komt uit (u). Camp, conversations en collectionSeen zijn synthetisch op realistische ids. Dit is een **bovengrens**: elke gang belopen.

Wereld: 29 journeys, 104 sites, 20.567 verkende cellen, waarvan 4.851 plaatsen (kamers/trappen/poorten) en de rest gangen (`~ordinal`).

Bytes (deflate = raw deflate niveau 9, pako; CompressionStream geeft +0–5 %, geen niveau-keuze):

| save | raw JSON | deflate | brotli (ter info) | BSON+deflate | msgpack+deflate | korte keys+deflate | getrimd raw | getrimd+deflate | compact (pack3)+deflate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| vers | 992 | 425 | 384 | 463 | 453 | 232 | 992 | 425 | 425 |
| unlock-everything | 4.470 | 1.377 | 962 | 2.063 | 1.448 | 1.154 | — | — | — |
| starter af | 20.850 | 3.737 | 3.268 | 6.032 | 4.059 | 3.378 | 11.222 | 2.077 | **1.663** |
| zwaar | 258.877 | 34.805 | 28.303 | 69.442 | 37.549 | 34.160 | 106.388 | 14.521 | **10.775** |

QR-capaciteit, byte mode: v40-L 2953, v40-M 2331 (Q 1663, H 1273). Met ~38 B envelop (zie §3): 1.663 → v30-L / v34-M; 2.077 → v34-L / v39-M.

Conclusies:
- **BSON helpt niet, het maakt het erger** (6,0 kB tegen 3,7 kB). Het neemt per veld type-bytes en lengtes op en deflate comprimeert die slechter. msgpack is gelijk aan of iets slechter dan JSON+deflate. **Keep JSON + deflate.**
- Korte keys winnen weinig (−10 %). Deflate vangt herhaalde keys al. De winst zit in **weglaten**, niet in hernoemen.
- Een preset-dictionary (pako `dictionary`) wint ~5 %. Niet de moeite waard (en CompressionStream kan het niet).

Per tier opgeteld, alleen `journeys` compact+deflate: starter 0,84 kB · +junior 2,5 · +expert 4,6 · +master 5,8 · +wizard 6,8 kB. De rest van de save (mod-state, conversations, camp, collectionSeen) weegt 0,8 kB (starter) tot 3,3 kB (alles).

Foto-leesbaarheid (gesimuleerd: schalen, 7° draaien, blur, JPEG 60, ruis; jsQR):
- v17 (500 B): leest overal, ook bij 6,5 px/module.
- v26–v33 (1–2 kB): betrouwbaar vanaf ~8 px/module. Daaronder wisselend.
- v40 (2,3–2,9 kB): pas betrouwbaar bij ~11 px/module (≥2000 px over de code). Bij 6,5 px/module faalt het al deels.
- zxing-wasm leest 2/4/6 v40-codes in één afbeelding, ook na verkleinen naar 2000 px breed + draaien + blur + JPEG.
- De simulatie mist perspectief, lensvervorming en moiré van een schermfoto. Praktijkrichtlijn: met de camera is tot ~v25 (~1 kB) comfortabel. v40 lukt alleen als de code het beeld vult en scherp is. **Een gedownloade afbeelding uploaden is verliesloos (100 %)**. Maak dat het hoofdpad en de foto best effort.

## 2. Wat afleidbaar is

Aandeel in zwaar (raw): `journeys` 246 kB = 95 %. Daarbinnen `exploredCells` 219 kB, waarvan **gangcellen (`~…`) 141 kB** en plaatsen 66 kB. Verder `floorExploration` 7,8 kB, `mechanismStates` 4,4 kB, `known/foundHiddenCorridors` 2 × 2,0 kB. Buiten journeys: collectionSeen 4,5 kB, hieroglyph 2,4 kB, camp 2,1 kB, conversations 1,7 kB, tomb-treasure 1,3 kB.

| key | afleidbaar? | actie |
|---|---|---|
| `exploredCells` gangen `~ordinal` | **ja**: `applyExplored` herstelt gangen via het hoogwatermerk van de verste kamer per sectie (zie de doc in useAssembledFloor.ts) | weglaten. Grootste winst. *Te verifiëren door te kijken*: een gang voorbij de laatste kamer, bijv. een dood eind, blijft mist. |
| `exploredCells` plaatsen | nee (loot = alleen dit) | houden |
| `floorExploration` | ja, herberekend bij bezoek. `floorExplorationVersion: 0` laat de bestaande rederive-backfill draaien | weglaten. Kost: een assemble per vloer bij de eerste load. |
| `knownHiddenCorridors` | ja, opnieuw geregistreerd bij het bekijken van een vloer | weglaten |
| `foundHiddenCorridors`, `mechanismStates`, `sequenceReads`, `purchasedStock` | nee | houden |
| `standingKey`, `pyramidPositions`, `positionKey` | deels: zonder valt de speler terug op de ingang | optioneel weglaten |
| `puzzleState`, `levelAnswers` | nee, maar het is één bord in uitvoering | weglaten mag (je verliest een half bord) |
| velden met defaultwaarde (`[]`, `{}`, `null`, versiestempels) | ja | weglaten |
| `hieroglyph.collectedFragments` (`"p10:0","p10:1"…`) | nee | kan als bitset/telling per glyph. Kleine winst. |

"Compact (pack3)" = de getrimde vorm, met plaatsen per vloer samengevoegd in één string (`"0/p0 p1 xkey-gate;1/…"`) en `stair:<journeyId>:` ingekort. Starter af 1,66 kB, zwaar 10,8 kB.

Verder kan het alleen met een **wereld-gebonden bitset**: een canonieke lijst van alle 4.851 plaatsen, één bit per plaats. Dat brengt zwaar naar schatting naar ~3–4 kB (2 codes). Nadelen: de lijst moet in de build zitten (live afleiden = alle vloeren carven, 33 s in node). De code werkt dan alleen tussen gelijke wereldversies. Elke reshape verandert de lijst. Advies: niet doen zolang multi-QR kan.

**Multi-QR in één afbeelding** (fallback, en vanaf junior de norm):
- Rooster van N v40-codes in één PNG (2×2 = 2220 px bij 6 px/module). Elke code krijgt een kop `magic | transferId(4) | i/n`.
- Gedownloade afbeelding: de vaste roosterposities knippen en elke tegel met jsQR lezen. 4/4 en 6/6 gemeten.
- Foto: jsQR vindt maar één code per beeld. Voor meerdere codes in een foto is zxing-wasm nodig (`maxNumberOfSymbols`) of native `BarcodeDetector`. Die laatste zit in Chrome/Android, **niet in iOS Safari**.
- QR "Structured Append" kan `qrcode` niet schrijven. Een eigen kop is eenvoudiger.
- Zwaar = 4 codes (L) of 5 (M). Alles in één afbeelding is prima als bestand, maar groot voor een foto. Daarvoor eventueel codes één voor één tonen ("code 2 van 5").

## 3. Tijdstempel / verlopen

Voorstel:
- Payload: `magic "PS" | formaat 1 B | tijdstempel ms 6 B | IV 12 B | AES-GCM(deflate(JSON)) | tag 16 B`. Ongeveer 38 B overhead.
- Import weigert codes **ouder dan 15 min**. Codes tot 5 min "in de toekomst" accepteren: klokverschil tussen apparaten. Block-sorting weigert `age < 0` hard en breekt daardoor bij een scheve klok.
- De tijdstempel staat in de geauthenticeerde data. Wie hem verandert, breekt de tag.
- `saveEpoch` moet gelijk zijn. `storageVersions` ≤ de huidige accepteren: de bestaande migraties en backfills draaien na `writeGameData` + reload (alpha-als-productie). Geen harde app-versie-gelijkheid zoals block-sorting: PWA's updaten niet tegelijk.

Eerlijk over de beveiliging:
- **Block-sorting**: de sleutel komt uit de tijdstempel, en die staat leesbaar in de payload. Dat is pure verhulling: iedereen met de JS ontsleutelt het. PBKDF2 met 100k iteraties kost alleen tijd.
- **AES-GCM of HMAC met een app-constante**: zelfde grens. De constante zit in de bundel. Het houdt een leek tegen die bytes of de datum wil wijzigen (**tamper-evident voor niet-programmeurs**), maar niemand die de bundel leest. Die kan een verlopen code opnieuw stempelen.
- **Is dat genoeg?** Voor dit doel ja. De save bevat geen geheimen, dus geheimhouding is niet nodig. Het risico is een oud plaatje dat rondgaat en dat iemand zelf importeert. Een import is altijd een eigen handeling van de speler, met een bevestiging. Het verloopvenster maakt rondzwervende plaatjes waardeloos voor gewone spelers. Een kwaadwillende die de bundel leest, kan alleen zijn eigen save overschrijven.
- **Apparaatbinding**: offline kan een code niet aan een apparaat gebonden worden, want er is geen gedeeld geheim en geen server. Wel mogelijk zonder netwerk: een **koppelcode**. Het doelapparaat toont een korte nonce (bijv. 4 tekens) die je op de bron intikt. Die gaat mee in de geauthenticeerde data en alleen dat importvenster accepteert de code. Dat bindt aan een importsessie, niet aan een apparaat. Het is extra frictie en net zo omzeilbaar door wie de bundel leest. Optioneel.

## 4. Afhankelijkheden (gemeten: esbuild minified / gzip -9)

| pakket | min | gzip | opmerking |
|---|---:|---:|---|
| `qrcode` 1.5.4 | 24,8 kB | 9,6 kB | schrijven, byte mode, ok |
| `jsqr-es6` 1.4.0-1 | 44,1 kB | 9,8 kB | lezen, één code per beeld |
| `jsqr` 1.4.0 | 131 kB | 47 kB | zelfde lezer, zwaardere build: neem de es6-versie |
| `zxing-wasm/reader` 3.1.6 | ~947 kB wasm | — | alleen nodig om meerdere codes in een *foto* te lezen. Lazy laden. |
| `BarcodeDetector` | 0 | 0 | native in Chrome/Android/macOS, niet in iOS Safari: hooguit als versneller |
| `pako` 3.0.3 | 42,4 kB | 12,9 kB | **niet nodig**: `CompressionStream("deflate-raw")` (Chrome 103+, Safari 16.4+, Firefox 113+) |
| `fflate` | 8,2 kB | 4,1 kB | alleen als CompressionStream ontbreekt (oudere iOS) |
| `bson` | 76,6 kB | 22,7 kB | **niet nemen**: groter én slechter comprimeerbaar |
| crypto | 0 | 0 | WebCrypto AES-GCM, ingebouwd |

Minimale set: `qrcode` + `jsqr-es6` ≈ 19 kB gzip, lazy in het transferscherm. Daarbovenop eventueel zxing-wasm (~1 MB, lazy) voor een foto van meerdere codes.

## Aanbevolen ontwerp

1. Export: `readGameData` → trimmen (gangcellen, floorExploration, knownHiddenCorridors, puzzleState/levelAnswers, defaults weg) → JSON → `CompressionStream deflate-raw` → AES-GCM met app-constante, tijdstempel als AAD → splitsen in ≤2.900 B-stukken → N v40-L codes in één PNG-rooster. N = 1 tot ongeveer starter af.
2. Downloaden via `navigator.share({files})` met fallback `<a download>`. Bij een fullscreen-PWA op iOS werkt `download` slecht.
3. Import: `<input type=file accept="image/*">` (camera of fotorol) → tegels op roosterpositie knippen → jsQR. Faalt dat (foto), lazy zxing-wasm. Controleer de tag, het venster (15 min, −5 min scheefte) en saveEpoch. Bevestigen met een samenvatting (tier, aantal journeys) → `writeGameData` → reload. De backfills herleiden de rest.
4. Test: rondreis export → import → `readGameData` gelijk op alle niet-afleidbare velden. Daarna kijken of de kaart de mist hetzelfde herstelt (hoogwatermerk).

## Open vragen voor de designer

1. Is "afbeelding downloaden en uploaden" het hoofdpad en de foto best effort? Of moet een schermfoto van 4–5 codes ook werken? Dat kost ~1 MB zxing-wasm, lazy.
2. Mag een late save meerdere codes in één afbeelding worden (4–5)? Of liever de wereld-gebonden bitset, die alleen werkt tussen gelijke wereldversies?
3. Verloopvenster: 15 min goed? Block-sorting gebruikt 10.
4. Is verhulling plus tamper-evidence genoeg, of wil je de optionele koppelcode tegen rondzwervende plaatjes?
5. Mag een half opgelost bord (puzzleState/levelAnswers) verloren gaan bij een transfer?
6. Moet export/import naar instellingen voor gewone spelers? Nu zit SaveTransfer alleen in het dev-paneel.
