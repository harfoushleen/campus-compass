// Generates the PNG app icons in /public with no extra dependencies.
// Run with: npm run icons
// (Replace the generated files with your own artwork any time.)
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const BG = [0x00, 0x57, 0x3f]; // LAU-style green
const FG = [0xff, 0xff, 0xff];

// CRC32 used by the PNG format.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

// Draws a "compass" ring + dot, matching favicon.svg. Content stays inside the
// central 60% so the icon also works as a maskable (cropped) icon.
function makeIcon(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const c = size / 2;
  const ringR = size * 0.22, ringW = size * 0.055, dotR = size * 0.07;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter byte: none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      const fg = d < dotR || Math.abs(d - ringR) < ringW / 2;
      const [r, g, b] = fg ? FG : BG;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const [file, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  writeFileSync(new URL(`../public/${file}`, import.meta.url), makeIcon(size));
  console.log(`wrote public/${file}`);
}
