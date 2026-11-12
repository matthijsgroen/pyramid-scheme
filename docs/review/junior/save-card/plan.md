# Save-kaart — implementatieplan

> **Voor agents:** VERPLICHTE SUB-SKILL: superpowers:subagent-driven-development (aanbevolen) of superpowers:executing-plans. Stappen gebruiken checkboxen (`- [ ]`).

**Doel:** een speler zet zijn save over naar een ander apparaat via één PNG-"reiskaart" met QR-codes, onder een knop bij Instellingen, in elke build.

**Architectuur:** save → trimmen → JSON → deflate-raw → AES-GCM-envelop met tijdstempel → stukken van ≤ 2.900 B → N QR-codes (EC L) in een vast rooster op een gebrande kaart. De lezer gebruikt de kaart als referentiekader: frame zoeken, layout raden uit de beeldverhouding, modulecentra bemonsteren, schone code tekenen, jsQR. Writer en reader delen één layoutfunctie; er reist geen geometrie mee in het beeld.

**Tech:** TypeScript/React, `qrcode` (schrijven), `jsqr-es6` (lezen), allebei lazy geladen in het overzetscherm. `CompressionStream`/`DecompressionStream` ("deflate-raw") en WebCrypto zijn ingebouwd. Geen pako, geen bson.

**Spec:** [research.md](research.md) (groottes, wat afleidbaar is, envelop, deps) en [spike-findings.md](spike-findings.md) (robuustheid, layout, reader). Referentiecode van de spike: [spike/lib.mjs](spike/lib.mjs) (layout, kop), [spike/rectify.mjs](spike/rectify.mjs) (reader), [spike/card.mjs](spike/card.mjs) (tekenen). De goedgekeurde kaarten: [heavy-4L-card.png](heavy-4L-card.png), [starter-1L-card.png](starter-1L-card.png).

## Global Constraints

- Ontwerperbesluiten (2026-11-12): hoofdpad = afbeelding delen/downloaden en uploaden; foto is best effort (geen zxing-wasm). Grote save = meerdere codes op één kaart. Geldig **15 min**, tot **5 min in de toekomst** toegestaan. Half opgelost bord mag verloren gaan. Knop bij Instellingen, elke build. Kaart moet chat-apps overleven (verkleinen + JPEG).
- QR: byte mode, EC **L**, versie per stuk de kleinste die past, **nooit v23** (jsqr-es6 leest v23-L niet). Max stukgrootte 2.900 B.
- Kop per code: 4 B = `0x50` ('P') | transferId 2 B | `(i << 4) | n` (i = 0-based index, n = aantal, n ≤ 9).
- Envelop: `"PS"` | formaat `0x01` | tijdstempel ms 6 B big-endian | IV 12 B | AES-GCM-ciphertext + tag 16 B. Header (magic t/m IV) is AAD. Sleutel = app-constante (dit is tamper-evidence voor leken, geen geheimhouding; zo in een comment).
- Layout: staand, `ceil(√n)` kolommen, laatste rij gecentreerd; stille zone 4 modules per code; kop 24 % van de breedte, voet 9 %, rand 7 modules (inkt, goud, inkt). Codevlak `#fff8ea`, modules `#2b2118`. Decoratie alleen in kop/voet/rand. Native render met een geheel aantal px per module, lange zijde ~2.000 px.
- Kaartteksten (en + nl, andere talen vallen terug op Engels): titel "Pyramid Scheme", ondertitel "Reiskaart · neem je expeditie mee" / "Travel card · take your expedition along", voet "geldig tot HH:MM" / "valid until HH:MM" en "N codes" / "1 code". Lettertype Limelight, Fez-logo `src/assets/fez-logo.png`, steen `src/assets/masonry-stone.png`.
- De dev-tool `src/app/dev/SaveTransfer.tsx` (tekst, volledige save) blijft ongemoeid.
- Geen historische comments. Korte commitregels. Een regel in CHANGELOG `## Unreleased`.

