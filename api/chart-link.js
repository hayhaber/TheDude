// Stage (v1.0.179): fetch a chart from a shared LINK — Dropbox, Google
// Drive, OneDrive / any https address of a PDF or an image. The browser
// can't download these itself (no CORS), so this function does, and hands
// back the bytes. Only PDFs and images are passed on (max 20 MB), only
// public https addresses (no local / private networks).
//
//   GET /api/chart-link?url=<shared link>  -> the file (application/pdf | image/*)
//                                             header x-chart-name = its name
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX = 20 * 1024 * 1024;

function privateIp(ip) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80')) return true;
    const m = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return m ? privateIp(m[1]) : false;
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

/** A share page's address -> the address of the file itself. */
export function directUrl(raw) {
  const u = new URL(raw);
  const host = u.hostname.toLowerCase();
  if (host.endsWith('dropbox.com')) {
    u.searchParams.delete('dl');
    u.searchParams.set('raw', '1');
    return u.toString();
  }
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    const id = u.pathname.match(/\/d\/([A-Za-z0-9_-]{10,})/)?.[1] ?? u.searchParams.get('id');
    if (id) {
      // a Google Doc exports as PDF; a Drive file downloads as is
      if (host === 'docs.google.com' && /\/document\//.test(u.pathname)) return `https://docs.google.com/document/d/${id}/export?format=pdf`;
      return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
    }
  }
  if (host === '1drv.ms' || host.endsWith('onedrive.live.com')) {
    if (!u.searchParams.has('download')) u.searchParams.set('download', '1');
    return u.toString();
  }
  return u.toString();
}

async function safe(urlString) {
  const u = new URL(urlString);
  if (u.protocol !== 'https:') throw new Error('https only');
  const host = u.hostname;
  if (isIP(host) ? privateIp(host) : (await lookup(host, { all: true })).some((r) => privateIp(r.address))) throw new Error('blocked');
  return u;
}

function kindOf(bytes, type) {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (/^image\/(heic|heif)/.test(type || '')) return type;
  return null;
}

function nameOf(res, url) {
  const cd = res.headers.get('content-disposition') || '';
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) return decodeURIComponent(star[1]);
  const plain = cd.match(/filename="?([^";]+)"?/i);
  if (plain) return plain[1];
  const last = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || '');
  return /\.[a-z0-9]{2,5}$/i.test(last) ? last : '';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method' });
  const raw = String(req.query?.url || '').trim();
  let target;
  try {
    target = await safe(directUrl(raw));
  } catch {
    return res.status(400).json({ error: 'bad-url' });
  }
  try {
    // follow redirects by hand so every hop is checked
    let url = target.toString();
    let r;
    for (let hop = 0; hop < 6; hop += 1) {
      r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0 DudeStar' }, signal: AbortSignal.timeout(20000) });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        url = (await safe(new URL(r.headers.get('location'), url).toString())).toString();
        continue;
      }
      break;
    }
    if (!r.ok) return res.status(502).json({ error: 'fetch', status: r.status });
    if (Number(r.headers.get('content-length') || 0) > MAX) return res.status(413).json({ error: 'too-big' });
    const chunks = [];
    let size = 0;
    for await (const c of r.body) {
      size += c.length;
      if (size > MAX) return res.status(413).json({ error: 'too-big' });
      chunks.push(c);
    }
    const bytes = Buffer.concat(chunks);
    const type = kindOf(bytes, r.headers.get('content-type'));
    if (!type) return res.status(415).json({ error: 'not-a-chart' });
    res.setHeader('content-type', type);
    res.setHeader('x-chart-name', encodeURIComponent(nameOf(r, url)));
    res.setHeader('cache-control', 'no-store');
    return res.status(200).send(bytes);
  } catch {
    return res.status(502).json({ error: 'fetch' });
  }
}
