'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'assets');

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function hex(c) {
  return {
    r: parseInt(c.slice(1, 3), 16),
    g: parseInt(c.slice(3, 5), 16),
    b: parseInt(c.slice(5, 7), 16),
  };
}

const cBgTop = hex('#171a42');
const cBgBot = hex('#5b21b6');
const cPlanetTop = hex('#8be9fd');
const cPlanetBot = hex('#4f46e5');
const cPlanetDeep = hex('#312e81');
const cRing = hex('#e879f9');
const cStar = hex('#ffffff');
const cStarWarm = hex('#fde68a');

function roundedCov(x, y, S, R) {
  const cx = x + 0.5;
  const cy = y + 0.5;
  const qx = Math.abs(cx - S / 2) - (S / 2 - R);
  const qy = Math.abs(cy - S / 2) - (S / 2 - R);
  const d =
    Math.min(Math.max(qx, qy), 0) +
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) -
    R;
  return clamp(0.5 - d, 0, 1);
}

function circleCov(x, y, cx, cy, r) {
  const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
  return clamp(r - d + 0.5, 0, 1);
}

function ringCov(x, y, cx, cy, rx, ry, rot, halfPx) {
  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const px = dx * cos - dy * sin;
  const py = dx * sin + dy * cos;
  const e = Math.hypot(px / rx, py / ry);
  const d = Math.abs(e - 1) * rx;
  return clamp((halfPx + 0.75 - d) / 1.5, 0, 1);
}

function drawIcon(S) {
  const out = new Uint8Array(S * S * 4);
  const ringCx = 0.58 * S;
  const ringCy = 0.40 * S;
  const ringRx = 0.345 * S;
  const ringRy = 0.155 * S;
  const ringRot = -0.45;
  const ringHalf = 0.026 * S;
  const pCx = 0.42 * S;
  const pCy = 0.565 * S;
  const pR = 0.30 * S;
  const hlCx = pCx - 0.075 * S;
  const hlCy = pCy - 0.095 * S;
  const hlR = 0.115 * S;

  const stars = [
    { x: 0.735, y: 0.165, r: 0.018, glow: 0.075, c: cStarWarm },
    { x: 0.825, y: 0.305, r: 0.011, glow: 0.05, c: cStar },
    { x: 0.175, y: 0.185, r: 0.011, glow: 0.05, c: cStar },
    { x: 0.285, y: 0.125, r: 0.008, glow: 0.04, c: cStar },
  ];

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const idx = (y * S + x) * 4;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;

      const blend = (sr, sg, sb, sa) => {
        if (sa <= 0) return;
        const na = a + sa * (1 - a);
        if (na <= 0) return;
        r = (r * a + sr * sa * (1 - a)) / na;
        g = (g * a + sg * sa * (1 - a)) / na;
        b = (b * a + sb * sa * (1 - a)) / na;
        a = na;
      };

      const t = (y + 0.5) / S;
      const bgCov = roundedCov(x, y, S, 0.21 * S);
      blend(lerp(cBgTop.r, cBgBot.r, t), lerp(cBgTop.g, cBgBot.g, t), lerp(cBgTop.b, cBgBot.b, t), bgCov);

      const ringA = ringCov(x, y, ringCx, ringCy, ringRx, ringRy, ringRot, ringHalf) * 0.92;
      blend(cRing.r, cRing.g, cRing.b, ringA);

      const pd = Math.hypot(x + 0.5 - pCx, y + 0.5 - pCy);
      const pCov = circleCov(x, y, pCx, pCy, pR);
      const pt = clamp(pd / pR, 0, 1);
      blend(
        lerp(lerp(cPlanetTop.r, cPlanetBot.r, pt), cPlanetDeep.r, pt * 0.55),
        lerp(lerp(cPlanetTop.g, cPlanetBot.g, pt), cPlanetDeep.g, pt * 0.55),
        lerp(lerp(cPlanetTop.b, cPlanetBot.b, pt), cPlanetDeep.b, pt * 0.55),
        pCov
      );

      const hd = Math.hypot(x + 0.5 - hlCx, y + 0.5 - hlCy);
      const hlCov = circleCov(x, y, hlCx, hlCy, hlR) * clamp(1 - (hd / hlR - 0.35) * 1.6, 0, 1) * 0.28;
      blend(255, 255, 255, hlCov);

      for (const s of stars) {
        const sd = Math.hypot(x + 0.5 - s.x * S, y + 0.5 - s.y * S);
        const glow = clamp(1 - sd / (s.glow * S), 0, 1) * 0.45;
        const core = circleCov(x, y, s.x * S, s.y * S, s.r * S);
        blend(s.c.r, s.c.g, s.c.b, Math.min(1, core + glow));
      }

      out[idx] = Math.round(r);
      out[idx + 1] = Math.round(g);
      out[idx + 2] = Math.round(b);
      out[idx + 3] = Math.round(a * 255);
    }
  }
  return out;
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePNG(S, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    Buffer.from(rgba.buffer, y * S * 4, S * 4).copy(raw, y * (S * 4 + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function encodeICO(pngBuf) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 0;
  header[7] = 0;
  header[8] = 0;
  header[9] = 0;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(pngBuf.length, 14);
  header.writeUInt32LE(22, 18);
  return Buffer.concat([header, pngBuf]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const png512 = encodePNG(512, drawIcon(512));
const png256 = encodePNG(256, drawIcon(256));

fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), png512);
fs.writeFileSync(path.join(OUT_DIR, 'icon-256.png'), png256);
fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), encodeICO(png256));

console.log('Icon generated:');
console.log('  assets/icon.png   (512x512)');
console.log('  assets/icon-256.png (256x256)');
console.log('  assets/icon.ico   (256x256 ICO)');
