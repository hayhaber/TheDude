// Photos / screenshots of a chart -> one PDF (v1.0.179), so the Stage keeps
// ONE kind of chart: the same viewer, store, cloud bucket (PDF only) and
// band sharing work for a photographed page. Each image = one page, drawn
// on white, scaled to at most MAX_SIDE px and stored as JPEG (DCTDecode).

const MAX_SIDE = 2400;
const PAGE_W = 595; // A4 width in points; the height follows the image

export const isImage = (f) => /^image\//.test(f?.type || '') || /\.(jpe?g|png|heic|heif|webp|gif)$/i.test(f?.name || '');

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Safari (HEIC) and older browsers: an <img> decodes what the system can
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}

async function toJpeg(file) {
  const src = await decode(file);
  const w0 = src.width || src.naturalWidth;
  const h0 = src.height || src.naturalHeight;
  if (!w0 || !h0) throw new Error('image');
  const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
  const w = Math.round(w0 * k);
  const h = Math.round(h0 * k);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, w, h);
  src.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.86));
  if (!blob) throw new Error('image');
  return { w, h, bytes: new Uint8Array(await blob.arrayBuffer()) };
}

/** Pure: JPEG pages [{w, h, bytes}] -> PDF bytes. */
export function jpegsToPdfBytes(pages) {
  const enc = new TextEncoder();
  const parts = [];
  let length = 0;
  const offsets = [];
  const push = (chunk) => {
    const b = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(b);
    length += b.length;
  };
  const n = pages.length;
  // objects: 1 catalog, 2 pages, then per page: page, image, content
  const obj = (num, body) => {
    offsets[num] = length;
    push(`${num} 0 obj\n`);
    for (const b of [].concat(body)) push(b);
    push('\nendobj\n');
  };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`);
  pages.forEach((p, i) => {
    const pageNum = 3 + i * 3;
    const W = PAGE_W;
    const H = Math.round((PAGE_W * p.h) / p.w);
    obj(pageNum, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im${i} ${pageNum + 1} 0 R >> >> /Contents ${pageNum + 2} 0 R >>`);
    obj(pageNum + 1, [
      `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`,
      p.bytes,
      '\nendstream',
    ]);
    const content = `q ${W} 0 0 ${H} 0 0 cm /Im${i} Do Q`;
    obj(pageNum + 2, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  const xref = length;
  const count = 3 + n * 3;
  let table = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let i = 1; i < count; i += 1) table += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  push(table);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const b of parts) {
    out.set(b, at);
    at += b.length;
  }
  return out;
}

const baseName = (name) => (name || '').replace(/\.[a-z0-9]+$/i, '').trim();

/** Images (in order) -> a PDF File named after the first one. */
export async function imagesToPdf(files, name) {
  const pages = [];
  for (const f of files) pages.push(await toJpeg(f));
  const bytes = jpegsToPdfBytes(pages);
  const title = name || baseName(files[0]?.name) || 'Chart';
  return new File([bytes], title + '.pdf', { type: 'application/pdf' });
}
