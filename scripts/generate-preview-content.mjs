#!/usr/bin/env node
/**
 * Regenerates neutral preview fixtures. Runs as npm run generate:preview.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "preview");
const pagesDir = join(outDir, "pages");
mkdirSync(pagesDir, { recursive: true });

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

function encodePng(w, h, rgb) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const stride = w * 3;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const GLYPHS = {
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
  0: ["01110","10001","10011","10101","11001","10001","01110"],
  1: ["00100","01100","00100","00100","00100","00100","01110"],
  2: ["01110","10001","00001","00010","00100","01000","11111"],
  3: ["11111","00010","00100","00010","00001","10001","01110"],
  4: ["00010","00110","01010","10010","11111","00010","00010"],
  5: ["11111","10000","11110","00001","00001","10001","01110"],
  6: ["00110","01000","10000","11110","10001","10001","01110"],
  7: ["11111","00001","00010","00100","01000","01000","01000"],
  8: ["01110","10001","10001","01110","10001","10001","01110"],
  9: ["01110","10001","10001","01111","00001","00010","01100"],
};
const W = 760, H = 1064;
function set(b,x,y,r,g,bl){ if(x<0||y<0||x>=W||y>=H)return; const i=(y*W+x)*3; b[i]=r;b[i+1]=g;b[i+2]=bl; }
function rect(b,x,y,w,h,r,g,bl){ for(let v=y;v<y+h;v++) for(let u=x;u<x+w;u++) set(b,u,v,r,g,bl); }
function txt(b,t,sx,sy,sc,r,g,bl){ let c=sx; for(const ch of t){ const g2=GLYPHS[ch]||GLYPHS[" "]; for(let gy=0;gy<7;gy++) for(let gx=0;gx<5;gx++) if(g2[gy][gx]=='1') rect(b,c+gx*sc,sy+gy*sc,sc,sc,r,g,bl); c+=6*sc; } }
function page(n){ const b=Buffer.alloc(W*H*3,0xff); for(let i=0;i<40;i++){ rect(b,140,150+i*18,W-280,1,224,231,255); } txt(b,String(n),Math.round((W-(String(n).length*6*26-26))/2), H/2-60-91, 26, 30,41,59); return encodePng(W,H,b); }
function pdf(nc){ const objs=[]; const add=x=>{objs.push(x);return objs.length}; const f=add("<< /Type/Font/Subtype/Type1/BaseFont/Helvetica>>"); const pgs=add(""); const kids=[]; for(let n=1;n<=nc;n++){ const c=`BT\n/F1 20 Tf\n70 770 Td\n(Page ${n}) Tj\nET\n0.88 0.91 1 RG\n1 w\n70 745 m 525 745 l S\n`; const ci=add(`<< /Length ${Buffer.byteLength(c,"latin1")} >>\nstream\n${c}\nendstream`); kids.push(add(`<< /Type/Page/Parent ${pgs} 0 R/MediaBox [0 0 595 842]/Resources<</Font<</F1 ${f} 0 R>>>>/Contents ${ci} 0 R>>`)); } objs[pgs-1]=`<< /Type/Pages/Kids [${kids.map(x=>x+" 0 R").join(" ")}]/Count ${nc} >>`; const cat=add(`<< /Type/Catalog/Pages ${pgs} 0 R >>`); let hdr="%PDF-1.4\n", body=""; const off=[]; for(let i=0;i<objs.length;i++){ off[i]=Buffer.byteLength(hdr+body,"latin1"); body+=`${i+1} 0 obj\n${objs[i]}\nendobj\n`; } const x=Buffer.byteLength(hdr+body,"latin1"); let xr=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`; for(const o of off) xr+=`${String(o).padStart(10,"0")} 00000 n \n`; const tr=`trailer\n<< /Size ${objs.length+1}/Root ${cat} 0 R >>\nstartxref\n${x}\n%%EOF\n`; return Buffer.from(hdr+body+xr+tr,"latin1"); }
const N=8; for(let i=1;i<=N;i++) writeFileSync(join(pagesDir,`page-${String(i).padStart(2,"0")}.png`), page(i));
writeFileSync(join(outDir,"book.pdf"), pdf(N)); writeFileSync(join(outDir,"cover.png"), page(1));
console.log("Generated preview fixtures");