## Review Focus

1. Kaart via een chat-app (verkleind naar 1280 px, JPEG q60): moet volledig lezen. → test in Task 3 (verkleinde rasterkaart) + kijkstap in Task 4.
2. Oude, toekomstige of aangepaste kaart: duidelijke weigering, save onaangeroerd. → tests in Task 1.
3. Willekeurige foto of screenshot zonder kaart: "geen reiskaart", geen crash. → test in Task 3.
4. Kaart van een nieuwere spelversie (hogere `storageVersions`) of andere `saveEpoch`: weigeren met "werk eerst het spel bij". → test in Task 2.
5. Na import: mist op de kaart hetzelfde als vóór export (gangen afgeleid uit kamers), ook bij een dood eind voorbij de laatste kamer. → kijkstap in Task 4.

---

### Task 1: Envelop en stukken

**Files:**

- Create: `src/app/saveCard/envelope.ts`, `src/app/saveCard/chunks.ts`
- Test: `src/app/saveCard/envelope.spec.ts`, `src/app/saveCard/chunks.spec.ts`

**Interfaces:**

- Produces:
  - `sealSave(json: string, now: number): Promise<Uint8Array>`
  - `openSave(bytes: Uint8Array, now: number): Promise<OpenResult>` met `type OpenResult = { ok: true; json: string; stampedAt: number } | { ok: false; reason: "notASave" | "tampered" | "expired" | "future" }`
  - `VALID_FOR_MS = 15 * 60_000`, `FUTURE_SKEW_MS = 5 * 60_000`
  - `splitChunks(payload: Uint8Array, transferId: number): Uint8Array[]` (elk ≤ 2.904 B incl. kop)
  - `joinChunks(chunks: Uint8Array[]): Uint8Array | undefined` (undefined bij ontbrekend stuk, gemengde transferIds of dubbele index)

- [ ] **Stap 1: tests schrijven**
  - `seals and opens a save within the window`: `openSave(await sealSave(j, t), t + 14 * 60_000)` → `{ ok: true, json: j, stampedAt: t }`.
  - `refuses a card older than fifteen minutes`: `now = t + 15 * 60_000 + 1` → `reason: "expired"`.
  - `accepts five minutes of clock skew, not more`: `t - 5 * 60_000` ok; `t - 5 * 60_000 - 1` → `"future"`.
  - `refuses a changed timestamp`: byte 3–8 aanpassen → `"tampered"`.
  - `refuses bytes that are not a card`: `new Uint8Array([1,2,3])` → `"notASave"`.
  - `splits and joins in any order`: 10.813 willekeurige bytes → 4 stukken, elk ≤ 2.904 B; `joinChunks(shuffled)` geeft het origineel terug.
  - `refuses a missing or foreign chunk`: één stuk weg → `undefined`; stuk met ander transferId → `undefined`.
- [ ] **Stap 2:** `yarn vitest run src/app/saveCard` → FAIL (module bestaat niet).
- [ ] **Stap 3:** implementeren. Deflate gebeurt in `sealSave` (`CompressionStream("deflate-raw")`) en inflate in `openSave`; vang inflate- en decrypt-fouten af als `"tampered"`.
- [ ] **Stap 4:** `yarn vitest run src/app/saveCard` → PASS.
- [ ] **Stap 5:** commit `save card envelope and chunks`.

### Task 2: Save trimmen en import toetsen

**Files:**

- Create: `src/app/saveCard/trimSave.ts`
- Modify: `src/app/state/useJourneys.ts` (exporteer `INITIAL_STORAGE_VERSIONS`)
- Test: `src/app/saveCard/trimSave.spec.ts`

**Interfaces:**

- Produces:
  - `trimSave(data: Record<string, unknown>): Record<string, unknown>`
  - `checkImport(data: Record<string, unknown>): { ok: true } | { ok: false; reason: "otherEpoch" | "newerGame" }`

