import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('public/favicon.svg');

async function makeIcon(size, outPath, { padded = true, background = '#ede6ff' } = {}) {
  const inner = padded ? Math.round(size * 0.62) : size;
  const logo = await sharp(svg).resize(inner, inner, { fit: 'contain' }).toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: padded ? background : { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(outPath);
  console.log('wrote', outPath);
}

await makeIcon(192, 'public/pwa-192.png');
await makeIcon(512, 'public/pwa-512.png');
await makeIcon(512, 'public/pwa-maskable-512.png', { padded: true, background: '#ede6ff' });
await makeIcon(180, 'public/apple-touch-icon.png', { padded: true, background: '#ede6ff' });
