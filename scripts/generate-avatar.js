'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const WIDTH = 24;
const HEIGHT = 24;

const PALETTE = {
  '.': null,
  O: [28, 31, 46],
  W: [244, 245, 251],
  S: [209, 212, 233],
  V: [43, 46, 73],
  A: [141, 149, 227],
  C: [186, 213, 255],
  Y: [242, 179, 92],
  B: [58, 62, 94],
  D: [41, 44, 68],
  P: [107, 114, 153],
};

const ROWS = [
  '........................',
  '..........Y............',
  '..........O............',
  '.......OOOOOOOO........',
  '.....OOOOOOOOOOOO......',
  '....OOOWWWWWWWWOOO.....',
  '...OOOWWWWWWWWWWOOO....',
  '..OOWWWWWWWWWWWWWWOO...',
  '..OOWWWWWWWWWWWWWWOO...',
  '..OOWWVVVVVVVVVVWWOO...',
  '..OOWWVVVVVVVVVVWWOO...',
  '..OOWWAVVVVCCVVVWWOO...',
  '..OOWWAVVVVVVVVVWWOO...',
  '..OOWWVVVVVVVVVVWWOO...',
  '..OOWWVVVVVVVVVVWWOO...',
  '..OOWWWWWWWWWWWWWWOO...',
  '...OOOWWWWWWWWWWOOO....',
  '....OOOWWWWWWWWOOO.....',
  '.....OOOSSSSSSSOOO.....',
  '.......OOOSSSSSOO......',
  '.........OOO...........',
  '.......BBBBBBBB........',
  '......BBBAAAAABBB......',
  '.....BBBBBBBBBBBB......',
];

function png(data) {
  function crc32(buf) {
    let c;
    const table = crc32.table || (crc32.table = (() => {
      const t = [];
      for (let n = 0; n < 256; n++) {
        c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
      }
      return t;
    })());
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function chunk(type, body) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, body])), 0);
    return Buffer.concat([len, typeBuf, body, crcBuf]);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(data.width, 0);
  ihdr.writeUInt32BE(data.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = zlib.deflateSync(data.raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function build() {
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 4));
  ROWS.forEach((row, y) => {
    let r = row;
    if (r.length !== WIDTH) {
      const pad = Math.floor((WIDTH - r.length) / 2);
      r = '.'.repeat(pad) + r + '.'.repeat(WIDTH - r.length - pad);
    }
    if (r.length !== WIDTH) {
      console.error('ROW ' + y + ' width=' + r.length + ' (expected ' + WIDTH + '): ' + r);
      process.exit(1);
    }
    for (let x = 0; x < WIDTH; x++) {
      const color = PALETTE[r[x]];
      if (!color) continue;
      const o = y * (1 + WIDTH * 4) + 1 + x * 4;
      raw[o] = color[0];
      raw[o + 1] = color[1];
      raw[o + 2] = color[2];
      raw[o + 3] = 255;
    }
  });
  return { width: WIDTH, height: HEIGHT, raw };
}

const SCALE = 4;
const img = build();
const scaled = Buffer.alloc(img.height * SCALE * (1 + img.width * SCALE * 4));
for (let y = 0; y < img.height; y++) {
  for (let sy = 0; sy < SCALE; sy++) {
    const srcRow = y * (1 + img.width * 4);
    const dstRow = (y * SCALE + sy) * (1 + img.width * SCALE * 4);
    scaled[dstRow] = 0;
    for (let x = 0; x < img.width; x++) {
      for (let sx = 0; sx < SCALE; sx++) {
        const o = dstRow + 1 + (x * SCALE + sx) * 4;
        const s = srcRow + 1 + x * 4;
        scaled[o] = img.raw[s];
        scaled[o + 1] = img.raw[s + 1];
        scaled[o + 2] = img.raw[s + 2];
        scaled[o + 3] = img.raw[s + 3];
      }
    }
  }
}

const out = path.join(__dirname, '..', 'assets', 'avatar.png');
fs.writeFileSync(out, png({ width: img.width * SCALE, height: img.height * SCALE, raw: scaled }));
console.log('avatar written: ' + out);