Wat `trimSave` doet (per journey in `journeys`): gangcellen in `exploredCells` (`<verdieping>/~<n>`) worden per verdieping als reeksen bewaard (`0/~3`,`0/~4`,`0/~5` → `0/~3-5`) en `expandSave` zet ze bij import terug; `floorExploration` houdt alleen zijn sleutels (lege samenvattingen, `floorExplorationVersion: 0`, zodat de bestaande backfill elke verdieping herberekent); `knownHiddenCorridors` en top-level `puzzleState`/`levelAnswers` (bord in uitvoering) vallen weg. Al het andere blijft byte-gelijk.

`checkImport`: `data.saveEpoch !== SAVE_EPOCH` → `"otherEpoch"`; een waarde in `data.storageVersions` hoger dan in `INITIAL_STORAGE_VERSIONS` → `"newerGame"`.

- [ ] **Stap 1: tests** (gemaakte save, geen geschreven content):
  - `files a run of corridor cells as one range` / `gives back every walked cell once expanded`.
  - `asks the backfill to recompute floor summaries`: `floorExploration` weg, `floorExplorationVersion === 0`.
  - `keeps what play cannot derive`: `mechanismStates`, `foundHiddenCorridors`, `sequenceReads`, mod-state en `conversations` diepgelijk aan de invoer.
  - `drops the board in progress`: `puzzleState`, `levelAnswers` afwezig.
  - `refuses a save from another epoch` / `refuses a save from a newer game` / `accepts an older storage version`.
- [ ] **Stap 2:** run → FAIL. **Stap 3:** implementeren. **Stap 4:** run → PASS.
- [ ] **Stap 5:** commit `trim a save for the card`.

### Task 3: Layout, raster en lezer

**Files:**

- Create: `src/app/saveCard/cardLayout.ts`, `src/app/saveCard/rasterCodes.ts`, `src/app/saveCard/readCard.ts`
- Modify: `package.json` (`qrcode`, `@types/qrcode`, `jsqr-es6`)
- Test: `src/app/saveCard/readCard.spec.ts`

**Interfaces:**

- Produces:
  - `type CardLayout = { W: number; H: number; cells: { x: number; y: number }[]; size: number; header: Rect; footer: Rect }` in modules (zoals `layout()` in spike/lib.mjs).
  - `cardLayout(n: number, version: number): CardLayout`
  - `encodeChunks(chunks: Uint8Array[]): Promise<{ version: number; matrices: boolean[][][] }>` (lazy `import("qrcode")`, `QRCode.create(..., { errorCorrectionLevel: "L", version })`, één versie voor alle codes = kleinste die het grootste stuk draagt, v23 overgeslagen)
  - `rasterCodes(layout: CardLayout, matrices: boolean[][][], px: number): ImageData-achtig { width; height; data: Uint8ClampedArray }` — alleen rand-inkt + codevlakken, geen decoratie; Task 4 tekent daaroverheen.
  - `readCard(image: { width: number; height: number; data: Uint8ClampedArray }): Promise<Uint8Array[] | undefined>` (lazy `import("jsqr-es6")`)

Algoritme van `readCard` = spike/rectify.mjs: grijs maken → `findFrame` (eerste rij/kolom vanaf elke rand die > 50 % donker is) → voor n = 1…9, versie 1…40 (≠ 23): layouts waarvan H/W binnen ±1 % van het frame valt → `timingScore ≥ 0.85` → eerste code bemonsteren en `n` uit de kop controleren → alle codes bemonsteren (bilineair, drempel = gemiddelde van de code, schone code op 4 px/module, `inversionAttempts: "dontInvert"`).

- [ ] **Stap 1: tests**
  - `reads back every chunk of a four-code card`: 4 stukken → `encodeChunks` → `rasterCodes(…, px 3)` → `readCard` → zelfde bytes.
  - `reads a card scaled down to 1280 px`: zelfde raster, met een box-filter verkleind tot lange zijde 1280 (testhelper in de spec) → zelfde bytes.
  - `reads a one-code card`: 1 stuk van 1.701 B.
  - `never picks version 23`: een stuk dat precies in v23 zou passen → `version === 24`.
  - `finds no card in a plain picture`: effen grijs of ruis → `undefined`.
