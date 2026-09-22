/* eslint-disable no-console */
// ==========================================
// Generate KrishiBandhu PWA icons (PNG)
// Pure Node — no dependencies.
// Usage: node scripts/generate-icons.js
// ==========================================

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---------- PNG encoder ----------

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const pngEncode = (width, height, rgba) => {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines with filter byte 0 per row
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    raw[y * (1 + width * 4)] = 0;
    rgba.copy(raw, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

// ---------- Icon drawing ----------

// Brand palette
const GREEN = [47, 111, 82]; // #2f6f52
const GREEN_DARK = [28, 68, 50]; // #1c4432
const WHITE = [255, 255, 255];

const drawIcon = (size) => {
  const radius = Math.round(size * 0.22);
  const center = size / 2;
  const buffer = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;

      // Rounded-rect corner test (transparent outside)
      const cx = Math.max(radius - x, x - (size - radius - 1), 0);
      const cy = Math.max(radius - y, y - (size - radius - 1), 0);
      const outsideRound = cx * cx + cy * cy > radius * radius;

      if (outsideRound) {
        buffer[idx + 3] = 0;
        continue;
      }

      // Vertical gradient green
      const t = y / size;
      let color = GREEN;
      if (t > 0.55) {
        const k = (t - 0.55) / 0.45;
        color = [
          Math.round(GREEN[0] + (GREEN_DARK[0] - GREEN[0]) * k),
          Math.round(GREEN[1] + (GREEN_DARK[1] - GREEN[1]) * k),
          Math.round(GREEN[2] + (GREEN_DARK[2] - GREEN[2]) * k),
        ];
      }

      // White circle "sprout head" in upper-right
      const dx = x - center * 1.18;
      const dy = y - center * 0.7;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Leaf: white ellipse band
      const lx = (x - center) / size;
      const ly = (y - center) / size;
      const leafBottom = center * 1.35;

      const onLeaf =
        y < leafBottom &&
        Math.abs(lx * 1.7 + ly * 0.35) < 0.12 &&
        Math.abs(ly) < 0.42;

      if (onLeaf) {
        color = WHITE;
      } else if (dist < size * 0.1) {
        color = WHITE;
      }

      buffer[idx] = color[0];
      buffer[idx + 1] = color[1];
      buffer[idx + 2] = color[2];
      buffer[idx + 3] = 255;
    }
  }

  return pngEncode(size, size, buffer);
};

// ---------- Main ----------

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const sizes = [192, 512];

sizes.forEach((size) => {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, drawIcon(size));
  console.log(`✓ ${file}`);
});

const favicon = path.join(__dirname, '..', 'public', 'favicon.svg');
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2f6f52"/><path d="M32 46c-2-8-8-13-9-20a9 9 0 0 1 18 0c-1 7-7 12-9 20z" fill="#fff" transform="translate(6 -4)"/></svg>`;

if (!fs.existsSync(favicon)) {
  fs.writeFileSync(favicon, faviconSvg);
  console.log(`✓ ${favicon}`);
}

console.log('Icons generated.');