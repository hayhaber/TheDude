// Read the words + chords off a chart that holds no text (v1.0.292): a scan,
// a phone photo, or a PDF printed with "Microsoft Print to PDF" (letters as
// shapes). The app renders the pages to JPEG on the device and sends them
// here; Claude reads them and returns the song in the app's words format
// ([Section], [Am]word, blank line = new section). Nothing is kept here.
//
//   POST /api/chart-ocr   {pages: [base64 jpeg, ...], name?}  -> {text}
//     Authorization: Bearer <the user's Supabase access token> — only a
//     signed-in DudeStar user can use it (each call costs money).
//   503 {setup: true}  when the Vercel env var ANTHROPIC_API_KEY isn't set.
//   Optional env CHART_OCR_MODEL (default claude-sonnet-5).

export const config = { maxDuration: 120, api: { bodyParser: { sizeLimit: '4.4mb' } } };

const SUPABASE_URL = 'https://fcisgnpdpjgayptiurkc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_TTarlNoOKBeFrNtXCc3vOg_stxjawpg';
const MAX_PAGES = 8;

const PROMPT = `These images are the pages of a song chart (lyrics with chord symbols, maybe section names), in any language — often Hebrew.
Transcribe the song into this exact plain-text format and output NOTHING else (no comments, no code fences):
- A section name on its own line in square brackets, e.g. [Verse], [Chorus], [Bridge], [Intro], [פזמון], [בית] — keep the chart's own wording/language.
- Each chord goes in square brackets directly before the word (or syllable) it sits above: "[Am]Today is [G]gonna be". For right-to-left (Hebrew) text, a chord belongs to the word under it — mind that the line reads from the right.
- A line of chords with no words under it (intro, solo, bars) is written as chords only: "[Am] [G] [F] [E]". Keep bar lines | and repeat marks like x2 when shown.
- Short performance notes (e.g. "slowly", "x2", "capo 2") go in curly braces on their own line: {capo 2}.
- A blank line between sections. Keep the line breaks of the lyrics as on the chart.
- Write chord names in standard Latin notation (C, Am, F#m7, Bb, D/F#, Gsus4), never translated.
- Skip page headers/footers, website names, print dates, page numbers, guitar tab staff lines (e|---) and chord diagrams.
- If a word or chord is unreadable, write your best reading; never invent lines that aren't there.
If the images contain no song at all, output exactly: NO_SONG`;

async function userOf(token) {
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_KEY, authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u?.id ? u : null;
}

export default async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  // GET = is it set up? (Settings › Advanced › Server)
  if (req.method === 'GET') return res.status(200).json({ ready: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!key) return res.status(503).json({ setup: true });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = await userOf(token).catch(() => null);
  if (!user) return res.status(401).json({ error: 'sign in' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const pages = (Array.isArray(body.pages) ? body.pages : []).filter((p) => typeof p === 'string' && p.length > 100).slice(0, MAX_PAGES);
  if (!pages.length) return res.status(400).json({ error: 'no pages' });
  const name = String(body.name || '').replace(/[\u0000-\u001f]/g, ' ').slice(0, 120);

  const content = [
    ...pages.map((data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: data.replace(/^data:image\/jpeg;base64,/, '') } })),
    { type: 'text', text: (name ? `The song: "${name}".\n` : '') + PROMPT },
  ];
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.CHART_OCR_MODEL || 'claude-sonnet-5', max_tokens: 6000, messages: [{ role: 'user', content }] }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: String(data?.error?.message || 'ai ' + r.status).slice(0, 200) });
    let text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim();
    text = text.replace(/^```[a-z]*\n?|```$/g, '').trim();
    if (!text || text === 'NO_SONG') return res.status(200).json({ text: '' });
    return res.status(200).json({ text: text.slice(0, 20000) });
  } catch (e) {
    return res.status(502).json({ error: String(e?.message || e).slice(0, 200) });
  }
}
