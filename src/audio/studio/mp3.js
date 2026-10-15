// MP3 export. The encoder (lamejs — LAME in JavaScript, LGPL-3.0, see
// node_modules/@breezystack/lamejs/LICENSE) is loaded only when someone
// exports an MP3, as its own file: it never weighs on the app's start-up,
// and it stays a separate, replaceable library as the LGPL asks.
// Encoding runs in slices with a yield between them so the page stays
// responsive (a 4-minute song is ~2-4 s of work on a phone).

export const MP3_KBPS = [128, 192, 320];
export const MP3_DEFAULT_KBPS = 192;
const SLICE = 1152 * 40;

function toInt16(f32, from, to) {
  const out = new Int16Array(to - from);
  for (let i = from; i < to; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    out[i - from] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** AudioBuffer -> MP3 Blob. onProgress(0..1) optional. */
export async function encodeMp3(buffer, kbps = MP3_DEFAULT_KBPS, onProgress) {
  const { Mp3Encoder } = await import('@breezystack/lamejs');
  const stereo = buffer.numberOfChannels > 1;
  const left = buffer.getChannelData(0);
  const right = stereo ? buffer.getChannelData(1) : null;
  // LAME supports 32/44.1/48 kHz (and lower) — the mixdown is 48 kHz.
  const enc = new Mp3Encoder(stereo ? 2 : 1, buffer.sampleRate, kbps);
  const parts = [];
  for (let i = 0; i < left.length; i += SLICE) {
    const end = Math.min(left.length, i + SLICE);
    const l = toInt16(left, i, end);
    const chunk = stereo ? enc.encodeBuffer(l, toInt16(right, i, end)) : enc.encodeBuffer(l);
    if (chunk.length) parts.push(new Uint8Array(chunk));
    onProgress?.(end / left.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  const tail = enc.flush();
  if (tail.length) parts.push(new Uint8Array(tail));
  return new Blob(parts, { type: 'audio/mpeg' });
}
