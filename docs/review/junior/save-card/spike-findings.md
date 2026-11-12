# Save card spike — bevindingen (2026-11-12)
Simulatie: sharp verkleinen + JPEG 4:2:0. Ruwe tabel: results.md. Scripts: ../qr-spike/.
- Vers 463 B: 1× v15-L. Starter 1701 B: 1× v30-L. Junior ~4 kB: 4× v24-L. Zwaar 10813 B: 4× v39-L (2×2), kaart 1504×1984.
- Alle aanbevolen kaarten 100% gelezen bij 1600/1280/1024/960/800 px, q60–75, ook dubbel gecomprimeerd.
- Lezer: kaart = referentiekader. Inktrand vinden, layout raden uit beeldverhouding (+timing/finder check), elk modulecentrum bilineair bemonsteren, drempel gemiddelde, schone code op 4 px/module → jsQR. 100% vanaf ~2 px/module. ~80 regels, geen extra dependency.
- jsQR direct op uitsnede: onbetrouwbaar (33–100%, fase-probleem). EC L kiezen; M/Q winnen niets.
- jsqr-es6 bug: v23-L leest nooit → writer slaat v23 over.
- Layout: staand, ~vierkant rooster ceil(√n), stille zone 4 modules per code, kop 24% / voet 9% / rand 7 modules. Doel ≥2,5 px/module bij 1280 px ⇒ max ~11,8 kB per kaart (2×2 v40-L); daarboven 3×3 (~26 kB, grens).
- Native render: geheel aantal px/module, lange zijde ~2000 px. Decoratie alleen in kop/voet/rand; codevlakken #fff8ea, modules #2b2118.
- Niet gedekt: zwarte balken (screenshot donker thema) → gouden lijn op kleur zoeken of zxing-wasm fallback; bijsnijden/draaien/foto → zxing-wasm lazy (~1 MB) of BarcodeDetector, best effort.
- Nog doen: echte WhatsApp/iMessage/Telegram-test met heavy-4L-card.png.
