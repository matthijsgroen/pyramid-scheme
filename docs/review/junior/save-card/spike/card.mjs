// Branded save card: render in Chromium (Limelight + Fez + stone), then chat-compress and decode.
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { payload, plan, layout, chatify, readGrid, readZxing } from "./lib.mjs";
import { gray, readBlind } from "./rectify.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.resolve(here, "../qr-card");
const b64 = (f) => fs.readFileSync(path.join(here, "assets", f)).toString("base64");

import { CARD } from "./card-opts.mjs";

function html(p, L, mpx, info) {
  const codes = p.codes.map((c) => Array.from(c.modules.data));
  return `<!doctype html><html><head><style>
@font-face{font-family:Limelight;src:url(data:font/woff2;base64,${b64("Limelight-Regular.woff2")}) format("woff2")}
html,body{margin:0;background:#000}
</style></head><body><canvas id=c></canvas><script>
const L=${JSON.stringify(L)}, M=${mpx}, size=${p.size}, codes=${JSON.stringify(codes)}, info=${JSON.stringify(info)};
const cv=document.getElementById('c'); cv.width=L.W*M; cv.height=L.H*M; const g=cv.getContext('2d');
const W=cv.width,H=cv.height,B=L.border*M;
const img=(src)=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.src=src});
(async()=>{
await document.fonts.load('80px Limelight');
const stone=await img('data:image/png;base64,${b64("masonry-stone.png")}');
const fez=await img('data:image/png;base64,${b64("fez-logo.png")}');
// frame: ink, gold rule
g.fillStyle='#2b2118'; g.fillRect(0,0,W,H);
g.fillStyle='#e0a526'; g.fillRect(B*0.45,B*0.45,W-B*0.9,H-B*0.9);
g.fillStyle='#2b2118'; g.fillRect(B*0.6,B*0.6,W-B*1.2,H-B*1.2);
// sandstone body with masonry lines
g.fillStyle='#d6b98a'; g.fillRect(B,B,W-2*B,H-2*B);
g.save(); g.globalAlpha=.35; const pat=g.createPattern(stone,'repeat'); g.setTransform(M/3,0,0,M/3,0,0);
g.fillStyle=pat; g.fillRect(B*3/M,B*3/M,(W-2*B)*3/M,(H-2*B)*3/M); g.restore();
// header: dusk sky band + pyramids + title
const hh=L.header*M, hx=B, hy=B, hw=W-2*B;
const sky=g.createLinearGradient(0,hy,0,hy+hh); sky.addColorStop(0,'#27304a'); sky.addColorStop(.7,'#a3401a'); sky.addColorStop(1,'#e0a526');
g.save(); g.beginPath(); g.rect(hx,hy,hw,hh); g.clip();
g.fillStyle=sky; g.fillRect(hx,hy,hw,hh);
g.fillStyle='#ffd27a'; g.beginPath(); g.arc(hx+hw-hh*.75,hy+hh*.42,hh*.11,0,7); g.fill();
const pyr=(cx,base,w,h,light,dark)=>{g.fillStyle=light;g.beginPath();g.moveTo(cx-w/2,base);g.lineTo(cx,base-h);g.lineTo(cx,base);g.fill();
  g.fillStyle=dark;g.beginPath();g.moveTo(cx,base-h);g.lineTo(cx+w/2,base);g.lineTo(cx,base);g.fill();};
const base=hy+hh;
pyr(hx+hw-hh*.55,base,hh*.8,hh*.4,'#c2915a','#855a0c');
pyr(hx+hw-hh*1.15,base,hh*1.15,hh*.58,'#eab54b','#b87f14');
g.fillStyle='#c25e30'; g.fillRect(hx,base-hh*.06,hw,hh*.06); g.restore();
const fs=hh*.62; g.drawImage(fez,hx+hh*.12,hy+hh*.1,hh*.84,hh*.84);
g.font='100px Limelight'; const tw=g.measureText('Pyramid Scheme').width;
g.font=Math.min(hh*.34,100*(hw-hh*2.3)/tw)+'px Limelight'; g.textBaseline='alphabetic';
g.fillStyle='#2b2118'; g.fillText('Pyramid Scheme',hx+hh*1.06,hy+hh*.5+hh*.03);
g.fillStyle='#ffd27a'; g.fillText('Pyramid Scheme',hx+hh*1.04,hy+hh*.5);
g.font=(hh*.14)+'px Limelight'; g.fillStyle='#fff8ea'; g.fillText(info.subtitle,hx+hh*1.06,hy+hh*.74);
// code plates: cream (the reader needs light quiet zones), thin ochre rim outside the quiet zone
for(let i=0;i<codes.length;i++){const c=L.cells[i];
  g.fillStyle='rgba(43,33,24,.35)'; g.fillRect(c.x*M+M*.8,c.y*M+M*.8,c.w*M,c.h*M);
  g.fillStyle='#fff8ea'; g.fillRect(c.x*M,c.y*M,c.w*M,c.h*M);
  g.fillStyle='#2b2118'; const d=codes[i];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) if(d[y*size+x]) g.fillRect((c.x+4+x)*M,(c.y+4+y)*M,M,M);
}
// footer
const fy=H-B-L.footer*M; g.fillStyle='#2b2118'; g.textBaseline='middle'; g.font=(L.footer*M*.38)+'px Limelight';
g.fillText(info.footerL,B+M*4,fy+L.footer*M*.5);
g.textAlign='right'; g.fillText(info.footerR,W-B-M*4,fy+L.footer*M*.5);
document.title='done';
})();
</script></body></html>`;
}