- [ ] **Stap 2:** run → FAIL. **Stap 3:** implementeren. **Stap 4:** run → PASS.
- [ ] **Stap 5:** commit `read and write save card codes`.

### Task 4: Kaart tekenen en scherm bij Instellingen

**Files:**

- Create: `src/app/saveCard/drawCard.ts`, `src/app/saveCard/SaveCardTransfer.tsx`
- Modify: `src/app/SettingsModal.tsx` (knop + paneel, elke build), `public/locales/en/*.json`, `public/locales/nl/*.json` (keys onder `saveCard.*`), `CHANGELOG.md`
- Test: `src/app/saveCard/SaveCardTransfer.spec.tsx`

**Interfaces:**

- Consumes: Task 1–3, `readGameData`/`writeGameData` (`src/support/useGameStorage.ts`).
- Produces: `drawCard(chunks: Uint8Array[], validUntil: Date, t: TFunction): Promise<Blob>` (canvas, PNG); `<SaveCardTransfer />`.

Flow:

- **Maak kaart:** `readGameData` → `trimSave` → `sealSave(JSON, Date.now())` → `splitChunks(…, random 16-bit id)` → `drawCard` → `navigator.share({ files: [png] })`; als `share` ontbreekt of `canShare` nee zegt, `<a download="reiskaart.png">`. Een afgebroken deelmenu (`AbortError`) is geen fout.
- **Lees kaart:** `<input type="file" accept="image/*">` → bitmap → canvas → `readCard` → `joinChunks` → `openSave(…, Date.now())` → `checkImport` → bevestigen (`window.confirm`, met het aantal reizen) → `writeGameData` → `location.reload()`.
- Elke weigering krijgt een eigen melding: geen reiskaart, verlopen, klok loopt voor, aangepast, andere spelversie (epoch), werk eerst het spel bij.

- [ ] **Stap 1: tests** (jsdom; `drawCard`, `readCard` en storage gemockt, aanroepen tellen):
  - `shares the card as a PNG file`, `falls back to a download when sharing is not offered`, `shows nothing when the share sheet is cancelled`.
  - `replaces the save after confirming` (writeGameData 1×, reload 1×), `keeps the save when the player says no` (writeGameData 0×).
  - `names why a card is refused`: per `reason` de bijbehorende tekst, writeGameData 0×.
  - `is offered in a release build`: met `DEV_TOOLS` uit staat de knop in Instellingen.
- [ ] **Stap 2:** run → FAIL. **Stap 3:** implementeren; `drawCard` tekent kop (verloop, Fez, titel, ondertitel, piramides, zon), rand en voet (steen, "geldig tot", aantal codes) om `rasterCodes` heen, zoals de goedgekeurde kaarten.
- [ ] **Stap 4:** run → PASS; daarna `yarn check-types`, `yarn lint`, `yarn test`, `yarn starter-freeze`.
- [ ] **Stap 5: kijken** (`yarn dev`, playwright):
  - kaart maken op een verse save en na "Starter af"; screenshots naast de goedgekeurde PNG's leggen;
  - de kaart in de browser via `canvas.toBlob("image/jpeg", 0.6)` op 1280 px opnieuw laden en importeren → slaagt;
  - een save met verkende vloeren exporteren, importeren in een schone browsercontext, en de site-map van een paar vloeren vergelijken (mist, kamers, gangen, dood eind voorbij de laatste kamer). Verschilt de mist: stop en meld met screenshots.
- [ ] **Stap 6:** CHANGELOG `## Unreleased`: "Move your save to another device with a travel card in Settings." Commit `save card in settings`.

**Handmatig, door de ontwerper na merge op preview:** een kaart via WhatsApp, iMessage en Telegram naar jezelf sturen en de ontvangen afbeelding importeren.
