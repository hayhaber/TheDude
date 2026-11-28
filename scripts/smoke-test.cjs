// Smoke test (v1.0.288): opens every home card and every shortcut on it, at
// phone (390, Hebrew) and iPad (1180, English) sizes, and fails on any page
// error, a blank screen or the "Something went wrong" page. Run it before a
// push — it catches a change that breaks a screen nobody looked at.
//
//   npm run build
//   npx vite preview --port 4187 &
//   NODE_PATH=$(npm root -g) node scripts/smoke-test.cjs [url]
//
// Needs Playwright with Chromium (installed globally in the dev container).
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://localhost:4187/';
const RUNS = [
  { width: 390, height: 844, lang: 'he' },
  { width: 1180, height: 820, lang: 'en' },
];
// browser noise that isn't ours
const IGNORE = /ResizeObserver loop|net::ERR_|Failed to load resource|AbortError|The play\(\) request/i;

async function run({ width, height, lang }) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height }, locale: lang === 'he' ? 'he-IL' : 'en-US' });
  const problems = [];
  let where = 'start';
  page.on('pageerror', (e) => !IGNORE.test(e.message) && problems.push(`${where}: ${e.message}`));
  // samples / fonts from other hosts are blocked in the container: answer them empty
  await page.route(/^(?!http:\/\/localhost)/, (r) => r.fulfill({ status: 204, body: '' }));
  await page.addInitScript((l) => {
    try {
      localStorage.setItem('dudestar-lang', l);
    } catch {
      /* ignore */
    }
  }, lang);
  await page.goto(URL);
  await page.waitForTimeout(1500);
  const skip = page.getByRole('button', { name: /^(skip|דלג|דילוג)/i });
  if (await skip.count()) await skip.first().click();
  await page.waitForTimeout(800);

  const titles = [];
  let screens = 0;
  for (let c = 0; c < 12; c++) {
    const card = page.locator('.home-card.is-active');
    const title = ((await card.locator('.home-title').first().innerText().catch(() => '')) || '').trim();
    if (!title || titles.includes(title)) break;
    titles.push(title);
    const count = await card.locator('.home-option').count();
    for (let i = 0; i < count; i++) {
      const opt = page.locator('.home-card.is-active .home-option').nth(i);
      const label = ((await opt.innerText().catch(() => '')) || '').trim().split('\n')[0];
      where = `${title} › ${label}`;
      await opt.click().catch(() => problems.push(`${where}: could not tap`));
      await page.waitForTimeout(1200);
      if (await page.locator('.err-page').count()) problems.push(`${where}: "Something went wrong" page`);
      const text = ((await page.locator('#root').innerText().catch(() => '')) || '').trim();
      if (text.length < 20) problems.push(`${where}: blank screen`);
      screens++;
      // back home: Escape first (sheets / tool screens), then the round Home button
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      if (!(await page.locator('.home-card.is-active').count())) {
        const home = page.locator('.home-button:visible').first();
        if (await home.count()) await home.click().catch(() => {});
        await page.waitForTimeout(700);
      }
      if (!(await page.locator('.home-card.is-active').count())) {
        await page.goto(URL);
        await page.waitForTimeout(1200);
      }
      // the app reopens on the card it came from; make sure we're on this one
      for (let k = 0; k < 12; k++) {
        const t = ((await page.locator('.home-card.is-active .home-title').first().innerText().catch(() => '')) || '').trim();
        if (t === title) break;
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(450);
      }
    }
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
  }
  await browser.close();
  return { label: `${width} ${lang}`, cards: titles.length, screens, problems };
}

(async () => {
  let failed = false;
  for (const r of RUNS) {
    const res = await run(r);
    console.log(`${res.label}: ${res.cards} cards, ${res.screens} screens, ${res.problems.length} problems`);
    res.problems.forEach((p) => console.log('  ✗ ' + p));
    if (!res.cards || !res.screens || res.problems.length) failed = true;
  }
  process.exit(failed ? 1 : 0);
})();