export async function renderCard(browser, p, L, mpx, info) {
  const page = await browser.newPage({ viewport: { width: L.W * mpx, height: L.H * mpx }, deviceScaleFactor: 1 });
  await page.setContent(html(p, L, mpx, info));
  await page.waitForFunction(() => document.title === "done");
  const png = await page.locator("#c").screenshot({ type: "png" });
  await page.close();
  return png;
}

// name:size:codes+EC, e.g. heavy:10813:4L
const cards = (process.argv[2] ?? "fresh:463:1L,starter:1701:1L,junior:4038:4L,heavy:10813:4L").split(",").map((s) => {
  const [name, size, k] = s.split(":");
  return { name: `${name}-${k}`, size: Number(size), n: parseInt(k), ec: k.slice(-1) };
});
const settings = [[[1600, 75]], [[1600, 60]], [[1280, 75]], [[1280, 60]], [[1024, 60]], [[1600, 70], [1280, 60]], [[960, 60]], [[800, 60]]];
const md = ["| card | B | codes | QR | card px (native) | px/mod @1600 / @1280 | " + settings.map((c) => c.map(([l, q]) => `${l}q${q}`).join("→")).join(" | ") + " |"];
md.push("|" + "---|".repeat(6 + settings.length));
const browser = await chromium.launch();
const until = "geldig tot 14:47";
for (const c of cards) {
  const p = plan(payload(c.size, c.size), c.n, c.ec);
  const L = layout(p, CARD);
  const mpx = Math.max(2, Math.round(2000 / Math.max(L.W, L.H)));
  const info = { subtitle: "Reiskaart · neem je expeditie mee", footerL: until, footerR: p.n === 1 ? "1 code" : `${p.n} codes` };
  const png = await renderCard(browser, p, L, mpx, info);
  fs.writeFileSync(path.join(OUT, `${c.name}-card.png`), png);
  const lm = Math.max(L.W, L.H);
  const row = [c.name, c.size, p.n, `v${p.version}-${p.ec}`, `${L.W * mpx}×${L.H * mpx}`, `${(1600 / lm).toFixed(1)} / ${(1280 / lm).toFixed(1)}`];
  for (const chain of settings) {
    let j = png;
    for (const [long, q] of chain) j = await chatify(j, long, q, "linear");
    const tag = chain.map(([l, q]) => `${l}-q${q}`).join("+");
    fs.writeFileSync(path.join(OUT, `${c.name}-card-${tag}.jpg`), j);
    const gr = await gray(j);
    const t0 = performance.now();
    const blind = readBlind(gr, CARD);
    const ms = performance.now() - t0;
    const B = blind.chunks.filter((g, i) => g && g.equals(p.chunks[i])).length;
    const plain = await readGrid(j, L, p);
    const z = await readZxing(j, p);
    const mark = (k) => (k === p.n ? "✓" : `${k}/${p.n}`);
    row.push(`B${mark(B)} J${mark(plain)} Z${mark(z)}`);
    console.error(c.name, chain.flat().join("/"), "blind tries", blind.tries, ms.toFixed(0) + "ms");
  }
  console.log(row.join("\t"));
  md.push("| " + row.join(" | ") + " |");
}
fs.writeFileSync(path.join(OUT, "results.md"), md.join("\n") + "\n");
await browser.close();
