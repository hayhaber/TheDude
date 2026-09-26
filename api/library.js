// Shared "My library" for the Lick Trainer: every Guitar Pro file imported in
// the app (with the solo/licks made from it) is kept here, so it shows up on
// every device — phone, tablet, computer — until it's deleted.
//
// Storage: Vercel Blob (one JSON document per imported file, holding the
// records and the original file as base64). Access needs the private key the
// owner set as DUDESTAR_KEY in the Vercel project; the app sends it in the
// x-dudestar-key header.
//
//   GET    /api/library            -> { groups: [{ group, size, uploadedAt }] }
//   GET    /api/library?group=g    -> { group, records }
//   PUT    /api/library?group=g    body { records }   -> { ok: true }
//   DELETE /api/library?group=g    -> { ok: true }
import { timingSafeEqual } from 'node:crypto';
import { put, list, del, get } from '@vercel/blob';

const PREFIX = 'dudestar-library/';
const GROUP_RE = /^[A-Za-z0-9_-]{1,80}$/;
// A store is created either private or public; try private first.
const ACCESS = ['private', 'public'];

function sameKey(given, expected) {
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  return a.length === b.length && timingSafeEqual(a, b);
}

const pathOf = (group) => `${PREFIX}${group}.json`;

async function writeJson(pathname, data) {
  let lastError;
  for (const access of ACCESS) {
    try {
      return await put(pathname, JSON.stringify(data), {
        access,
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json',
      });
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function readJson(pathname) {
  let lastError = null;
  for (const access of ACCESS) {
    try {
      const found = await get(pathname, { access, useCache: false });
      if (!found) return null;
      return JSON.parse(await new Response(found.stream).text());
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

async function listAll() {
  const out = [];
  let cursor;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    out.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.DUDESTAR_KEY;
  if (!key || !process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'not-configured' });
  }
  if (!sameKey(req.headers['x-dudestar-key'] ?? '', key)) {
    return res.status(401).json({ error: 'bad-key' });
  }

  const group = req.query?.group;
  if (group != null && !GROUP_RE.test(group)) return res.status(400).json({ error: 'bad-group' });

  try {
    if (req.method === 'GET' && group == null) {
      const blobs = await listAll();
      return res.status(200).json({
        groups: blobs.map((b) => ({
          group: b.pathname.slice(PREFIX.length).replace(/\.json$/, ''),
          size: b.size,
          uploadedAt: b.uploadedAt,
        })),
      });
    }
    if (group == null) return res.status(400).json({ error: 'missing-group' });

    if (req.method === 'GET') {
      const doc = await readJson(pathOf(group));
      return doc ? res.status(200).json(doc) : res.status(404).json({ error: 'not-found' });
    }
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || !Array.isArray(body.records) || body.records.length === 0) {
        return res.status(400).json({ error: 'bad-body' });
      }
      await writeJson(pathOf(group), { group, savedAt: Date.now(), records: body.records });
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      await del(pathOf(group));
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'method' });
  } catch (err) {
    return res.status(500).json({ error: 'storage', message: err?.message ?? String(err) });
  }
}
