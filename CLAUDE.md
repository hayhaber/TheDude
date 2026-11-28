# DudeStar — Chord Progression App

A React 19 + Vite guitar/piano/bass chord-progression learning app ("DudeStar"),
repo `hayhaber/TheDude`, auto-deployed to Vercel on push to `main`
(https://the-dude.vercel.app/). All user communication is in Hebrew.

## Standing rules (apply to every session, every computer)

**1. Auto-push.** After finishing and verifying a code change, `git add` /
`git commit` / `git push origin main` without asking first — Vercel
auto-deploys, and the user tests live on phone/tablet. Still use judgment:
never push obviously broken/untested code, never force-push or rewrite
history without asking.

**2. New-work-only UI conventions** (do NOT retrofit onto existing UI):
   - Every button label is exactly one word, for NEW buttons.
   - Any NEW selection control with more than 2 options is a POP-UP
     BUTTON = `<Select>` from `components/ui/Select.jsx` (never a bare
     `<select>`; user's OK 2026-11-15), not radio/tabs/segmented-toggle —
     2–5 short options that switch a VIEW are a `<Segmented>` — UNLESS it's a genuinely
     global, always-visible switcher (like the Guitar/Piano/Bass instrument
     toggle), which stays as individual pill buttons per explicit user
     preference (confirmed twice: a dropdown redesign was tried and reverted).
   - Existing multi-word labels and existing ≤3-option toggles are left as-is.
     Only retrofit when explicitly asked, as its own dedicated pass.

**3. Shared tab-bar/toggle styling.** Every tab bar / mode switcher / segmented
control uses `src/components/ModeToggle/ModeToggle.css`'s `.mode-toggle`
class. For 2–3 short options use the bare grid variant; for 4+ options or a
long label, use `.mode-toggle.wrap` (bordered individual pills — the bare
variant's transparent-inactive-button look visually merges into one flat bar
once there are that many options or a long label).

**4. Menu/list-item buttons.** Any `<button>` used as a menu/submenu/list row
(icon + label, meant to read left-aligned) must explicitly set
`justify-content: flex-start` — `src/index.css`'s global button reset
defaults to `center` and silently wins if not overridden.

**5. Theory content clarity.** When writing Studies-course lesson text, name
the resulting tones explicitly by their theory role (root/3rd/5th, tonic/
subdominant/dominant, ...), not just the interval-stacking motion used to
reach them — anchor with one concrete worked example.

**6. Zero regression.** Verify thoroughly (build + live browser check) before
calling anything done. Never break existing features/calculations/layouts as
a side effect of unrelated work. Keep visual changes isolated from logic.

**7. Realistic visuals.** Guitar/bass neck graphics (strings/frets/wood
grain/inlays) should look real — proper proportions, string gauges, and
material differences between instruments (see Bass's maple neck vs Guitar's
rosewood, below).

**8. Equal heights in a row.** Whenever several elements sit side by side
in one row (cards, panels, tiles…), every element in that row takes the
height of the tallest one (grid/flex `align-items: stretch`, no `start`
on the container; content inside stays top-aligned). Stacked on a phone
(one per row), each keeps its natural height. Applies everywhere, always
(user's standing rule, 2026-10-09).

**9. Version number.** Every push bumps the patch number of `version` in
`package.json` (1.0.74 -> 1.0.75 …; user's request 2026-10-31). Settings
(Tools card) shows it at the very bottom — the NUMBER ONLY, no date, time
or commit (user's request 2026-11-06; `AppVersion` in SettingsPanel.jsx,
vite.config.js `define` __APP_VERSION__), so the phone can confirm the
latest deploy arrived.

**10. Cross-instrument parity.** A fix or improvement made to an exercise on
one instrument is applied to the same exercise on every other instrument
that has it (e.g. ear-training auto-advance guitar/piano -> singing;
bass re-pluck detection -> Teacher play steps). User's rule 2026-10-31.

**11. Liquid Glass, the way Apple's HIG defines it** (user's rule
2026-11-03; 2026-11-15: glass is the guiding line of the whole design,
"fitted to Apple's design principles" — HIG Materials + WWDC25 "Meet
Liquid Glass"):
   - TWO LAYERS. Glass = the functional layer that floats ABOVE the
     content: tab bar, top bars, the tools row, round buttons, floating
     transport / scroll bubbles, sheets, popovers, menus. The content
     layer (cards, lists, charts, scores, lyrics, necks, drawn devices)
     never gets glass — it stays solid, or uses a plain blur material
     where separation is needed. Exception: a control in the content
     that is being dragged (slider / fader / toggle) may turn glass
     while touched.
   - SPARINGLY. Only the most important functional elements are glass;
     the material is there to bring attention to the content beneath.
   - NO GLASS ON GLASS. Things placed on a glass bubble (keys, steppers,
     rows, boxes) are NOT their own glass panes: they use flat fills
     (white 10–16 % on dark glass / black 5–8 % on light) or nothing,
     and vibrant labels (primary / secondary / tertiary text).
   - TINT ONLY THE PRIMARY. Colour on glass marks the one primary element
     (the screen's main action, an on-state); everything else neutral.
   - REGULAR VARIANT by default (blurs + adjusts the backdrop's luminosity
     so text stays legible) — always for text-heavy glass (sheets,
     popovers, lists). CLEAR (very translucent) only over media-rich,
     bold, bright content (photos / video), with a ~35 % dark dimming
     layer when the content is bright. Never mix the two in one place.
   - LEGIBILITY FIRST: text on glass keeps >= 4.5:1 over the brightest
     content it can sit on; respect prefers-reduced-transparency /
     increased contrast (more opaque fill).
   - Look: a lit rim + specular top edge + soft depth, concentric
     capsule / circle shapes, shadow grows as content scrolls under.
   - STRUCTURE (iOS 26 / iPadOS 26, user's rule 2026-11-15): no
     full-width bars. The tab bar is a FLOATING CAPSULE inset from the
     edges above the home indicator (phone / tablet) or centred at the top
     (desktop / iPad landscape); round buttons float as separate glass
     circles; where content scrolls under the top controls there is a
     SCROLL EDGE (fade + light blur), not a glass strip. Inside the
     capsule the tabs are plain; the chosen one = a soft / tinted pill.
   - INTERACTIVE: a glass control answers the finger — grows ~5–7 % and
     lights up while pressed, then settles (ease-ios); tabs inside a
     capsule press down slightly. Respect prefers-reduced-motion.
   - Web limits (known, accepted): real lensing / refraction and glass
     that flips light / dark by the content beneath can't be done in
     Safari — approximated with blur + rim; the theme decides light /
     dark.
   - All app-wide glass lives in `src/styles/liquid-glass.css` (`html`-
     prefixed selectors); new floating UI follows it.
   - Tokens: index.css `--glass-bg` / `--glass-control` /
     `--glass-filter` / `--glass-shadow`, utility `.glass` (dark values
     under data-theme dark); the Performer's material = Stage.css
     `--sg-*`.

**13. Design as Apple would, always — FROM THE FIRST BUILD** (2026-11-21, user, again: "you should have built it as Apple would from the start; not the first time I remark on it" — every design / UI decision in THIS and EVERY project is decided the way Apple would decide it before it ships, never fixed after he points it out) (user's standing rule 2026-11-06 —
"I don't want to repeat it every time"): every visual / UI / UX decision,
new or touched, follows Apple's HIG thinking (clarity, deference, one
primary action that doesn't shout, quiet secondary ones, system colours,
SF-like type scale, 44 pt targets) and uses the Liquid Glass bubbles
(rule 11) wherever a control floats over content. No need to ask him.

**14. Real teaching method** (user's rule 2026-11-07): the learning path
is structured the way a certified, expert music teacher teaches —
progression follows a real, validated method / graded syllabus for the
instrument (RSL / Trinity / ABRSM-style grades, established methods like
JustinGuitar's), never ad-hoc content. New lessons and the order of
skills must be justified by such a method.

**15. One controls library** (user's OK 2026-11-15, canvas
https://claude.ai/artifact/AjF7jbzZfRchRqxSpMp7dR): every NEW control
comes from `src/components/ui/` — `Button` (variant filled = the screen's
ONE primary / tinted / gray / plain; size sm 30 / md 36 / lg 50; danger;
iconOnly 44 circle), `Switch` (iOS, green on, at the END of its row),
`ControlRow` (label start, control end, >= 44), `Segmented` (2–5 short
options), `Stepper` (− | +, the value BESIDE it), `Select` (pop-up
button), `input.ui-slider`. Styles in `components/ui/ui.css`. Old screens
move over one at a time; device faces (amp, tuner, metronome, drum
machine, recorder / studio, EQ, Performer) keep their own hardware look.

**16. Justified running text** (user's rule 2026-11-15): every paragraph
of running text (lesson / theory text, descriptions, explanations, notes)
is aligned to BOTH sides. Done once: `html { text-align: justify }` in
index.css, INHERITED (text-align-last left at auto = the last / only line
sits at the reading start), so a container that sets its own alignment
(centred empty states, buttons, captions, device faces) keeps it for all
inside; hyphens auto only on `p`. Never set `text-align: left / start` on
running text; new centred blocks set `text-align: center` on the block.

**17. Right-to-left chrome** (v1.0.234, Apple design audit): in Hebrew the
whole top chrome mirrors as iOS does — Home + Back at the reading START
(right), avatar + Tools at the end (left); every screen (AppShell phone
strip + desktop top bar, tool screens, songwriter, Band) agrees. CSS keys
on `html[lang='he']` (never `:dir()`). Titles (h1–h6) are never justified
(`:where(h1..h6) { text-align: start }` in index.css; a centred block's
heading gets its own centre rule). A text-led back link ("‹ Back") is
never used: every back = the round `BackButton` circle beside Home.

**12. Nothing jumps.** Shared chrome keeps its physical position across
screens: the desktop top bar is a 3-column grid (`minmax(0,1fr) auto
minmax(0,1fr)`) so the tabs stay centred on the bar whatever the side
areas hold (user saw the pills jump right on the Chord Library, which has
no tools).

## Apple-style UI/UX redesign (started 2026-11-03)

- User's request: bring the whole app to Apple's standards (less clutter,
  fewer menus, clear features), in STAGES proposed one at a time; every
  stage must be reversible. Baseline before any change = branch
  `ui-baseline-v1.0.89` on GitHub (tag pushes are refused by the proxy, so
  each stage's end state is saved as a branch `ui-stage<N>-v<version>`).
  Roll back a stage = `git revert` its commits on main (never force-push).
- Stages: 1 design foundations (text styles, one button/chip system, one
  icon set, standard screen title) · 2 navigation 8 -> 5 tabs (guitar:
  Learn = Teacher|Studies, Practice, Chords, Play = Songs|GuitarPro,
  Create = Compose|Improvise; a segmented control inside a merged tab; the
  user saw and approved a mockup) · 3 screen chrome (neck only where used,
  metronome/drums/tuner behind one Tools button) · 4 Practice regrouped
  (one select, one-line description + level per exercise, stats after the
  first run) · 5 per-screen cleanup (one primary action, the rest in a
  "More" sheet, empty states) · 6 guidance (first-visit note, "try it in"
  links, settings from the profile) · 7 polish (motion, dark mode, 44 pt
  targets, contrast, parity across instruments).
- STAGE 1 (v1.0.90): tokens in index.css — `--type-*` (HIG text styles:
  large-title 34 … caption2 11), `--radius-xs..xl/pill`, `--fill-tertiary`
  / `--fill-secondary` / `--separator` (dark values under data-theme dark),
  `--tap-min` 44. h1 = Large Title (34 / 30 under 1024px, 700); global
  `.subtitle` = subhead 15 secondary. ONE icon set: `components/LineIcon`
  (`ICON_PATHS` + `LineIcon {name, size, strokeWidth}`, moved out of
  HomeMenu) used by the home shortcuts AND the nav (sections.js `icon` is a
  LineIcon name, `pianoIcon` for the piano; the emoji / red GP pick /
  TrainingIcon / GuitarIcon nav icons are gone). Bottom tab bar = iOS:
  translucent blur material, hairline, 24px icons, 10px labels. Chips
  (`.mode-toggle.wrap`, Studies course tabs, Chord Library key/type strips)
  = gray fill, no outline, chosen = accent fill + white (GP mixer track
  toggles stay tinted = on/off). Secondary buttons (white pill + hairline,
  20 classes, scratchpad btnfix.py) = gray fill `--fill-tertiary`, border
  1px transparent (sizes unchanged); device faces (amp, recorder, studio,
  metronome, drums, tuner, necks, keys) untouched.
- STAGE 2 (v1.0.91): the bar (desktop top bar + phone/tablet bottom tabs)
  shows GOAL GROUPS, not sections — sections.js `NAV_GROUPS`: learn
  [teacher, studies] (+ `also` coach = lights the tab, no switch), practice
  [practice | bassPractice], chords, play [guitarpro, songs], create
  [compose, improvise, freeplay]. Guitar 5 tabs, piano 5 (learn = studies
  alone, create = Compose | Free play), bass 3. A group with ONE section
  here shows that section's own name + icon; with two, AppShell draws an iOS
  segmented control (`.app-group-switch.mode-toggle`, max 420px) above the
  screen's title. A tab returns to the section last used in its group
  (device key `dudestar-nav-last`, `lastSectionIn` / `rememberSection`).
  Both bars + the home shortcuts now run in READING order (dir from the
  language; Learn first = rightmost in Hebrew) — replaces the old "always
  LTR, Compose leftmost" rule (user approved the RTL mockup 2026-11-03).
  Home cards: guitar + piano shortcuts = the 5 groups (`group` option opens
  the last-used section of the group), one row of 5 on phones; bass card
  reordered (Practice, GuitarPro, Compose). The phone-only rule hiding Songs
  is gone (Songs is inside Play). New LineIcons `play`, `create`; strings
  `nav.group.*`; piano `nav.freeplay` = "Free play" / "נגינה חופשית" (it sat
  next to "ניגון"). Sections, their state and App logic are unchanged.
- STAGE 3 (v1.0.93, reworked v1.0.94 after the user's iPad check):
  metronome / drums / tuner live behind ONE round glass Tools button
  (metronome icon, `.app-tools-button`) at EVERY size — desktop / iPad
  landscape top bar (outer right corner, after ⓘ) and the phone / iPad
  portrait top strip (same corner). It opens `.app-tools-popover`: a Liquid
  Glass card dropping from that corner (fixed, 236px, the three pills
  stacked 44px high; mounted once, hidden while closed) — it never covers
  the neck or the tab bar (v1.0.93's floating row above the tab bar
  covered other buttons on the iPad, and landscape had no button at all).
  Tapping a pill opens its drawer and closes the popover; a tap outside
  closes it; a section change closes it. Accent dot `.is-live` while the
  metronome runs (App `toolsActive`). `--mobile-metronome-height` = 0
  under 900px. The top bar's tabs stay centred (rule 12). Chords / Vocal:
  no Tools button (no tools there, as before).
  The neck / keys (Stage) fold away per screen: a small glass handle
  (40x16) on the anchor's top edge (`.app-stage-toggle`), state per section
  in device key `dudestar-stage-collapsed` (Songs starts folded); folded =
  `.app-stage-body` height 0 (Stage stays mounted), --stage-height follows.
  Checked with st3b.cjs at 390, 768, 820 (portrait), 1024, 1180, 1366
  (landscape), 1440: button present, popover opens, no overlaps, tabs fixed.
- STAGE 4 (v1.0.95): Practice = an iOS inset-grouped LIBRARY instead of 9
  tabs + 8 zero stats. App `practiceTab` 'home' (new default) = the list
  (`PracticeView/PracticeHome.jsx` + pure `practiceLibrary.js`); a tool's
  key = that tool under an iOS back button ("‹ Practice", `BackButton`;
  re-tapping the Practice tab also pops to the list — AppShell
  `onReselect`). Rows (`LibraryRow`: colour tile + LineIcon, title, one-line
  description, chevron) in groups chords / rhythm / solo (Lead) / technique
  / ear (`PRACTICE_GROUPS`, Apple system colours); `PRACTICE_ITEMS` gives
  each tool its group, icon, feature gate and the levels it's made for
  (min..max, 0 new .. 3 advanced). Personal: "Continue" (last tool,
  `dudestar-p-practice-last`), "For you" (coach's active goal -> tools, else
  by level, max 3), level = coach intake level > onboarding level (new 0 /
  few 1 / songs 2, raised by `estimateLevel` from the perf log) > perf log;
  unknown -> full list + "tell us your level" (opens the Coach; guitar).
  Tools made for levels BELOW the student fold into one "N more basic
  exercises" row per group (expandable, never gone); above the level =
  orange "Challenging" tag. Summary line under the title = today's minutes
  + day streak from the perf log, only once there's practice. No neck on
  the list. Bass (rule 10): BassPracticeView with no exercise = the same
  library (its 4 categories, 27 exercises, level from the bass first-run
  answer, description = first sentence of `why`), detail = the old view
  minus the category pills / exercise select, with the back button; no neck
  on the bass list. New LineIcons stopwatch / changes / note / bend / hand /
  falling; text `ph.*` in `i18n/tips/practicehome.js`.
- STAGE 5, part 1 (v1.0.96): phone/tablet — the group segmented control
  moved INTO the fixed top strip (`.app-group-switch.is-strip`, glass,
  centred between Home and the round buttons, width min(340px, 100vw −
  216px)); desktop keeps it above the title (`.is-inline`). Reading
  direction: `.app-section-content` now carries dir (RTL in Hebrew), and so
  do the Compose / Improvise / Songs / Studies roots and the Practice detail
  view — titles, subtitles and the views' columns align right in Hebrew on
  every screen (Compose / Improvise / Studies / Songs used to sit left).
  Compose: empty = only the field, suggestions and Save (no Display /
  transpose / Smart / training / Play / Insights); with chords, Play comes
  right under the chips, then positions, then the secondary tools row,
  then Insights.
- STAGE 5, part 2 (v1.0.97): `components/MoreMenu` = the iOS ••• button
  (gray circle, accent dots) opening a Liquid Glass popover with a screen's
  SECONDARY settings / actions (kept on screen by measuring; closes on a tap
  outside / Escape; `.more-menu-item` rows, `.is-danger`). GuitarPro: the
  file row = file select + "Add" (tinted pill, `gp.addShort`; dropping a
  file anywhere on the page still works) + ••• holding the neck labels
  (note / finger — was a row of its own) and Delete for imports (was a
  button in the row); on phones the select is a row of its own and Add +
  ••• share the next.
- STAGE 6 (v1.0.98): guidance. (a) `components/FirstVisit` = a tinted
  note above a screen's title the FIRST time it opens (how to use it, not
  what it is) + "Got it"; seen per profile AND instrument in personal key
  `dudestar-p-seen-intro` (["guitar:chords", …]); text `intro.<section>` or
  `intro.<section>.<instrument>` in `i18n/tips/intro.js` (no text = no
  note); AppShell renders it after the group switch (not in Vocal).
  (b) "Try it in…": `teacher/tryIn.js` `TRY_IN[lessonId]` = launchBus specs
  shown as LibraryRow rows (`components/Teacher/TryIn.jsx`) on the lesson's
  done screen; `lessonForChord('Em')` = the written lesson whose skills hold
  `chord-<name>` -> a "Learn it in a lesson" row under the Chord Library's
  simple card (standard tuning). v1.0.153 (user, iPad: the open neck
  covered the row, and "why offer me D/A when you know I'm advanced?"): the
  link is now INSIDE the card (`.cl-lesson-link`, quiet accent text +
  teacher icon; phones take its 44 px out of the diagram via `--cl-extra`)
  and shows only when the student may need it — not for level >= 2
  (`studentLevel()`), and not when `knowsChord()` (mastery.js: experience
  some / lot, chord heard / said in the first run, skill mastered, or the
  lesson done). launchBus gained `{tool:'chordLibrary',
  root, type}` (writes the library prefs, remounts it via App `chordLibN`)
  and `{tool:'lesson', id}` (App teacherStart.lesson -> TeacherView
  `initialLesson`). (c) ProfileChip `onSettings` -> a Settings button in the
  profile popover's foot (opens the settings tool screen, Home returns to
  the card you were on).
- v1.0.99 (2026-11-04): iPhone, Guitar -> Chords -> Advanced: the page
  slid left/right. `.app-section-content` (overflow-y auto => x computed
  auto = a touch-pannable scroller) now has `overflow-x: hidden`; plus
  min-width 0 on `.cl-info` + its children and the library selects. Not
  reproducible in Chromium (sweep of every section x instrument at 390 /
  820 / 1366 = 0 px overflow, so nothing is clipped); no WebKit here.
- FLOW REVIEW (v1.0.100, 2026-11-06; the user: "the system isn't
  understandable enough, especially for people new to playing"; map
  artifact https://claude.ai/artifact/GRgY48ojh3kz9nZeETR6fy; baseline
  branch `ui-pre-flow-v1.0.99`). User's rules from it: (a) the TEACHER is
  one companion for the whole journey — lessons, tasks, listening,
  exercises, a goal and the way to it ("teacher" and "coach" are the same
  thing to him); (b) wherever notation / tab is shown it gets the most room.
  Done: every instrument's bar shows the same five group names (AppShell
  `groupLabel` = the group's label always — bass was "GuitarPro"/"Compose",
  piano "Studies"); tab names never hidden (the <=1360px icon-only rule is
  gone — the iPad in landscape showed bare icons); Studies is named
  "Theory"/"תאוריה" and opens on a COURSE LIST (StudiesSection `browsing`,
  App `studiesBrowse`, LibraryRow rows + `studies.desc.*`, BackButton back,
  no neck on the list, re-tapping Learn returns to it); Practice detail =
  one header for every exercise (PracticeView: h1 = the list name + the
  one-line `ph.ex.*.desc`; the tools' own titles hidden by PracticeHome.css
  — "Rhythm" and "Finger drills" were both "Practice drills"); no neck
  until there's something on it (practice rhythm / drills / lick trainer /
  ear training before start, Compose with no chords, the Theory list);
  bass Compose subtitle (`compose.subtitleBass`), piano ear-training copy
  (`earTraining.startCopyPiano`); first-visit notes only on teacher,
  chords, GuitarPro, improvise; GuitarPro: with a file open the song is the
  title (page h1 + "File" label screen-reader only), file + Add + ••• +
  Song|Practice|Chords on one row (Add = icon only on phones), the score
  went from ~140 px to ~430 px visible on the iPad; Songs left the Play
  segmented control — it opens from GuitarPro's ••• ("Find songs on the
  web", `gp.findSongs`; NAV_GROUPS play `also: ['songs']`, SongsView
  `onBack`); Teacher tabs Today | Goal | Path — the Coach is the Goal tab
  (CoachView `embedded`: no Plan | Rewards switch; Achievements = a row on
  Today -> sub-screen), Today's goal card, "Coach"/"מאמן" wording -> the
  teacher / goal everywhere (coach.js, teacher.opt.coach = Goal, banner),
  Practice "tell us your level" opens the teacher's Goal tab; Settings:
  signed out, the account is one row + Sign in (CloudField `formOpen`).
  v1.0.101: the Teacher home card is GONE (user's OK — it was the same
  door as Guitar -> Learn); beginners land on the Guitar card (homeCardFor)
  and its "Next lesson" pill / openNextLesson enter via enteredCardRef
  'guitar'. Its art (`public/home/teacher-3.webp`) stays in the repo for the
  Guitar card redesign (5 directions on a Design canvas,
  https://claude.ai/artifact/KGRGySQvj9p2aEUgB3nbaa).
  v1.0.102 — the user chose option 2 "one action": every instrument card
  (guitar, piano, bass, singing) has ONE primary button (`.home-primary`,
  accent fill, play icon that never mirrors, title + one line) above the
  shortcuts, which turn quiet (`.home-options.is-quiet`: no rule, smaller,
  grey). HomeMenu `primaryFor(card)`: (1) this visit was inside the card's
  instrument -> "Continue: <screen>" = App onContinue (exact state); (2)
  guitar + the teacher knows you + a written next lesson, and you're a
  beginner (experience none / little) or have no last screen -> "Start /
  Continue: <lesson>" (lesson · ~N min · step n of m) -> App openNextLesson
  (now opens the LESSON itself); (3) the instrument's last screen
  (`rememberPlace` / `lastPlace` in sections.js, device key
  `dudestar-last-section`, written by AppShell; practice adds its last tool)
  -> "Continue: …"; (4) guitar -> "Start with the teacher", piano / bass ->
  "Start practising", singing -> "Today's workout". The header pills
  ("Back to where I was", "Next lesson") are gone — the card's button does
  both. Phones: the art gives the button its height (`--home-art-h` on
  `.home-card:has(.home-primary)`). Guitar card text = the teacher first
  (`home.guitar.desc`). Text `home.primary.*` (tips/onboarding.js).
  Open: Improvise waits for his explanation. The teacher's intake
  (or the first run) fills the Goal planner's "about you"
  (`coachIntakeFromTeacher()` in onboardingState.js, applied in
  TeacherView when the coach has no intake) — the Goal tab starts at the
  goal step.

- HOME PRIMARY = THE TEACHER'S NEXT STEP (v1.0.160, 2026-11-07; user:
  "Continue sent me back to GuitarPro instead of my lesson — it should
  continue my LEARNING"; + "the teacher watches everything I play and
  sends me to strengthen each weakness"). App `homeLearnFor(inst)` ->
  HomeMenu `learnFor` (runs BEFORE "here" / last place): guitar = a lesson
  in progress · the goal (teacher solo goal / coach skill goal -> teacher
  home) · a weak spot · the next lesson; piano = a weak spot · today's
  pick (`forYou`, a tool not played today); bass = a weak spot · the next
  exercise for the level (`bassNext`: library order, not yet >= 90 %, not
  played today; opens the exercise via App `bassStart` ->
  BassPracticeView `start`, applied once per request). null -> the old
  fallbacks. Pure `coach/nextStep.js`: `weakSpot(inst, perf)` = guitar
  `findWeaknesses` (with a block) / piano ear, or the last 3-4 runs of one
  chord-rhythm / flow / bass item: notes < 75 % · |offset| >= 40 ms late /
  early · timing < 60 %; skipped when that tool / item was played today.
  perfLog entries now carry `instrument` (from the 'instrument' key);
  older ones: `instOf()` (chordRhythm / fallingNotes = piano, bass =
  bass, else guitar). Captions `home.primary.goal / weak / today / next /
  spot.*` ("Strengthen: Chord rhythm · 50% right notes lately").
  Playwright: 7 seeded scenarios (lesson in progress, coach goal, guitar
  slow direction, piano notes, piano today, bass next, bass late) give the
  right caption + open the right screen. Next stage (not built): detect
  weaknesses while PLAYING a song (GuitarPro song view has no mic yet).

- SETTINGS REDESIGN (v1.0.106, 2026-11-06; user: "do what you recommend";
  canvas https://claude.ai/artifact/5NSyeNP6J1hZBMtXW2Y6Gd): (1) inside an
  instrument the ⓘ round button is GONE — the avatar (`ProfileChip
  compact`: round glass button, popover portaled to <body> and placed fixed
  under the button by JS — the glass top bar is its own stacking context)
  holds: who you are + sync status, Settings, the ⓘ explanations switch
  (`components/SettingsPanel/SwitchRow.jsx` `InfoSwitchRow`), profiles.
  Settings from there = a SHEET over the screen (App `settingsSheet` ->
  `.settings-sheet` + ToolScreen `asSheet`: "Done" instead of Home; the
  screen stays mounted). (2) `SettingsBody` = an iOS Settings list
  (`.set-*` classes — NOT `.st-*`, Studio.css owns `.st-row`): account row
  (avatar, name, synced/sign-in), Instrument sounds · Microphone &
  calibration | Language · Display (appearance, playing hand, ⓘ switch) |
  Install · Advanced (shared library, YouTube, shortcuts, getting started
  again), version at the bottom; each opens its own page with "‹ Settings"
  (Escape = back to the list first). Every old field kept, on a page.
  Text `settings.page.*`, `settings.account.*`, `settings.explanations*`,
  `settings.done`, `profile.local`.
- SETTINGS SPLIT VIEW (v1.0.110, user's idea 2026-11-06): >= 900 px wide
  (iPad landscape / computer) SettingsBody is iPad Settings' split view —
  `.set-root.is-split` grid: the list (sticky, 280–340 px, reading-start
  side, no chevrons, chosen row = accent fill `.set-row.is-active`) | the
  chosen page with its title (default "Instrument sounds"). No back button
  there; Escape leaves Settings. Narrower = the phone drill-down.
  `useMediaQuery` in SettingsPanel.jsx. ToolScreen settings card 1040 px.
- HOME PRIMARY BUTTON = option A (user's pick 2026-11-06, v1.0.108; he
  disliked the full-width blue bar): `.home-primary` is a one-word tinted
  capsule (Start / Continue — `home.primary.btnStart|btnContinue`; accent
  text on 13 % accent, 44 px, play glyph never mirrored) + a grey 2-line
  `.home-primary-caption` (what it opens: lesson name · ~min · step / the
  last screen · "last time" / teacher / practice / vocal). Wide cards: in
  `.home-primary-row` whose `.home-primary-spacer` mirrors the art column
  (same 56 px padding / 32 gap / 42 % basis; landscape phones 32 / 16 /
  40 %), so it sits under the text column; `.home-card-main.has-primary`
  is 250 px (330 on tall tablets) with the text at its foot and the art
  keeping its full height. Phones: centred, no spacer. primaryFor()
  returns {label, caption, go}. Canvas: Guitar card canvas, row
  "הכפתור הראשי".
  v1.0.112: the row has NO dir (it must run like the card's art | text
  row, which follows the home page's direction in both languages — in
  English dir="ltr" put the capsule under the guitar); the column carries
  the language dir. Title + text + capsule lifted 20 px (~5 %, user's
  request) with the space given back above the shortcuts (row margin-top
  -26, column padding-bottom 38, text padding-bottom 34; phones +8 px gap).

- STAGE 7 polish (v1.0.114, 2026-11-06). Audit = scratchpad s7/audit.cjs
  (every home-card shortcut + its segmented 2nd section, phone 390 + iPad
  1180, light + dark = 112 screens): controls < 44 pt, text under WCAG AA.
  Fixes: (1) 44 pt HIT AREAS without changing looks — index.css gives a
  list of small controls an invisible `::before` grown to 44 x 44
  (`top/left/... : min(0px, calc((100% - 44px) / 2))`), rows of pills /
  segments / chips grow in height only, home dots 44 tall x half the gap;
  `position: relative` inside :where() so fixed/absolute controls keep
  theirs. A control whose OWN overflow is hidden clips its ::before — put
  the ellipsis on a child span (the group switch now has
  `.app-group-switch-label`). Instrument surfaces (keys, drum grid, device
  faces) are left alone. (2) Contrast tokens: light `--text-secondary`
  #636366 (was #6e6e73, 4.1:1 on chips), dark #a1a1a6; light `--accent`
  #006bd6 (was #0071e3, 4.3:1 as text on the grey ground); NEW
  `--accent-fill` for filled accent surfaces with white text (light
  #006bd6, dark #0a6cff — white on dark #0a84ff was 3.65:1); every
  `background: var(--accent)` in CSS now uses it; light `--danger`
  #d70015 (Apple's accessible red; #ff3b30 text was 3.55:1); placeholder
  opacity removed. Re-audit: only a muted GP track label, the DR-7's
  device-face "BPM" and a few 4.3:1 tints remain. (3) Motion tokens
  `--ease-ios` cubic-bezier(.32,.72,0,1), `--dur-fast/pop/sheet`; all
  drawers slide on it (was Material's .4,0,.2,1), popovers (MoreMenu,
  profile) scale+fade in, settings pages fade in; global
  prefers-reduced-motion = instant CSS animations/transitions (rAF
  playheads unaffected). (4) Dark mode: every screen screenshotted, no
  broken surfaces found. (5) Parity: piano / bass / singing already have
  the library lists, one header, no empty neck.

## Vocal: Apple-style home + Create group (v1.0.136, 2026-11-07)

- User: "go over singing again, upgrade the UI, add ideas for creativity".
  HOME (VocalTrainingView `.vocal-home`): title + ••• (MoreMenu: level
  Beginner | Advanced segmented + its note, "Test my range again"); ONE
  hero "Today's workout" (`.vocal-hero`: pink mic tile, "N exercises ·
  about M min", the names on 2 clamped lines, a tinted 44 pt capsule
  `.vocal-capsule` Start / Again — play glyph never mirrors); "Your voice"
  = a LibraryRow (voice type, comfortable range, Retest tag after 60 days)
  + RangeBar under it; "Progress" (streak, week average, 7 mini bars) ONLY
  once there are results; the library = iOS inset groups (LibraryRow with
  Apple colour tiles per category `CATEGORY_LOOK`, icons `EXERCISE_ICON`,
  best score = neutral grey tag — LibraryRow gained `tagTone` /
  `.ph-tag.is-neutral`), order `CATEGORY_ORDER` warmup, pitch, scales,
  create, ear, agility, range; grid columns minmax(min(320px,100%),1fr)
  (the <=480 px `.ph-desc` nowrap made a plain 1fr track 518 px wide on a
  phone). The section's scoped pill-button CSS skips `.ph-row` /
  `.more-menu-*` (`:not(:where(...))`). Eyebrows no longer uppercase.
- CREATE (pure `music/vocal/creative.js`, category 'create'): `harmony`
  (L1; hear a stepwise melody, sing the diatonic 3rd above; cue = chord +
  melody + the harmony's first note; melody drawn as grey bars
  (`rep.melody`) and played under the singing with Guide (`rep.guide`);
  scored like any pattern), `harmonyLow` (L2, `below`), `answer` (L1;
  question & answer: the piano asks one bar ending on 2 or 5, the singer
  answers one bar + 1 beat freely), `scat` (L2, kind `improv`: I–vi–IV–V,
  cue = the loop at 2 beats a chord, then 4 bars with a soft tick per beat
  (`rep.ticks`, 1.8/2.4 kHz = above the mic range), Guide = the chords).
  Free reps carry `free {root, scale, chords[{start,end,pcs,name}], home}`
  + `span`; `analyzeFree()` segments settled notes (>= 0.12 s) and scores
  0.45 in key + 0.2 chord tones + 0.15 (answer: ends on the tonic chord /
  scat: chord tones on the chord changes) + 0.1 settled pitch + 0.1
  variety; `diagnoseFree()` tips `vocal.tip.free*`. PitchRoll: free = the
  key as lanes (sounding chord's tones green, other key notes faint), bar
  lines + chord names, the voice coloured chord / key / outside
  (`freeClass`); legend + "In the key x% · chord tones y%" in the runner.
  Daily workout: one creative exercise a day (rotating) before Steady
  tone. Methods: Kodály / choir two-part thirds, Stoloff "Scat!" (Berklee),
  Michele Weir "Vocal Improvisation" (text ours). Text
  `i18n/tips/vocalcreate.js`. Synthetic checks: perfect harmony = 100,
  in-key answer ending home 92, out-of-key 20, silence 0; fake-mic runs
  of answer / scat end with scores + tips, no errors. NOT verified with a
  real voice.

## Architecture essentials

- **Home screen** (`components/HomeMenu/`): opens first (App `home` state;
  rendered INSTEAD of AppShell). A light carousel of instrument cards
  (guitar, piano, bass, singing — art in `instrumentArt.js`, static SVG;
  the GUITAR card is now the user's Les Paul-style photo (2026-10-26) `public/home/guitar-lp.webp` (640x1059, an <img> like the teacher card, CSS `.home-art-guitar img` heights 300 / --home-art-h / 170 landscape / 390 tablet, no CSS rotation, own floor shadow kept as black+alpha by `scripts/home-art-key.py <src> <out> <width> 0 shadow` — DON'T rerun `scripts/home-art-guitar.py` with an arg, it would write the old SVG back); the BASS card likewise = the user's P-bass-style photo (2026-10-26) `public/home/bass-pb2.webp` (606x1100, maple-neck version), rotated to the guitar photo's lean (23° from vertical; was 42°) with its shadow removed and a horizontal one redrawn, by `scripts/home-art-bass-photo.py <src>`; same `img` CSS as the guitar; the PIANO card = the user's grand piano photo (2026-10-26) `public/home/piano-grand.webp` (820x883; floor keyed as black + alpha = darkness so the soft shadows stay; CSS `.home-art-piano img` 290 / --home-art-h / 160 / 370); the SINGING card = the user's studio mic (pop filter, boom arm) between two glowing app panels (2026-10-29, replaced vocal-mic3) `public/home/vocal-mic4.webp` (900x763 from a 1024x1024 JPG; bottom 3.5 % faded), made transparent by colour-to-alpha from white (`scripts/home-art-color-to-alpha.py <src> <out> <width>` — keeps the blue glow as a tint; looks right on the light cards only), same CSS group as piano/tools; the old mic SVG came from `home-art-mic.py`; the TOOLS card = the user's studio photo (2026-10-26: kit, DudeStar amp, pedalboard, metronome, reel-to-reel on a stand, mics) `public/home/tools-studio.webp` (900x750) keyed by `scripts/home-art-tools-photo.py <src> <out>` (border flood + white pockets between cables, drum heads / tape deck kept, the 243-grey page = transparent, shadows black+alpha); the old drawn scene is `scripts/home-art-tools.py` — DON'T rerun it with an arg (it writes the SVG back).)
  in the style of a GarageBand-like instrument browser: art + title +
  description, shortcut row (always LTR: Compose leftmost) filtered by `supportsInstrument()`, swipe /
  arrows / dots / arrow keys / mouse wheel. NOT a scroll container: an
  endless ring drawn by JS (`draw()`: each card is translateX'd by its
  ring distance `ringDist(i, pos)` from one float position `pos`, plus the
  "drum" rotateY ±33° (TURN_DEG; TURN_DEG_PHONE for <=640px, currently equal) / scale / fade; `animateTo()` eases `pos` to an
  integer target). On screens wider than a phone the step is
  max(card + gap, half the screen + half the shrunk card + 24) so the
  neighbours wait just OFF screen at rest and slide in with a swipe (user,
  2026-11-01: card edges peeked in at the iPad's sides); phones keep card +
  gap. Pointer drag follows the finger but is held to ±1 card
  and settles one card per swipe (share/velocity threshold); a drag
  suppresses the click. The home screen is pinned (`.home-menu` position:
  fixed, `html.home-locked` = no document scroll/bounce while it's up) so a
  vertical swipe moves nothing; the track keeps `touch-action: pan-y` — with
  `touch-action: none` a vertical drag swallowed the NEXT tap's click. Native scrolling was dropped because on iPhone it
  flickered, skipped several cards on a fast swipe and the 3x-copies loop
  ran out. WebKit (iPhone/Safari)
  rules for anything inside a card: NO nested 3D transforms (the piano art
  is a 2D `scaleY rotate` — a perspective/rotateX there was thrown into the
  card's corner on iPhone) and no `background-clip: text` + filter titles
  (flicker) — dark titles use text-shadow. No WebKit in this container to
  test with; the user checks on his iPhone. The app opens on the card the profile's first-run answers point to
  (`homeCardFor()`: guitar new/few -> Teacher card, guitar songs -> Guitar,
  else that instrument's card; skipped/unanswered -> Guitar — user approved
  2026-10-31, replacing "always Guitar"); back from inside an instrument (logo) =
  that instrument's card — more exactly the CARD the page was opened from (App `enteredCardRef`, set from HomeMenu's `card` on open; the Singing card opens Vocal with the guitar still selected, so the instrument alone sent Home to Guitar; user's request 2026-10-17). Upright phones (<=640px): the art height is `--home-art-h` = clamp(96px, 100dvh − 560px (−528 on short screens), 244px) and 5–6 shortcuts sit in 2 rows of 3 (7–8 in 2 rows of 4 — the Guitar card has 7 since Studies was added 2026-10-20), so card + dots + profile chip always fit (iPhone 15 Pro in Safari, ~790px tall, hid the dots — 2026-10-19). Phone sideways (`orientation: landscape` + max-height 520px): a low card (art beside the text, one row of shortcuts) sized to fit under the logo, notch-safe padding. `onOpen({instrument, section,
  practiceTab})` sets them in App. The home button (desktop top bar) / logo (phone/tablet,
  AppShell `onHome`) returns to it; "Back to where I was" appears after the
  first visit. A 5th card, **Tools** (not an instrument), has Metronome /
  Tuner shortcuts: `onOpen({tool})` opens `components/ToolScreen/` — the tool
  ALONE on its own screen (App `toolScreen` state, rendered instead of home /
  AppShell; NO Metronome | Tuner switch (removed, user's request), Home button / Escape -> home on the
  Tools card via `initialCard`; leaving stops the metronome). It uses the
  same `metronome`/`drums` instances as the app pills. The Tools card's 3rd
  shortcut is Settings: the same `SettingsBody` (exported from
  SettingsPanel.jsx, shared with the app's settings drawer via App's
  `settingsProps`) on its own page, with `allSounds` (guitar/piano/bass
  sound pickers all shown). Tuner title = "Guitar Tuner"/"Bass Tuner".
- **Steady tuner (v1.0.115, user: "jumps a lot and fast")**: GuitarTuner
  reads `useSteadyPitch(rawFrequency)`: median of the last 120 ms (kills
  outliers / octave slips), then an exponential glide (0.12 per frame,
  ~130 ms) for moves under 60 ¢ — the steady state is the exact value; a
  jump over 60 ¢ (another string) needs 3 agreeing frames, then snaps;
  silence HOLDS the last reading 0.8 s. Cents / Hz numbers update at most
  8x/s (`useThrottled`); LEDs + strobe stay live. Fake-mic pluck at
  A2 +3 ¢: displayed cents changed 11x in 3 s (incl. a −7 blip) before, 0x
  after (+3 throughout). Pitch detection itself (usePitchDetection) is
  unchanged. Home cards: the art sits 28 px below the card's top edge on
  wide cards (the headstock touched it).
- **Tuner, guitar + bass**: `GuitarTuner mode='guitar'|'bass'`. Bass =
  `usePitchDetection(BASS_PITCH_RANGE)` (4096 window, 35–500 Hz; other
  callers keep the guitar default 2048 / 60–1500) and its own blue display
  (`.is-bass`: ice-blue in tune, amber close, rose off). The pill shows on
  guitar AND bass pages (bass pages -> bass mode; piano hides it). Tool
  screen: Guitar | Bass switch, default guitar (App `tunerMode`; the Bass
  card's own Tuner shortcut was removed at the user's request — the
  plumbing for opening it in bass from a card is still there).
  Switching mode while listening restarts the mic.
  LOOK (user's request 2026-10-16): a studio desk tuner (GuitarTuner.jsx/css,
  `.tn-*`, always LTR, same in light/dark): black body with model plate
  GT-6 / BT-4 + power LED; glass screen with GUITAR/BASS lamps, A4 = 440 Hz,
  LED note + Polytune-style ▶ ◀ arrows, a 41-LED meter (2.5 ¢/LED, needle +
  dim trail), a STROBE band moved by rAF at cents × 1.6 px/s (still when in
  tune), cents + Hz readouts, string lamps; on the face the TUNING LCD (the
  <select> sits invisibly over it) with ◀ ▶ step keys and the POWER key.
  POWER key (v1.0.165, user): twice as wide (`.tn-power-wrap` flex-basis
  min(226px, 46%), the key 100 % of it), taken from the tuning LCD; Start
  and Stop the same size (was 113 / 77 px); narrow (<400) = full row.
  v1.0.166: the tuning LCD text and its TUNING label are centred.
  v1.0.167: a non-standard tuning = orange LCD (`.tn-lcd.is-alt`, text
  #ffb340 + warm glass), standard stays green.
  Bass = ice-blue palette via CSS vars on `.tn-body`. The tool screen shows
  it without a card (`.tool-screen-card.is-device`). Pitch logic unchanged.
  ACCURACY (2026-10-16, user saw a piano note read "needs tuning"): McLeod
  alone reads inharmonic tones SHARP (piano B=0.0004 -> +8 ¢, outside the
  ±5 ¢ green zone). The tuner (TUNER_PITCH_RANGE / BASS_PITCH_RANGE,
  `refine: true` — other mic features keep the default) now refines with
  `refineFundamental()` (pitchUtils.js): complex demodulation at the first
  estimate over a one-period boxcar -> phase slope = the fundamental's exact
  frequency; when the fundamental is weak/missing (phone speaker) partials
  2 + 3 give B and f1 (f_k = k·f1·√(1+B·k²)). Measured: piano 0-1 ¢, guitar
  0, missing fundamental 0. Test: `scripts/tuner-accuracy-test.mjs`.
  The app's acoustic piano = Splendid Grand Piano recordings (smplr), a real
  piano — not measurable here (sample host blocked).
  iPhone "tuner hears nothing" (2026-10-16): usePitchDetection now does what
  useVocalMic (works on iPhone) does — `prepareAudioOutput()` IN the tap
  before getUserMedia (the shared context may otherwise be created after the
  await = outside the gesture = stays silent on iOS), `reviveAudioOutput()` +
  resume after it, and a backstop resume in tick() while the context isn't
  running. `deadInput` (exact digital silence > 1.5 s, not a quiet room)
  shows `tuner.noSignal` in the tuner's status line. NOT verified on a real
  iPhone (no WebKit here) — Chromium can't reproduce iOS gesture rules.
  The user's iPhone then showed `tuner.noSignal` (mic open, pure digital
  silence) => the SHARED context stayed paused. Tuner ranges now carry
  `ownContext: true`: usePitchDetection creates its own context
  (`createLiveContext()`, the Recorder/Amp pattern that works on iPhone) and
  resumes it IN the Start tap, routes analyser -> gain 0 -> destination (keep
  the graph pulled), reuses it across stop/start + Guitar<->Bass restarts
  (those happen outside a tap) and closes it on unmount.
  Still silent on the iPhone after that (2026-10-16) -> after getUserMedia, a
  context that isn't running is replaced by a NEW one (WebKit lets a page
  that is capturing start audio without a gesture); every resume() await is
  bounded (`settle`, 400 ms — a refused resume can stay pending forever);
  any tap while listening resumes a stopped context; with `tuner.noSignal`
  a small LTR diagnostic line (`.guitar-tuner-diag`: ctx state/rate, mic
  track readyState/muted, audioSession type) — ask for a screenshot of it.
  The iPhone diag then read `ctx running · 48000 Hz · mic live · session
  auto` with pure zeros => WebKit's AnalyserNode gave nothing while the
  Recorder's AudioWorklet capture works. The tuner now reads its frames from
  an AudioWorklet tap (`audio/micTap.js`, mono blocks -> ring of 2x fftSize)
  and uses the analyser only when the tap has no data; it also asks for
  `channelCount: 1` like the Recorder. Diag prefix: `wk|an an <peak> wk
  <blocks>/<peak>` (which path fed the frame).
- **Tuner drawer never scrolls (v1.0.152, user's computer: the drawer
  opened with a scrollbar)**: it reserved 160 px for the neck below, so on
  a short window (browser zoom / small laptop, < ~700 px) the 543 px tuner
  didn't fit. Now max-height = 100svh − 16 (the tuner needs no neck) and
  TunerBar.jsx scales the device with CSS `zoom` to the room left when even
  that is too short (min 0.5; refit on resize). Checked 1024x460 (zoom
  0.79), 960x600, 1280x650, 1440x900, 390, 820: no scroll.
- **Tool drawers never scroll (v1.0.154; user's computer: the drum
  machine drawer scrolled both ways, Kit (v1.0.148) made 3 LCDs beside the
  BPM display overflow)**: `hooks/useFitDrawer.js` (tuner, metronome and
  drums drawers) zooms the drawer BODY (not React's root — and the ref must
  be on the drawer, not the scrim) to the room left, rechecking because a
  zoomed body lays out wider; metronome drawers max-height 100svh − 16,
  overflow-x hidden. Drum machine top = the BPM display as its own row
  (− 120 + BPM inline), then Style · Kit · Time (`drums.meter`) in one row
  (grid 1.35 / 1.1 / 0.8). Metronome drawer: no duplicate title, wood
  `min(276px, 76%)` so it is the drums drawer's height (610 vs 625 px).
  Checked 1440x900, 1280x720, 1024x600 (zoom ~0.92), 390.
- **No page bounce (v1.0.116, iPad: "the Learn page drags up and down")**:
  html + body `overscroll-behavior: none` (body had `contain`, which still
  lets iOS rubber-band the page itself — the bars moved with the finger;
  every screen scrolls inside `.app-section-content`, now `contain`, and the
  document never needs to move — measured scrollHeight = innerHeight at
  390 / 820 / 1180). `.app-topbar-nav` `overflow-y: hidden`: the stage-7
  44 pt hit areas stuck out 4 px and made the top bar a vertical scroller.
  Install / privacy pages still scroll (none only stops the bounce).
- **Navigation inside an instrument (AppShell)**: NO hamburger drawer and NO
  Guitar/Piano/Bass switch any more — the instrument is chosen on the home
  screen (logo = back home). Desktop (>=900px): `.app-topbar` = on the LEFT
  the logo + home button (`.app-topbar-brand`, both -> the cards), then that
  instrument's features (`visibleSections`, as `.mode-toggle.wrap` pills,
  always LTR — Compose leftmost in both languages; icons only <=1360px;
  `justify-content: safe center` so an overflow scrolls instead of clipping
  the first pill), then metronome, tuner, info. `vocal` is never in an
  instrument's nav (singing has its own card); inside Vocal there are NO
  section tabs and NO metronome (AppShell `bare`/`.is-bare`, App passes no
  metronomeSlot and stops a running metronome on entering Vocal — it would
  also reach the mic); no tuner either — only logo/home + info (user's request). NO settings gear inside the app —
  Settings are only on the home screen's Tools card (user's request).
  Phone/tablet: logo top-left, info top-right,
  metronome/tuner bar + feature tabs at the bottom.
- **Status bar (iPad / iPhone)**: the page runs under the status bar
  (viewport-fit=cover + black-translucent). v1.0.83 added
  `env(safe-area-inset-top)` to home `.home-top`, the desktop `.app-topbar`
  and GuitarPro's 98px calcs (user saw the iPad clock / battery / Wi-Fi
  covered) — REVERTED in v1.0.85 at the user's request ("the whole display
  got smaller on the iPad, put it back"); v1.0.87 put it back for the INNER
  pages only (user's request 2026-11-01 with iPad screenshots): the desktop
  `.app-topbar` (padding + min-height) and GuitarPro's 98px calcs add the
  inset; the HOME screen stays without it (its header sits fine under the
  clock). Home card sizes were never changed by code (HomeMenu.css identical
  since 2026-10-29). Tool screen, songwriter, onboarding, install / privacy
  pages kept their older safe-area padding.
- **Round Home button** (`components/HomeButton/HomeButton.jsx`, user's
  request 2026-10-16): replaces the logo at the top of every inner page —
  AppShell desktop top bar (`.app-topbar-home`), phone/tablet top-left
  (`.app-mobile-brand`), ToolScreen top-start (`.tool-screen-home`, also
  replaced the "‹ Home" text link). The logo stays only on the home screen.
  Phone/tablet (<900px): a FIXED top strip (`--mobile-top-strip` = safe-area
  + 6 + 37 (button) + 6 px, as low as possible — user's rule: the strip stays,
  everything else scrolls); buttons at `--mobile-top-pad` (6px) + safe area;
  content starts at `--mobile-top-clear` = strip + 10px — the old fixed 68px put the title on the
  Home button under the iPhone's Dynamic Island — and `.app-shell::before`
  is a fixed translucent blurred strip (z-index 5, buttons are 6) behind the
  Home / ⓘ buttons so scrolled content never covers them.
- **Metronome look** (user's choice 2026-10-17, option 3 of 5 + a drum
  machine): the metronome (`Metronome.jsx`, tool screen + app pill drawer)
  is the wooden face only; the DRUM MACHINE is its own tool (user's request
  2026-10-17): `DrumMachine.jsx`, Tools card shortcut `drums` (snare icon,
  `drums.nav`/`drums.title`), ToolScreen `is-device` — both over the SAME
  useMetronome/drums state. Never both (user's call): the drum machine has
  NO source keys — its Start sets the source to 'drum' (drums only), the
  metronome's Start sets 'standard' (click only), and leaving the drum
  machine resets the source to 'standard' (drills/recorder click again). WOOD: `WoodMetronome.jsx` — an SVG walnut pyramid
  (Maelzel style), the pendulum swings by rAF and passes the CENTRE on each
  click (angle = side·24°·sin(π·phase), phase from the onBeat time; settles
  to rest when stopped), the brass weight sits at the tempo on the ivory
  scale (log 30..300, higher = slower; numbers left of the rod), a TAP on
  it = 120 (user's rule), a drag (>6 px) slides the weight RELATIVE to where
  it is at 0.35x the finger's travel, arrow keys ±1/±10, beat lamps on the base (accent amber). Below:
  theme-coloured tiles (BPM via `BpmField` −/+ hold-to-repeat + type-in,
  time signature, sound), volume, Tap / Start. DRUMS: an 808-spirit unit
  (`.dm-*`, physical = same in light/dark, `dir="ltr"`): orange BPM display,
  one coloured step pad per beat lit on the beat, style LCD select, Fills
  latching key, kick/snare/hi-hat faders + M keys, volume, Tap /
  Start. `TIME_SIGNATURES` + `VolumeRow` are exported from Metronome.jsx. CSS in
  WoodMetronome.css; Metronome.css stays (others use `.metronome-toggle`).
- **Drum machine = step sequencer** (user's choice 2026-10-17, option 1 of 5
  + own patterns): `DrumMachine.jsx` shows the pattern as a grid (a row per
  drum, a column per step of the bar, beat numbers, a white playhead from the
  engine's `onStep` -> `drums.subscribeStep`). Full kit in `music/drumKit.js`
  `DRUM_INSTRUMENTS` (16 rows: crash, ride, ride bell, open/closed/pedal hat,
  3 toms, snare, rim, clap, kick, cowbell, tambourine, shaker; synthesized in
  drumSounds.js) with mixer groups kick / drums / cymbals / perc (`MIX_BUCKET`,
  4 faders; mix key `perc` added). View shows only the rows a pattern uses;
  `Kit` shows all; tapping a row name PLAYS that drum once (`drums.previewInstrument`,
  at its mixer level, name flashes — user's request 2026-10-17; it used to mute
  the row: `rowMutes` is still in the engine but has no UI). Tapping a square (or Edit / New) starts a DRAFT (`drums.draft`, played
  live — the engine reads `getPattern()` every step): tap cycles full -> soft
  (0.5) -> off; Name, Grid select (8ths / triplets / 16ths, `changeResolution`
  moves hits to the nearest step), the draft follows the time signature;
  Save / Clear / Cancel / Delete. Saved patterns per profile in
  `dudestar-p-drum-patterns`, selected as style key `user:<id>` (select has a
  "My patterns" optgroup; disabled while editing). Engine: role =
  beatIndex % cell.length (built-ins are 4 beats = unchanged), fills only
  for built-ins. The recorder studio's DR-7 Style select lists them too
  ("My patterns" optgroup): choosing one COPIES it into the song
  (`project.drums.pattern` {name, stepsPerBeat, cell}, style `user:<id>`), so
  the song keeps its groove if the pattern is later edited/deleted;
  `drumHits()` plays `drums.pattern` when present (role = beat % cell.length).
- **Real drum kits (v1.0.148, user: "the drums sound artificial, make
  them closer to reality")**: recorded samples instead of the synth —
  GeneralUser GS's drum kits Standard 1 / Power / Jazz (bank 128 progs
  0 / 16 / 32; its licence allows use, copy in public/drums) rendered with
  fluidsynth (`scripts/drums/sf3to2.py` decodes our .sf3 back to .sf2 —
  fluidsynth 2.3 crashes on sf3 — then `scripts/drums/render.py`: the 16
  instruments x 2 velocity layers (64 / 112), onset-trimmed, -60 dB tail
  cut, one normalisation per kit) into ONE FLAC per kit
  (`public/drums/{studio,rock,jazz}.flac`, ~1 MB each; FLAC = no encoder
  delay, hits stay on time) + the frame map `audio/drumKitMaps.js`.
  `audio/drumSamples.js`: kit = device key `dudestar-drum-kit`
  (`DRUM_KITS` studio / rock / jazz / electronic = the old synth, default
  studio), `loadDrumKit()` (fetch + decode once, sliced into AudioBuffers
  usable in any context — live, the studio's and offline renders),
  `playSampledHit()` (soft layer under velocity 0.62, ±8 % gain / ±8 ¢ on
  cymbals + shakers, closed / pedal hat CHOKES a ringing open hat);
  `playDrumHit()` tries it first, else synthesizes (also until the kit has
  loaded). Every drum user goes through playDrumHit: drum machine,
  metronome drums, studio DR-7, songwriter band. Preloaded by
  startDrumEngine / prepareBand / studioEngine / DrumMachine mount. Drum
  machine: "Kit" LCD select (`drums.kitSound.*`). vercel.json caches
  /drums/* 30 days (a re-render needs NEW file names). Playwright: studio
  kit fetched + 20 sampled hits in 3 s, no oscillators; electronic = synth
  again; jazz loads on choice. Sound itself not judged by ear here.
- **Drums pill** (`MetronomeBar/DrumsBar.jsx`, user's request 2026-10-17):
  wherever the metronome pill is (App's `metronomeSlot` now = MetronomeBar +
  DrumsBar), a same-shape pill (snare icon + `drums.nav`) opens the same
  drawer style with `DrumMachine` in it. Closing the drawer leaves the drums
  playing; only the tool SCREEN passes `resetOnLeave` (source back to
  'standard' on leave). Pills light per source: metronome pill = running and
  source != 'drum', drums pill = running and drumsActive.
- **Metronome + Tuner pills** (`MetronomeBar`, `TunerBar`) live only in the app
  pages: desktop in the top bar (`.app-topbar-tools`); tablet/phone in the bar above the
  bottom tabs. Each is mounted twice (one hidden by CSS), so anything that
  opens a drawer programmatically must pick the visible one. Home also
  scrolls the carousel with the mouse wheel / trackpad: ONE card per gesture
  (a gesture ends after 220 ms without wheel events; after its step the rest
  of the stream — a Mac trackpad's inertia tail — is swallowed; the old
  450 ms time lock let one swipe move 3-4 cards, user 2026-10-31). A swipe
  that starts while the tail still runs (no pause) is found by the deltas
  RISING again after they had decayed below half their peak (avg of the last
  3 > 1.6x the 3 before, > 4) — without it a 2nd swipe did nothing until the
  cursor moved (user). Tested: 1 long swipe = 1, back-to-back swipes = 1 each. GuitarPro's
  score height subtracts the 64px top bar on desktop.

- **Chord Library** (nav `chords`, guitar only, Guitar card shortcut FIRST,
  before Compose (user's order); user's request 2026-10-19 after a chord-library screenshot +
  review of GtrLib / Ultimate Guitar / Chord! / JustinGuitar forum asks):
  `components/ChordLibrary/` (ChordLibraryView, ChordBox diagram,
  ChordsNavIcon) + pure `music/chordLibrary.js`. 29 chord types
  (`CHORD_TYPES`: triads, power, sus, add9, 6, 6/9, all 7ths, m7♭5, 9/♭9/♯9,
  11, 13; `base` = the CHORD_QUALITIES key Compose/Changes know, else null)
  x 12 roots, in any GUITAR_TUNINGS tuning. Voicings are SEARCHED
  (`findVoicings`): per 4-fret window every string muted/open/a chord tone;
  kept when the lowest note = the bass, every non-optional tone sounds,
  ≤1 muted string inside, span ≤3, and `fingerChord()` finds ≤4 fingers
  (barre only when >4 notes; no open string under the barre; a 2nd partial
  barre if needed; fingers by fret then from the bass string). Scored for
  difficulty; the app's own SHAPE_TEMPLATES shapes (standard tuning, root
  bass) get a bonus so open + CAGED barre shapes always show.
  `libraryVoicings` = best 8 (6 for inversions), no subsets of a better one,
  ≤2 per neck area (3 open), in neck order, `easiest` flagged. Bass select:
  root position + all inversions as groups (default), one inversion, or a
  slash bass (any other note, only under the chord). Spelling = theory
  spelling except double accidentals / Cb Fb E# B# (plain name). Labels on
  the neck: notes / intervals / fingers (the position carries
  `fingers` — Fretboard now uses `position.fingers ?? assignFingers()`).
  Strum / Pick (`playMidis()` in chordPlayer.js, any tuning), Add (appends
  `appSymbol()` to Compose's progressionText), Practise changes select ->
  `launch({tool:'minuteChanges'})`; MinuteChanges now accepts any parseable
  chord (`CHANGES_CHORDS` exported). Prefs per profile
  `dudestar-p-chord-library`. Text in `i18n/tips/chordlib.js`. Left-handed
  mirrors the diagrams too. Capo not in v1.
  SIMPLE BY DEFAULT (user's call 2026-10-19, "like Ultimate Guitar"): a key
  pill strip (12) + a type pill strip (`QUICK_TYPES`: major minor 7 maj7 m7
  sus2 sus4 dim aug add9 5; a type chosen in Advanced is appended), ONE big
  diagram (root position) with ‹ › through the shapes IN NECK ORDER, open
  position first (user's rule 2026-10-19; was easiest-first), "n / N",
  Strum; tap the diagram = strum. The strips are single scrolling rows (the
  chosen pill is scrolled into view) — a deliberate exception to the >2
  options = <select> rule, at the user's request. `Advanced` (pref
  `advanced`) shows everything else: full type select, bass/inversions,
  tuning, neck labels, notes + formula, Pick / Add / Practise changes, the
  grid of all shapes in groups. Simple view always uses note labels.
  The Chords section has NO metronome / drums / tuner bar (AppShell
  `noTools`, `.no-tools` zeroes `--mobile-metronome-height`; user's request).
  Phone/tablet (<900px): the neck/keys sit RIGHT ON the bottom tabs
  (`.no-tools .app-content` padding = tabs only — the phone rule's fixed
  60px left a gap and pushed the neck up over the diagram), the piano
  console is hidden and the keys are 124px (`keyHeight` prop, App
  `narrowScreen`), and the chord card is compacted with the diagram sized
  from the room left (100svh − --stage-height − tabs − top strip − chrome)
  so the whole card shows above the neck. Too-short screens scroll.
  ‹ › sound the new shape / inversion unless the speaker toggle next to
  Strum / Play is off (`AutoPlayToggle.jsx`, pref `autoPlay` in both
  libraries' prefs, default on; user's request 2026-10-19). Strum / Play
  and a tap on the diagram always sound.
- **Chord Structure** (Studies course `chordBuilder`, "מבנה אקורדים", guitar
  only for now — piano later; user's request 2026-10-20): every chord type =
  the open E or A chord with 1–2 fingers moved (1 fret = 1 semitone), then
  barred up the neck like the plain barre chords (barre at 3 = G / C).
  Pure `music/chordBuilder.js`: `BUILDER_TYPES` (open shapes per family E/A,
  `from` = parent shape; null + `whyE/whyA` when a family can't play it as a
  barre: sus2/add9/6/dim7 only A, 9 only E), `shapeMoves()` (lift / press /
  up / down / mute per string, with old -> new interval), `shapeTones()`,
  `LESSONS` = map (1-3-5), slide, 14 types, quiz. Every shape verified (right
  tones, root in the bass, `fingerChord` playable at fret 3).
  UI `components/ChordBuilder/ChordBuilderView.jsx`: lesson <select>, role
  legend (1 orange / 3 blue / 5 green / 7 purple / 6-9-11-13 amber),
  Start -> Result ChordBox diagrams (ChordBox props `roleColors`, `moved` =
  pulsing ring, `ghosts` = dashed old spot), move list, Before / After, barre
  slider (Stage neck shows the shape there via App `chordBuilderStage`),
  practice "Play X" with mic: Listen / Show / Next. Prefs per profile
  `dudestar-p-chord-builder`. Text `i18n/tips/chordbuilder.js` — Hebrew
  strings use maqaf (־) and LRI/PDI-isolated Latin/number tokens, or bidi
  scrambles "ל-2" / "♭7".
  MIC: `judgeShape()` = cosine of the averaged chroma vs the shape's
  harmonic model (8 partials, 1/k^0.7) and vs rivals (parent shape, same
  shape ±1 fret); must beat each by 15 % of the models' gap; 2 passing
  0.5-s checks in a row. `useMicChordDetector` gained `averageChroma()`:
  frames near the strum's attack only (within 10 dB of the loudest recent),
  chroma computed with `computeChroma(..., {maxCents: 22})` (new option:
  drops off-tune partials, e.g. G's 7th harmonic that read as F). Synthetic
  Karplus-Strong test: ~63 % of right chords, ~5 % of parents accepted —
  weakest add9 / 9 / dim7. NOT verified on a real guitar yet.
- **Piano Chord Library** (same nav `chords`, now guitar + piano; Piano card
  shortcut first; user's request 2026-10-19, ideas from Piano Companion /
  PG Music Piano Chord Dictionary): `PianoChordLibraryView.jsx` + `KeysBox.jsx`
  (SVG keyboard diagram: RH keys green, LH blue, root ringed orange, finger
  numbers on the keys, names under) + pure `music/pianoChordLibrary.js`
  (types/names/spelling shared with chordLibrary.js). Voicings are RULE-built
  (`pianoVoicing`): close (one hand, `packed()` = bass + the rest inside the
  octave above), two hands (LH root + plain 5th, RH the triad / colour notes,
  RH always above the LH), spread (drop 2), shell (LH root, RH 3rd+7th(+top
  ext)), rootless (Bill Evans A 3-5-7-9 / B 7-9-3-5, 13 replaces 5, natural 9
  added; not for m7♭5/dim7/7sus4). Standard fingering (RH 1-3-5, 1st inv
  1-2-5, 4 notes 1-2-3-5; LH 5-3-1 / 5-2-1 / 5-3-2-1). Simple view: key +
  type strips (`QUICK_TYPES` has 6 instead of 5), one diagram, ‹ › = the
  inversions (forms A/B for jazz voicings), Play. Advanced: full type,
  Voicing select, bass (inversion / slash), notes + formula, Pick (arpeggio),
  Add (Compose). Piano-only "You play": the Stage keyboard's `onNoteEvent`
  (App `pianoChordNoteRef`) -> held keys + keys tapped in the last 1.5 s ->
  `identifyPianoChord()` (all 29 types + slash) and ✓ when the pitch classes
  equal the shown chord's. Stage: `playNotes` {midi, hand} + `fingerNumbers`.
  Prefs per profile `dudestar-p-piano-chord-library`. Text `pchord.*`.
  Icon on piano (user's request): a keyboard with a 3-key chord marked
  (HomeMenu `pianoChords`; `ChordsNavIcon` picks it via useInstrument()).
- **Piano Chord Rhythm** (`useChordRhythm`, `ChordRhythmPanel`): the clock
  starts on the metronome's FIRST click (`waitingRef`, `currentBeat` effect,
  700 ms fallback) and the lead-in is a whole number of beats, so chords
  land on the clicks. While running every key is playable/audible
  (`quizKeys` = all 88; judging only for the open window, a press up to
  `EARLY_S` 0.25 s before the next window counts for it). "Show keys"
  (`showKeys`, localStorage `chord-rhythm-show-keys`) lights the next
  unjudged chord's tones via `quizRevealKeys` as soon as its block appears.
  Start scrolls the lane into view.
- **Piano FreePlay** (nav `freeplay`, piano only; `components/FreePlayView/`;
  App hides the Stage for it and passes `stagePianoProps`): a big
  PianoKeyboard — `visibleOctaves` (1/1.5/2/3, default 2, 1 on phones) fills
  the width from `startMidi` (C4/G3/C3/C3), keys ~6x as tall as wide up to
  `maxKeyHeight` (room left on screen). Sustain pedal: `sustain` prop
  (released keys go to `pedalHeldRef`, stopped on pedal up; acoustic
  `playPianoNoteOn(midi, {pedal})` rings 6 s) — Pedal button toggles, Space
  held = pedal. `onNoteEvent({type, midi})` (all free-play inputs) feeds the
  live chord (`chordReadout` LCD, flats) and the recorder (events in
  localStorage `dudestar-freeplay-recording`, played with
  `schedulePianoNotes`, keys lit via `playNotes`). Scoped button CSS to
  `.freeplay-controls` — a `.freeplay-view button` rule restyled the keys.
- **Piano glissando (touch)**: sliding a finger across PianoKeyboard plays
  each key it passes (`handleTouchMoveKey`: elementFromPoint ->
  `.piano-key[data-midi]`, releases the previous key per touch id). Free
  play only — quiz keys still need a deliberate tap.
- **Ear training sound per instrument (v1.0.155; user: piano ear training
  played GUITAR notes)**: `audio/earTrainingPlayer.js` always used
  chordPlayer's guitar `playNote`; now `setEarTrainingInstrument()`
  (called by useEarTraining each render with the context instrument) picks
  `playPianoNote` on the piano, the guitar otherwise (ear training exists
  only on guitar + piano). Checked: piano quiz notes go through the piano
  path (fallback-oscillator note length 1.45 s = piano vs 1.65 s guitar
  before; samples blocked here).
- **Ear Training on piano**: a melodic answer (direction, melodic interval,
  scale id) is revealed one key at a time in play order, looping
  (`useSequentialReveal` in EarTrainingModal, 650 ms/note; useEarTraining
  holds auto-advance that much longer). The reveal line is always rendered
  for choice questions (`.is-pending` = hidden placeholder, min-height) so
  the instrument never jumps when the answer appears.
- **Practice opens empty**: the tab row is one line (`.mode-toggle.wrap.practice-tabs`,
  nowrap + sideways scroll); Drills and Rhythm Practice (`ExerciseDrawer`:
  filters start at "Choose…", undefined = not chosen) and Lick Trainer
  (`trainer.licksChosen` via `chooseGenre`/`chooseLevel`, reset on each
  visit; `licksShown` also empties the neck) list nothing until a filter is
  picked (user's request).
- **Vocal section** (`components/VocalTrainingView/`, nav `vocal`, all
  instruments; App hides the Stage neck/keys for it). Built from a market
  review of singing apps (Yousician, Simply Sing, Erol, Singing Carrots,
  SingTrue, Swiftscales…): daily workout + library, in the singer's own
  range, call-and-response (piano cue -> silence while singing, so the mic
  hears only the voice; optional soft `Guide`), feedback per note, no
  paywalls/lives. Pure logic in `music/vocal/`:
  `voiceRange.js` (range in localStorage `dudestar-vocal-range`, VOICE_TYPES,
  `classifyVoice`, `workingRange` = ±2 st margin, `keysForPattern` walks a
  pattern up by semitones then down), `exercises.js` (EXERCISES with kind
  pattern/glide/sustain/match/interval, level 1|2, `dailyWorkout(level)` =
  warm-ups first then a daily rotation, `buildReps()` -> reps {cue, targets,
  length}), `vocalAnalysis.js` (`estimateLag` aligns the take, per note:
  cents/wobble/drift/scoop (onsets only)/octave; glides: follow %, breaks,
  top reached; sustain: held time, vibrato rate/width; `diagnose()` -> tip
  keys `vocal.tip.*`), `vocalProgress.js` (localStorage
  `dudestar-vocal-progress`, `dudestar-vocal-level`). Mic: `hooks/useVocalMic.js`
  (own pipeline, 70–1300 Hz, clarity 0.86, RMS gate, 3-frame median,
  timestamped frames in a ref). Engine: `hooks/useVocalExercise.js`
  (phases cue/sing/gap/done on the AudioContext clock; piano via
  `schedulePianoNotes()` in pianoPlayer.js, returns a stop fn). UI:
  `PitchRoll.jsx` (canvas piano roll: target bars = ±50¢ band, playhead,
  coloured voice line, per-note cents after a round), `RangeBar.jsx` (solid
  = comfortable, hatched = reachable only).
  **Range test** (`RangeTest.jsx` + pure `music/vocal/rangeProbe.js`), the
  teacher / voice-range-profile method: 1) count aloud -> speaking pitch
  (median), the start; 2) piano plays one note, singer holds it on "ah"
  (match ±60¢, held 0.7 s, `heldMatch`), stepping DOWN by whole tones, a
  miss -> the semitone between, then semitones; 2 misses on a note end the
  direction (a start note that fails shifts 3 st the other way, up to 4x);
  3) same UP from the middle. `Done` ends a direction by hand. Comfortable
  edge = extreme ± (1 + strained edge notes: retried or sd > 30¢, max 4),
  saved as `lowMargin`/`highMargin` (+ `speaking`) with the range;
  `comfortRange()` = what exercises use (`workingRange`, old saves without
  margins = 2 st in), `voiceOf()` classifies from it. Practice is GATED:
  with no saved range, Start / a library row opens the test first (`then`
  screen; `Skip` = typical range for this visit). Retest hint after 60 days.
  Test harness: a fake getUserMedia sawtooth that sings the shown target
  when inside a simulated range (scratchpad rt.cjs). Text: `vocal.ex.<id>.
  title/desc/how/why`, `vocal.syl.*`, `vocal.cat.*`, `vocal.voice.*`.
  Test with Chromium's fake mic (`--use-file-for-fake-audio-capture=x.wav`).
  iPhone sound with the mic open: Start calls `prepareAudioOutput()` (in the
  tap, before getUserMedia) and `reviveAudioOutput()` after. While capture is
  on, iOS routes ALL output to the earpiece, so on iOS (`IS_IOS` in
  useVocalExercise) the mic is closed for each cue and reopened as the cue
  ends (`IOS_BREATH` 0.75 s); elsewhere it stays open between exercises
  (closed when leaving Vocal). First cue waits 0.45 s; `Hear` replays the
  round's cue from a tap (closes the mic first on iOS when idle). Guide
  (piano while singing) still comes from the earpiece on iOS.
  Cue loudness: the runner's Volume select (Normal/Loud/Max, default Loud,
  localStorage `dudestar-vocal-volume`, `LOUDNESS` in useVocalExercise) ->
  `schedulePianoNotes(..., {velocity, boost})`; boost > 1 lazily inserts a
  gain + limiter (threshold -2 dB) into the piano's smplr channel
  (`setBoost` in pianoPlayer.js); every other piano path resets it to 1.
  Measured peaks: Normal 0.18, Loud 0.45, Max 0.80 (no clipping).
- **Range test -> the best KEY for a song (v1.0.168, 2026-11-13; user:
  "can the test tell which key fits my singing? deepen it if needed")**.
  Test = 5 steps now: speak · down · up · HOLD (the comfortable top
  held like a phrase, `HOLD_LONG` 2.5 s within 6 s; fail -> highMargin
  +1 and one retry a semitone lower, keeping >= a fifth) · SIREN (slide
  on "oo" up and down, Start / Done / Skip, max 14 s; `findBreak()` in
  rangeProbe.js: pitch jumps >= 2 st within 0.12 s or gaps 0.12–0.6 s
  with >= 2 st, ignoring octave slips >= 10 st, inside low+4..high−2,
  biggest 2-st cluster = the passaggio; none + coverage >= 60 % =
  smooth). Saved with the range: `notes` (each held note's midi / sd /
  retry, `heldNotes()`), `passaggio`, `smoothBreak`. Result card shows
  the break line (`vocal.range.break*`). Pure `music/songwriter/
  keyFit.js`: `sweetSpot(range)` (steadiest comfortable notes, weight
  1/(1+sd/15), retries half, 70/30 with 45 % up the comfortable range),
  `rankKeys(notes, range, key)` over shifts −24..+24: over / under the
  comfortable edge 4 / 3 per st (+10 past the extremes), |time-weighted
  melody mean − sweet| x 1.2, top note ON the comfortable edge +0.6, long
  notes (>= 1 beat) within ±0.5 st of the passaggio +1.2 each (max 3.6),
  open-chord guitar keys −0.4, |shift| x 0.03. Songwriter editor key /
  tempo panel: `VoiceKey.jsx` (`.sw-vk`): comfortable range, "Now: C
  (C5–A5)" + verdict, a select of the 6 best (+ the current) "E ·
  E3–C#4 · best for you", Use -> transposeSong + toast; no melody / no
  range = a one-line hint. Latin inside Hebrew wrapped LRI/PDI. Checked:
  Playwright fake-mic singer (A2–A4, break 62->65): passaggio E4, notes
  saved; a tiring singer -> highMargin 1 -> 3; Twinkle written at C5
  for a baritone -> E (E3–C#4), applied, melody moved. NOT verified with
  a real voice.
- **Lip trill / low voices (v1.0.104, 2026-11-06)**: the user asked if the
  lip-trill exercise can really score 100. Checked: tempo (eighths at 92 =
  0.33 s/note, the usual 1-2-3-4-5-4-3-2-1 warm-up speed) and scoring are
  fine — simulated singers through analyzeRep: perfect = 100, pro ~98, good
  ~92, amateur ~82, same as fiveNote at half the speed. The real fault was the
  PITCH TRACKER: a trill chops the voice 20–35x/s and below ~200 Hz McLeod
  locked onto the chopped pattern's period (27–33 Hz, discarded) -> most
  frames empty (E3 trill: 3 % read live). useVocalMic now retries a failed
  frame on an envelope-flattened copy (`flattenEnvelope`, 4 ms peak follower):
  96–100 % read, 0 wrong notes, noise still unread; frames that read before
  are untouched. Chromium fake-mic check: E3 trill 3 % -> ~88 % (rest = the
  fake device's loop gap, same on a steady tone). NOT verified with a real
  voice.
- **Vocal mic on iPad (v1.0.105, 2026-11-06)**: user: singing practice on
  the iPad heard nothing. useVocalMic now does what fixed the tuner on the
  iPhone: AudioWorklet tap (`createMicTap` on the SHARED context — the frame
  clock must stay the cue's clock) preferred over the AnalyserNode whenever
  it carries sound, graph pulled by a silent gain -> destination,
  `channelCount: 1`, resume() bounded (400 ms — a refused resume could hang
  Start forever), concurrent starts share one promise, a stop() during a
  pending start cancels it (gen counter; iOS closes / reopens the mic per
  cue). `deadInput` (pure digital zeros > 1.5 s) -> `vocal.noSignal` + LTR
  `.vocal-diag` line (an/wk peaks, ctx, mic track, session) in VocalRunner
  and RangeTest — ask for a screenshot. Chromium with the analyser forced to
  zeros: voice still read via the tap. NOT verified on a real iPad.
- **Vocal mic on iPad, round 2 (v1.0.107)**: still silent on the user's
  iPad after 1.0.105. Now on iOS useVocalMic analyses on its OWN context
  (`createLiveContext`, resumed in the tap, replaced after getUserMedia when
  not running, kept across stop/start, closed on unmount — the tuner's
  iPhone fix); frames are still stamped on the SHARED clock (`ct` =
  shared.currentTime − half window − baseLatency). The iPad no longer closes
  / reopens the mic per cue (`CYCLE_MIC` = iPhone only; an iPad has no
  earpiece). On iOS a grey `.vocal-diag` line shows whenever nothing was
  heard for 3 s (`mic.quiet`): own|shared, analyser / worklet peaks, ctx
  state, mic track, session, then `rms … hz … cl …` or `rms … < gate …`.
  Chromium with an iPad UA: own path used, trill read. NOT verified on the
  iPad — ask for a screenshot of that line if it still fails.
- **Vocal mic gate (v1.0.109)**: the user's iPad diag line read `own · an
  0.0035 wk 2822/0.0035 · ctx running · mic live · rms 0.0016 < gate
  0.0060` = the sound DID arrive (1.0.107's own context works); the fixed
  loudness gate (0.006 RMS) threw the quiet iPad mic away. The gate now
  follows the room: 2.2x the quietest 0.5-s bucket of the last 20 s,
  clamped 0.0007..0.006 (a calibration, when present, still raises it).
  Meter `live.level` is dB-scaled (-66..-16 dBFS). Fake-mic tests: a hum
  at rms 0.0016 read (D3), white noise at 0.0015 not read, trill still read.
- **Vocal count-in (v1.0.111, user's request 2026-11-06)**: after each
  round's cue, `COUNT_BEATS` = 2 beats in the exercise's tempo (beat clamped
  0.45–0.9 s; singStart = cue end + 0.15 + 2 beats, never earlier than the
  old breath): big glass "2 · 1" over the roll then "Sing!" (`CountIn` in
  VocalRunner, own rAF), the first target bar drawn full + thicker during
  the count (PitchRoll `armed`), and — `Count` switch, device key
  `dudestar-vocal-count`, default on — a soft tick per beat (1.8 kHz,
  2.4 kHz on the last: above the vocal mic's 1300 Hz, never a note;
  `countTick()` in useVocalExercise). Range test: one high tick as each
  note's listening starts (same switch). iPhone: the mic reopens at the
  cue's end, so the ticks come from the earpiece there (quiet).
  v1.0.113 (user: "2 _ 1 _ start", it felt like starting right after 1):
  each number now FLASHES for 55 % of its beat (gap before the next), and
  CountIn reads the HEARD clock (currentTime − outputLatency|baseLatency)
  so a number appears with its tick. Measured (Chromium): 2 @0, gap @0.37,
  1 @0.67, gap @1.04, Sing! @1.34 s (beat 0.67).
- **Several styles (v1.0.111, user's request)**: onboarding, the teacher's
  "about you" and the goal planner pick styles with multi-select chips
  (`styles: []`; `style` = the first, for older readers; `stylesOf()` /
  `coachStyles()` in onboardingState.js). buildSession's music block
  rotates through `intake.styles` by day; challenges take the first style
  that has licks.
- **Singers' ear training** (user's request 2026-10-17): the Singing card's
  Ear Training opens the Vocal section's own `ear` screen (HomeMenu option
  `vocalScreen: 'ear'` -> App `vocalStart` {screen, n} -> `VocalTrainingView
  initialScreen`), NOT the guitar Practice page (that showed the guitar nav,
  practice tabs, stats and neck). `VocalEarTraining.jsx` + pure
  `music/vocal/vocalEar.js`: modes direction / scaledegree / interval /
  chord (maj/min, +dim, +aug) / rhythm (reuses earTraining's exported
  `generateRhythmQuestion`) x 3 levels, all notes inside `earRange()` (the
  comfortable range, min 17 st) on the piano (`schedulePianoNotes`, the
  Vocal volume); fret location, triad, scale ID and fretboard call &
  response were left out as instrument skills. Mode/level per profile
  (`dudestar-p-vocal-ear`), all-time accuracy via `earTrainingLifetime:vocal-<mode>`.
  Last mode = Sing back -> the new `echo` exercise (kind 'echo', category
  'ear': chord + 3 stepwise notes, level 2 = 4-5 notes with leaps, sung back
  and scored in VocalRunner; Back returns to the ear screen via `screen.back`).
  The library has an Ear Training card (quiz row + echo). The guitar/piano
  Practice ear training is unchanged. `dailyWorkout` now walks the pool with
  a stride coprime to its size (stride 5 over 5 or 10 exercises repeated the
  same pick — level 2 had been getting 2 exercises instead of 4).
  Auto-advance like useEarTraining (2026-10-31): after an answer the next
  question comes by itself (1100 ms right / 2600 ms wrong); Hear after
  answering cancels it, Next skips the wait, a mode/level change cancels.
  Pace select Standard | Timed (prefs `pace`): Timed = 60 s
  (TIMED_CHALLENGE_DURATION_S, wall-clock deadline) from Start, then a
  summary (correct / attempts / accuracy / session best streak) + Again; the
  4th score tile shows seconds left instead of all-time accuracy. Best streak
  ever per mode = `earTrainingBestStreak:vocal-<mode>` (personal), shown as a
  tile (2026-10-31, parity with guitar/piano).
  TIMED pace, every ear training (guitar/piano/bass useEarTraining + singing,
  user's request 2026-11-03): the result shows only `TIMED_HOLD_CORRECT_MS`
  500 / `TIMED_HOLD_WRONG_MS` 1200 (exported from useEarTraining; was 2000
  for both on guitar/piano, 1100/2600 on singing), and the piano's one-key-
  at-a-time melodic reveal does NOT extend the hold in Timed. Measured:
  ~0.5 s / ~1.2 s; a 60 s singing run went from ~32 to ~58 questions.
- **Three instruments** (chosen on the home screen): Guitar (6-string), Piano, Bass (4-string, E-A-D-G:
  Compose, Practice (Bass Practice, below), GuitarPro). Registered in
  `src/instruments/instrumentRegistry.js`; which app sections/features each
  instrument supports is declared in `src/instruments/featureCapabilities.js`
  (`supportsInstrument()` — unlisted feature keys default to "supported
  everywhere"; add a top-level entry for a whole nav section, not just its
  sub-tabs, or an instrument with no real content there will still see it
  unfiltered). `InstrumentGate.jsx` shows an inline fallback for
  finer-grained in-page gating.
- **Shared Fretboard** (`src/components/Fretboard/Fretboard.jsx`) takes an
  optional `tuning` prop (defaults to guitar's `STANDARD_TUNING` from
  `music/notes.js`) — Bass passes `BASS_TUNING`. String gauge/wound-count and
  wood color/grain (maple vs rosewood) are derived from tuning length inside
  the component. `Stage.jsx` is the single mount point
  (`instrument === 'piano' ? <PianoKeyboard> : <Fretboard>`).
  `computeChordPositions.js`/`triads.js`/etc. are guitar-only and untouched
  by Bass — Bass's root-note-only position math lives in its own
  `music/bassPositions.js`.
- **Bass sound (measured 2026-10-26)**: every bass profile plays smplr's
  FluidR3_GM samples (`kit` + `extraGain` on BASS_SOUND_PROFILES ->
  `getSoundfontInstrument(name, {kit, extraGain})`, cache key per kit/gain).
  Measured all 40 notes E1..G4 (0-24 frets) per profile from the real sample
  files: MusyngKite (smplr default) fingered bass 20-34 cents SHARP nearly
  everywhere + F#4/G4 an octave low and ~14 dB quieter, pick 10-18 c sharp,
  fretless low notes ~15 c sharp, slap ~20 dB quieter than the rest;
  FluidR3_GM mean 1-2 c (max 5; pick D2/Eb2 -11). Synth Bass = GM
  synth_bass_1 (was a triangle oscillator, still the fallback). extraGain =
  each set's median RMS matched to the old fingered bass, peaks capped.
  One sample per note (88), so no pitch-shifting.
- **Every sound in tune (user's rule 2026-10-26: "the system plays only tuned
  notes")**. Measured with scripts/tuning/ (h1 spectral peak AND YIN
  periodicity over the sustained part; a note is "off" only when both agree
  within 8 c — inharmonic piano bass strings / chorus pads where they
  disagree are left alone; corrections only for >= 4 c):
  (1) smplr sample sets — `src/audio/sampleTuning.js` SOUNDFONT_TUNING
  ('<kit>/<instrument>' -> {midi: cents}) + SPLENDID_TUNING (per velocity
  layer, per sample, mapped with smplr's own key spread) applied in
  instrumentEngine.js `withTuning()` (wraps instrument.start, adds `detune`)
  for EVERY caller. Biggest fixes: MK acoustic guitar low E-A strings
  +11..16 c, harpsichord / vibraphone / EP1 ~10 c, Splendid Grand +5..+15 c
  from the middle up. Verified in the browser: AudioBufferSourceNode.detune
  = the table value (open A chord 16/14/-4/5; piano C chord -5/-7).
  (2) alphaTab's GeneralUser GS: every bank-0 program 0-111 rendered with
  fluidsynth from the original SF2 (notes across its range, steady 0.25-1.1 s),
  each mistuned instrument ZONE gets a fineTune generator (median of its
  notes, only if consistent: IQR <= 6 c) — 165 zones, `scripts/tuning/
  gu-zone-fix.json`, `fixzones.py`. Notes >= 5 c off: 443 -> 105, >= 10 c:
  111 -> 22 (left: multi-pitch patches — Orchestra Hit, Fifths lead, bottle —
  and stretched top piano keys). New file `public/soundfont/generaluser-gs-v2t.sf3`
  (GP_SOUNDFONT_URL; the old -v2.sf3 removed). Oscillator synths use exact
  440·2^((m-69)/12).
- **Audio**: one shared `AudioContext` (`audio/audioContext.js`), sampled
  instruments via `smplr` through the generic `audio/instrumentEngine.js`
  (`getSoundfontInstrument`/`preloadSoundfontInstrument` — verify any new
  soundfont name against `node_modules/smplr/dist/index.mjs`'s own list, not
  guessed). Per-instrument profile registries live in
  `audio/instrumentProfiles.js` (`GUITAR_SOUND_PROFILES`/
  `PIANO_SOUND_PROFILES`/`BASS_SOUND_PROFILES`), current selection mirrored
  in `audio/audioSettingsStore.js`, persisted via `hooks/useAudioSettings.js`.
- **i18n**: `src/i18n/strings.js`, EN + HE side by side, looked up via `t()`
  from `useLanguage()`.
- **Isolated testing pattern**: for pure music-theory/parsing logic, write a
  throwaway `.mjs` test directly in `src/music/` (for relative-import
  resolution), bundle with
  `npx esbuild <file>.mjs --bundle --platform=node --format=esm --outfile=<bundle>.mjs`,
  run with `node`, delete both files after. Much faster than live-browser
  verification for pure logic.
- **Live verification**: use the Browser pane against a **production build**
  (`npm run build` + `vite preview`), not the dev server — the dev server has
  a known pre-existing, unrelated React StrictMode console error that
  doesn't reproduce in production and isn't worth chasing.
- **Lick Trainer** (Practice -> Lick Trainer): library with exact rhythm in
  `music/lickTrainer/library.js` (tab-style authoring; `source: 'user'` =
  licks the user supplied as verified), offline take analysis in
  `music/lickTrainer/analysis.js` (spectral-flux onsets + pitchy pitch track
  + DP alignment + bend/vibrato checks), playback/capture in
  `audio/lickTrainerAudio.js`, state in `hooks/useLickTrainer.js`. Engine
  regression test on synthetic guitar audio: `scripts/lick-analysis-test.mjs`
  (bundle with esbuild, run with node) — run it after any analysis change.
- **Lick Trainer redesign (v1.0.128, 2026-11-07; user: "everything is a
  mess, all the licks at once, the demo hidden at the bottom")**: Practice
  -> Lick trainer is a drill-down that draws its OWN header (PracticeView
  skips its head for 'trainer', passes `onExit`): GENRES (iOS rows with
  colour tiles + counts, All / each genre / My imports; Import capsule
  next to the title) -> LICKS of the genre, grouped by level (`LickList`,
  `.lt-row`, best score pill) -> PLAYER (`Player`: title / meta / about,
  tab card, TRANSPORT = Listen round key · ONE big record key (red dot ->
  stop square; blue in Wait mode) · Tempo + Mode chip selects; status,
  results). Secondary options in the player's ••• (`OptSwitch` iOS
  switches: click / hear cue, auto tempo + target, loop, neck labels,
  latency + Calibrate, Delete import). >= 1024 px: SPLIT view — sticky
  sidebar list (chosen row = accent fill) | player; practice-view widens to
  1280. Hook: `lickOpen` + `openLick` / `closeLick` / `clearLickChoice`,
  `licksShown` = lickOpen (neck only with an open lick); launchLick /
  import save / arpeggio build open the player. GuitarPro -> Practice
  (variant solos) uses the same Player under its section select.
  v1.0.130 (user: the playhead didn't match the click; a new take didn't
  scroll the tab back to the start): `startPlayhead()` reads the HEARD
  clock (currentTime − outputLatency|baseLatency); TabTimeline scrolls
  back to the start (or the highlighted section) as soon as a count-in
  begins (playheadBeat < 0). Lag check NOT possible here (headless
  outputLatency = 0) — verify on the iPad.
- **Guitar Pro licks**: `music/lickTrainer/gpImport.js` converts an alphaTab
  Score to licks (exact rhythm/bends/slides/legato; chords reduced to the top
  note; the other notes of a double stop/chord are attached at runtime as
  `note.also` via `chordNotesByTick()`/`withChordNotes()` from the loaded
  score — the neck lights the whole shape, TabTimeline draws it; analysis
  still follows the top note). In-app "Import" saves to IndexedDB (`userLickStore.js`, this device
  only). For the built-in library, the user drops files in
  `C:\Users\hay\Downloads\GuitarPro` on their computer; convert with
  `scripts/gp-to-licks.mjs` into `music/lickTrainer/imports/*.js` and add the
  export to `SOLOS` (full solos, `solo: true` -> one entry with bar-based
  `sections`) or to the licks list in `library.js`. The trainer has a
  Licks | Solos switch; a solo is practiced whole or per section
  (`soloSection()`), with the whole solo shown in the tab and the section
  highlighted. `barPhase` marks where bar lines fall when beat 0 is a pickup.
  **Listen** for anything from a GP file (built-in solos carry `gpUrl` ->
  `public/gp/`, in-app imports store the file's `gpBytes` in IndexedDB, both
  plus `gpRef {track, tickStart}`) plays the file itself through alphaTab's
  synth (`audio/gpReferencePlayer.js`, one hidden AlphaTabApi) so it sounds
  exactly like the original; licks without a file use `lickTrainerAudio.js`.
  alphaTab gotchas: `scoreLoaded`/`midiLoaded` replay to new listeners and
  `isReadyForPlayback` stays true across loads — wait for the next
  `playerReady` after `load()`. Import defaults to `defaultTrackIndex()`
  (skips vocal/piano/bass/drum tracks).
- **Shared library (all devices)**: `api/library.js` (Vercel function +
  Vercel Blob, one JSON per imported file incl. the GP bytes as base64),
  guarded by the `DUDESTAR_KEY` env var (the user types it once per device in
  Settings -> "Sync between devices" — `LibraryBar bare` via SettingsPanel's
  `syncTrainer` prop; GuitarPro only shows a one-line warning on a sync
  problem; kept in localStorage). Client sync in
  `music/lickTrainer/cloudLibrary.js`: IndexedDB stays the local/offline
  copy; records marked `cloud: true` that vanish remotely were deleted on
  another device; unmarked local imports get uploaded. Needs
  `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID` (+ OIDC, how newer Vercel projects
  connect a Blob store — the user's project uses this) from connecting the
  `dudestar-library` Blob store; `DUDESTAR_KEY` is set for Production.
- **Keys octave fix**: gp3-5 files have no piano staff; a keyboard part is
  typed on guitar strings and transcribed an octave low (guitar writing).
  `fixKeysOctave(score)` (gpImport) lowers `staff.transpositionPitch` by 12
  for stringed tracks whose `trackKind` is 'keys' (realValue +12; the synth's
  channel transposition follows) — called in scoreLoaded (before MIDI/render)
  of the hidden reference api and the song view api. Real piano staves
  (gp/gpx) are untouched.
- **Feature icons/names**: `components/GuitarProIcon/` — `GuitarProNavIcon`
  (nav: red glossy GP pick over strings on guitar/bass, red PP key-cap over
  keys on piano); home cards keep the grey line icon. On the piano the
  section is called **PianoPro** (`nav.pianopro`: AppShell `label()`, the
  piano card's shortcut, GuitarProView h1 + `gp.pianoSubtitle`).
- **GuitarPro on Piano**: the section is also enabled for piano
  (featureCapabilities `guitarpro: ['guitar','piano']`). `useLickTrainer({instrument})`
  -> `pianoMode`: Song view only (no Practice / neck-label toggles), the
  display track defaults to `pianoTrackIndex()` (remembered under
  `<soloId>|piano`), and `pianoKeys` (from `pianoPartOf()`: all notes of the
  shown track in ticks, hands by staff, or split at middle C for one-staff
  GP3-5 pianos) feed PianoKeyboard's `playNotes` prop (right green / left
  blue, the keyboard scrolls to follow); `pianoChord` (identifyChord over
  3+ pitch classes, held until the next chord, cleared on Stop) feeds the
  panel's chord LCD via the `chordReadout` prop (undefined elsewhere = no LCD). Any pitched track shows on the
  keys; drums show nothing. Importing a file with no guitar part makes a
  `fileOnlySolo()` (no notes, `practiceOff`).
- **GuitarPro on Bass**: featureCapabilities `guitarpro: ['guitar','piano','bass']`.
  `useLickTrainer` -> `bassMode`: Song view only (no Practice yet), neck-label
  toggle shown, display track remembered under `<soloId>|bass`, default =
  the file's bass track (`bassTrackIndex()`, prefers 4-string), drawn on the
  bass neck with the panel's bass profile as GM program
  (`BASS_PROFILE_GM_PROGRAM`, via the same debounced `applyOctave` reload).
  A 5-string bass is folded an octave up onto the 4-string neck
  (`trackNotes` -> `folded`, hint `gp.bassFolded`). No bass part in the file:
  `suggestedBassLine(score)` (chord roots, one per quarter beat, from all
  pitched non-drum/vocal tracks) -> `addSuggestedBassTrack()` appends a real
  alphaTab track (`__suggestedBass`, F clef + tab) in the SONG VIEW's
  scoreLoaded only (once per score); it is muted outside bass mode, so guitar/
  piano never hear or list it. Its index = `trainer.suggestedBassIndex`
  (= original track count); load the api with track 0 first, then
  renderTracks — loading with a not-yet-existing index crashes alphaTab.
  The hidden reference player always loads `[0]`. No chords found ->
  notation-only "not a bass part" view. Bass-mode mix default: every track
  except vocals.
- **GuitarPro section** (nav key `guitarpro`, guitar + piano + bass):
  `components/GuitarPro/GuitarProView.jsx` — file select (built-in SOLOS +
  imports), Import (always as a solo), shared library bar, Song | Practice.
  Track mixer (`trainer.mix`, per file in localStorage; default = practiced
  track + rhythm section via `defaultMix()`/`isRhythmSection()` in
  gpImport.js — drums, bass, keys, never vocals). Song = `GpSongPlayer.jsx`
  (visible alphaTab tab, own AlphaTabApi, mixer via changeTrackMute, drives
  the Stage fretboard through `trainer.followPlayhead`). Practice = the
  `LickTrainer` component with `variant="solos"` (Practice -> Lick Trainer is
  `variant="licks"`, licks only). During a take the band (mix minus your
  part) is rendered OFFLINE with `renderBacking()` (alphaTab `exportAudio`,
  tempo scaled by patching tempo automations just for the MIDI generation)
  into an AudioBuffer started on the trainer's own clock — sample-exact vs.
  the analysis timeline. Never play the backing through the live alphaTab
  player during a take (separate clock -> smeared timing feedback).
- **GP sound**: every alphaTab player (hidden reference, GuitarPro song view,
  Songs -> Tab) uses GeneralUser GS v2.0.3 converted to SF3
  (`public/soundfont/generaluser-gs-v2.sf3`, ~9 MB, license next to it; built
  with `scripts/soundfont/` — sf2to3.py, then sftone.py which gives the GM
  guitar presets a static "cab" low-pass and drops their filter envelopes,
  which alphaTab plays wide open = fizzy/metallic. Cached 30 days by
  vercel.json, so a changed file needs a new name),
  fetched ONCE and shared via `loadGpSoundFont(api)` in
  `audio/alphaTabSound.js` (don't give an api a `player.soundFont` URL — each
  would download it). alphaTab only plays mono samples (sampleType & 1).
  `alphaTabSound.js` also patches MidiFileGenerator's note vibrato to a
  finger vibrato (pitch only rises, gentle: ~5 Hz, 0.22/0.45-semitone peak, 1.5-cycle ease-in) and `tuneVibrato()`
  sets its tick length for tempo x speed — after changing it call
  `loadMidiForScore()` (no need to wait for playerReady: the worker
  processes messages in order; playerReady does NOT refire for a reload
  while playing).
- **PDF sheet music** (v1.0.138, 2026-11-07; user: "can I upload a PDF
  sheet in PianoPro?" -> a PDF is a picture, so it is SHOWN, not played;
  for playback convert to MusicXML outside (MuseScore / PlayScore 2) and
  Add that). GuitarPro / PianoPro (every instrument) Add + drop accept
  `.pdf` -> `music/sheets/sheetStore.js` (IndexedDB `dudestar-sheets`,
  this device; per-sheet place + speed in personal key
  `dudestar-p-sheet-prefs`); the file select lists them in a "Sheet music
  (PDF)" optgroup (value `pdf:<id>`), ••• Delete (two taps).
  `PdfSheetView.jsx` (+ css): pdf.js (`loadPdfDocument`, now with
  `standardFontDataUrl` = `public/pdfjs/standard_fonts/`, copied from
  pdfjs-dist, fetched on demand, not precached) — pages stacked at the
  scroller's width (max 1000 / 1400 full), drawn when near
  (IntersectionObserver), `dir="ltr"` on the pages (a canvas inherits RTL
  and Hebrew pages scrambled the PDF's text); inline height measured down
  to the tab bar; glass bar ‹ n/N › · Scroll/Pause · speed select
  (`SPEEDS` 15–240 s per page, the CURRENT page's height per `secs`, runs
  on across page breaks, stops at the end; a touch / wheel pauses) · full
  screen (portal, dark, 45vh bottom room so the last page reaches the top).
  Keys: arrows / PageUp/Down = page turns (Bluetooth pedals), Space =
  scroll, Escape leaves full screen. Wake Lock while scrolling / full.
  App hides the Stage while a sheet is open (`gpSheetOpen` via
  `onSheetOpen`). Playwright 390 + 1180 (3-page PDF): render, auto-scroll
  moves, page turns, pedal keys, full screen, place restored after reload.
- **Trainer neck**: lick markers with `lick.style === 'trainer'` are light
  blue, the sounding note green with a glow. Markers show note names or
  left-hand fingers (`trainer.neckLabel`): fingers come from the GP file
  (`leftHandFinger`) or `music/lickTrainer/fingering.js` (DP over hand
  positions; `fingerAuto`), assigned in `withDerived()`. Screens with a tab
  (Lick Trainer, GuitarPro, Songs -> Tab) pass `compact` to the Fretboard:
  20% smaller (not on phones <=480px), markers scaled back up. AppShell
  publishes `--stage-height` for panels that fill the space above the neck.
- **GuitarPro Song view layout**: no sticky bar. Play scrolls `.gp-song` to
  the top (scroll-margin) and `.gp-score-scroll` is sized to the room left
  above the neck (`--stage-height`); alphaTab auto-scrolls inside it
  with OUR page-turn scrolling (`scrollMode: Off`; on `playedBeatChanged`, a
  new staff system is scrolled to the top via `boundsLookup.findBeat()`), and
  a ResizeObserver re-renders the score to the box width (overflow-x hidden,
  no sideways scrollbar).
  Two full lines always fit the box (user's rule: the line being played +
  the next): `fitTwoLines()` on `postRenderFinished` measures the tallest
  pair of `boundsLookup.staffSystems` (from a line's top - 6, where a page
  turn puts it) and lowers `display.scale` (BASE_SCALE 0.95 .. MIN_SCALE 0.6;
  grows back when there's room; refits on box height change, max 3 tries per
  height). The swing sign (`EffectTripletFeel`) is hidden in the song view —
  it made the first line much taller; the feel is still played. Phones get extra bottom padding so the scroll
  can reach.
  v1.0.129 (user: while playing, Play / Stop stayed up and couldn't be
  tapped once the notes scrolled): `.gp-transport` is a STICKY Liquid
  Glass bar in the section scroller — top -20px on desktop, `strip −
  clear + 2` under 900 px (sticky offsets count from inside the
  scroller's padding); `.gp-song` scroll-margin = the real top strip
  (incl. the safe area — the fixed 60px put the transport UNDER the
  iPad's strip = not tappable); the score box also subtracts the top
  safe area; phones <= 560: one row, Play keeps its word, Stop / To solo
  / Loop icon only, no "Tempo" label.
  Tracks are a rail on the LEFT of the score (`TrackRail` in
  GpSongPlayer.jsx, icon per kind, tap = mute/unmute; icons only on phones);
  the pill mixer is shown only in Practice.
  Rail row = tap the name to SHOW that track (score + neck + the practiced
  part; `trainer.setDisplayTrack`, per solo in localStorage, unmutes it),
  the speaker icon mutes. Another guitar track is rebuilt with
  `scoreToSolo` (`soloForTrack()` in useLickTrainer, id `<soloId>@t<n>`;
  `activeSoloId` = the base id); non-guitar tracks (`isGuitarTrack()` false:
  bass/keys/vocals/drums) are `displayOnly` — notation only (Score/Default
  stave profile), empty neck, no Practice. A 4-string bass track (`isBassTrack()`) is
  built with `scoreToSolo({bass: true})` -> `neck: 'bass'` (BASS_TUNING strings),
  `practiceOff`; App draws it on the bass neck (`tuning` = shifted BASS_TUNING)
  and passes `noteSound: 'bass'` so tapped markers use `playBassNote`.
  MusicXML (.musicxml/.mxl/.xml) is accepted by the same Import (alphaTab
  reads it; stored like a GP file). Sheet-music PDFs: OMR (Audiveris) is
  far too inaccurate on its own — transcribe/correct by hand to MusicXML,
  then (optionally) load in alphaTab, set `masterBar.tripletFeel` for swing
  and the sheet's chord symbols (`staff.addChord` + `beat.chordId`), and
  export with `alphaTab.exporter.Gp7Exporter` -> .gp. Copyrighted songs go to
  the user's own import, never into the public build.
  First load of the song view sets the stave profile for the first track in
  `scoreLoaded` — the Tab profile on a track with no strings (a voice/piano
  track first) crashed alphaTab's layout ("reading 'staves'").
  Chord names in a flat key use flats (`identifyChord(midis, {flats})`,
  `inFlatKey(score, tick)` — labelChords + the piano chord LCD only).
  Chord names: `labelChords(score, track)` (gpImport) writes a name above
  the staff wherever 3+ pitch classes sound together (both hands), on each
  change, unless the track already has the file's own chords; the song
  view's api renders on the MAIN thread (`core.useWorkers: false`) so
  `giveChordNamesTheirOwnRow()` can stop alphaTab sharing the chord row
  with section markers (they overlapped); chord font is bold sans 13, family
  starts with the tag `DSChordName` so the SVG <text> can be found; the
  song view uses `enableLazyLoading: false` so all names are in the DOM in
  time order (lazy loading must stay OFF anyway: with main-thread rendering
  and lazy loading on, Play didn't start). Piano mode (`.gp-song.is-piano`):
  chord names blue (no glow — removed at the user's request).
  Piano octave control: panel −/+ "Octave" LCD (PianoKeyboard `octaveShift`/
  `onOctaveShiftChange`, GuitarPro only) -> `trainer.pianoOctave` (-2..2, per
  `<file>#<track>` in localStorage); the song view sets the shown track's
  `staff.transpositionPitch` = base − 12·shift (debounced, reloads MIDI,
  re-renders, resumes); the keys add 12·shift in `pianoPart`.
  Piano sound: the panel's piano profile (App `pianoProfile` -> GuitarProView
  -> GpSongPlayer) sets the shown track's `playbackInfo.program` via
  `PIANO_PROFILE_GM_PROGRAM` when that track is keys (file program kept as
  `__fileProgram`), same debounced reload as the octave.
  Mixer: the rail head's mixer button opens `TrackMixerPanel` to the right
  of the rail over the score (show / Solo / Mute / level per track). Levels
  (`trainer.volumes`, 0..1 per file in localStorage `lick-trainer-gp-volume`,
  `setTrackVolume`) apply via `changeTrackVolume` in the song view, in
  `playReference` (applyMix) and in `renderBacking` (trackVolume); Solo is
  song-view state only (`changeTrackSolo`), reset per file.
  Muted = fader shows 0 (the stored level is kept; unmute restores it;
  raising a muted fader unmutes). Icons are in colour while a track is heard
  (in the mix and not silenced by a solo), grey otherwise — rail and mixer.
  Space bar = Play/Pause in Song view (GpSongPlayer keydown, skips form fields). Song view keeps ONE AlphaTabApi
  per file and switches with `renderTracks()` (no MIDI reload). The mix is
  per file (`gpKey`), and the hidden reference player loads once per file. The view is full width (controls
  above capped at 980px).


## Profiles, performance log, practice coach

- **Profiles** (`src/profile/`): `import './profile/install.js'` must stay
  main.jsx's FIRST import. It patches `Storage.prototype.get/set/removeItem`
  for window.localStorage so PERSONAL keys live under `p:<profileId>:<key>`
  (lists `PERSONAL_KEYS` / `PERSONAL_PREFIXES` in profileStorage.js — add
  every new personal key there; device keys like audio/lang/theme/sync stay
  global). Registry `dudestar-profiles`; first run migrates existing personal
  keys into profile "Me". Switch/create/delete-active = page reload.
  `ProfileChip` on the home screen (avatar-only in the dots row on upright
  phones). IndexedDB imported licks stay shared.
- **Performance log** (`src/coach/perfLog.js`, personal key
  `dudestar-perf-log`): one entry per measured run — tools 'lick', 'rhythm',
  'scale', 'chordChanges' (with per-change `pairs`), 'bending' (signed
  cents), 'ear', 'drill', 'soloOpener', 'minuteChanges'. Rhythm offsets
  include ~150-200 ms detector delay (compare runs, not absolute).
- **launchBus** (`src/coach/launchBus.js`): App registers `launchPractice`
  — `launch({tool, ...params})` opens a practice tool with parameters
  (lick/rhythm/scale/chordChanges/bending/ear/drill/soloOpener/minuteChanges).
- **One-Minute Changes** (Practice tab `minuteChanges`, guitar only,
  `components/MinuteChanges/`, `hooks/useMinuteChanges.js`): the teachers'
  benchmark (JustinGuitar) — alternate two chords for 60 s, mic counts
  changes (2 detections >=100 ms confirm a chord). Stage hidden there.
- **Chord detection** (`music/chromaChordDetector.js computeChroma`) uses
  spectral PEAKS with parabolic interpolation (not every bin): the old
  all-bins sum smeared low notes over neighbouring pitch classes and
  recognised 0/30 synthetic guitar voicings vs 22/30 now. Shared by Chord
  Changes, One-Minute Changes and the tab-audio chord guesser.

- **Coach** (nav `coach`, guitar only; Guitar card shortcut; `components/Coach/`
  CoachView / CoachBanner / ProgressChart, store `coach/useCoach.js`, personal
  key `dudestar-coach`). Logic is pure in `coach/goals.js` (catalog: changes,
  barre, timing, speed, pentatonic, blues, bending, ear — each a ladder of
  measurable rungs with sourced method notes; weeks/rung are ESTIMATES at
  30 min/day x 6) and `coach/engine.js` (a rung counts when met on 2
  different days or once in placement; `estimateTime` scales by the
  student's weekly goal minutes^0.8; `buildSession` = warm-up / goal ~50% /
  support or top weak point / break >=45 min / music in the chosen style;
  `findWeaknesses` over 14 days: slow chord pairs, slow direction, timing
  drag/rush (Lick Trainer offsets), flat/sharp bends, wrong lick notes, ear
  modes <70%, runs <75%). Wizard: welcome -> about you (minutes, days,
  level, style) -> goal (free text via `matchGoalText` keywords EN/HE +
  catalog) -> placement (`placementTests`, blockIds 'placement:...') -> plan.
  A started block sets `setActiveCoachBlock(id)` then `launch(spec)`; the
  banner shows the live result and Done/Coach. Launch scrolls `.practice-tabs`
  into view. Free-text goals use keywords, not an AI model (no API key).

## First run / onboarding (built 2026-10-31, phase 1 of the plan doc)

- Plan doc (Docs artifact, user accepted all recommendations 2026-10-31):
  https://claude.ai/artifact/PgzkqRBd3MfGere7xVoMh9 — phase 1 = this; phase 2 =
  level-0 lessons (0.1 first note, 0.2 clean note, 0.3 Em) + finish level 1
  (E, strumming, first song) — Claude writes, USER reviews each; phase 3 =
  Practice tabs grouped in a select, dashboard collapsed to one row until
  the first run, first-visit explanation per screen, "try it in…" links;
  phase 4 = Coach + Studies inside the Teacher, Today for piano/bass, bottom
  nav 8 -> 5 only if still crowded after phase 3. Beginner songs = public
  domain + our own progressions (list for the user to approve).
- `components/Onboarding/Onboarding.jsx` replaces everything in App while
  `needsOnboarding()` (personal key `dudestar-p-onboarding`, synced; every
  profile sees it once, Skip marks it done). Steps: welcome (name -> 
  renameProfile, language) -> instrument (4 picture tiles — the approved
  plan's tiles, not a select) -> level (new/few/songs, per-instrument text
  `onb.level.<inst>.<lvl>.title/sub`) -> goals (chips + style + minutes
  selects) -> CHECK (guitar, level != new: pick an open chord from
  CHECK_CHORDS, the Teacher's exported `ChordStep` listens; heard = passes)
  -> done (first lesson or plan; Start / Home).
  Level-tailored (user's rule 2026-10-31): never played = no check; a few
  chords = the mic chord CHECK; plays songs = NO chord check — a "What do you
  already play?" step (`know`: open / strum / barre / penta / solo / tab, said
  not measured -> Teacher intake.can) and PLAYER goals (`GOALS_PLAYER`: barre,
  solo, blues, rhythm, speed, bends, ear, write -> coach goal barre /
  pentatonic / blues / timing / speed / bending / ear); a player's Start goes
  to the Coach plan (measured placement), never to a lesson. A re-run
  switches the coach goal when it differs and clears Teacher `current`.
- `onboarding/onboardingState.js finishOnboarding()`: guitar -> Teacher
  intake (experience none/little/some, can = heard, goals, style, minutes),
  recordPass(`chord-X`) per heard chord, Coach `setIntake` (level new/
  beginner/intermediate, style mapped) + `chooseGoal(coachGoalFor())` when
  no active goal (solo -> pentatonic, band -> timing, theory only -> ear,
  songs level -> barre, else changes ADE / pop when G C D were heard).
- Teacher `nextLesson()` now caps by experience (none 1, little 2, some 3,
  lot 4) and skips a not-started lesson whose chord skills were all heard
  (not for 'none'; also skipped when intake.can says it — 'open' covers every
  open-chord skill, 'strum' strum-down); a lesson left in progress stays next
  only while `eligible()` (an arpeggio lesson left open no longer jumps ahead
  of a beginner — user saw that). Home header pill "Next lesson" (`home.nextLesson`, App
  `onNextLesson`) when the Teacher knows the student and before any visit
  (the "back where I was" pill takes its place after). Settings: "Getting
  started" -> Again = `restartOnboarding()` + reload. Text `i18n/tips/onboarding.js`.
- Verified (Playwright, fresh profiles): new / few+check / vocal paths, the
  stores written, reload opens the chosen card with the pill. Mic check
  itself = the Teacher's ChordStep (not re-tested with a real guitar).

## Guitar Teacher (built 2026-10-25, phase 1A)

- TEACHER = ONE SCREEN (v1.0.120, 2026-11-06; user: "Today / Goal / Path
  is unclear — build it all"; mockup canvas
  https://claude.ai/artifact/DvZN2huEHUCDtC7FpUTrvJ; rollback point = branch
  `ui-pre-teacher-v1.0.119`). No Today | Goal | Path tabs: `TeacherHome.jsx`
  draws ONE hero (the student's goal when there is one — solo goal, or the
  Coach skill goal once the goal row is visible — else the next lesson),
  then iOS rows (`ph-group` / `LibraryRow`): "My progress" (level · lesson
  n of m + bar -> `PathList` sub-screen), the next lesson (when the goal is
  the hero), "Today's practice" (homework, only when there is some), "My
  goal" (`goalVisible`: players (experience some/lot), level 0 done, or a
  goal exists) / "The solo plan", Achievements; ••• (MoreMenu) = about you,
  the path, choose a goal. Path = lessons only (✓ done / ● now / empty),
  unwritten ones = "N more on the way"; skills no longer listed there.
  Goal pick: "A specific solo or song" (GuitarPro library: built-in SOLOS +
  imports, passed from App as `gp={solos, openSolo}`) or "A skill" (=
  CoachView embedded, screen `skillGoal`; initialScreen 'coach' maps there
  or to the pick). Solo goal = teacher state `goal {kind:'solo', soloId,
  target, at}` (`setTeacherGoal`); `soloPlan()` = sectionMastery from the
  perf log, weakest section at tempo = round5(topTempo ?? 60) clamped
  50..target, whole solo at min(80, target) (target once all mastered);
  today's session = bends warm-up (launch 'bending', only when the section
  has bends) · the weakest section · the whole solo. Continue / Go ->
  App `openSolo` = `lickTrainer.launchSolo(id, section, pct)` (new: sets
  solo + section, writes the tempo memory for `<id>#<section>`) + GuitarPro
  `openPractice` (opens the Practice view). No time estimates shown (no
  data yet).
- FIRST LESSON "Meet the guitar" `g0-basics` (v1.0.117, 2026-11-06, from the
  mockups the user approved on the Design canvas
  https://claude.ai/artifact/Kjb2yBJwe2iSzJJyiTzWU7): 7 picture steps
  (`kind: 'visual'`, `visual` = parts / strings / fingers / fret / neck /
  diagram / strum) drawn by `components/Teacher/BasicsVisual.jsx` +
  `Basics.css` (`.tb-*`, CSS loops; Again / Hear restart them, Hear plays the
  open strings / E on string 4 fret 2 / Em; Strum has Slow). Photos = the
  user's own guitar + hand (Gibson logo and baked digits removed, background
  keyed): `public/teacher/guitar-front-v.webp` (parts), `guitar-front.webp`
  (neck step: fades into the drawn neck), `hand-left.webp` (finger badges at
  % positions). `stage: 'Em'` on neck / diagram = the real neck below shows
  Em; other picture steps have no neck. Lesson has no skills, `onlyFirst`:
  mastery `covered()` skips it once any other lesson was started. Neck
  orientation text: the app's neck = the view looking down while playing
  (thin string on top); the strum picture = the guitar standing (thick on
  top). g0-first-note's intro no longer repeats the parts.
  v1.0.118: on the iPad the Hebrew labels INSIDE the SVGs came out
  letter-reversed (an SVG under dir="ltr"); each picture's <svg> now gets
  direction="rtl" in Hebrew with start/end anchors swapped (positions same).
  v1.0.119: replaced by the sure fix — NO words inside those SVGs at all:
  `Lbl` = an HTML label over the drawing (`.tb-svgbox`, viewBox coords as %,
  font-size in cqw so it scales with the drawing; data-a start/middle/end);
  only digits / O / Em stay as SVG <text>.
- METRONOME IN A STEP (v1.0.117; user: "the text says the button is at the
  bottom, it's at the top"): a checklist step with `metronome: <bpm>` shows
  `MetroBox` (LessonPlayer: Start/Stop + 4 beat dots + BPM) driving the SHARED
  metronome via App `teacherMetro` (sets the source to 'standard', the bpm,
  start); a metronome the step started stops when the step is left. Used in
  g0-first-chord "With the metronome", the arpeggio and tapping practice
  checklists; their text says "Start below" instead of pointing at the bar.
- LEVEL 0 lessons (2026-10-31, plan phase 2 — the USER reviews all three
  together): `g0-first-note` (posture + pick checklist, tune, the six strings
  `arp open-strings` + quiz, `play` 6->1->6), `g0-clean-notes` "Notes on the neck: tone
  and semitone" (user's ask: the musical alphabet A–G + ♯/♭, E–F and B–C have
  nothing between; fret = SEMITONE, two frets = TONE, `arp string1-chrom`
  E F F♯ G G♯ A with fret numbers (ARPS `frets` + `sharps`), quizzes F->G =
  fret 3 (skill tone-semitone) and B->C = semitone; one finger per fret,
  clean-note checklist, E F G on string 1 / B C D on
  string 2, "Ode to Joy" first phrase (Beethoven, public domain) as `play
  ode`, spider 1-2-3-4 `play spider-1`), `g0-first-chord` (Em = E root, G minor 3rd, B 5th; shape, mic
  chord check, quiz, down strums + metronome 60 checklist, lift-and-land).
  New skills open-strings / clean-notes / finger-1234 (play checks);
  chord-Em + strum-down moved to level 0; FINGERS.Em. ARPS `strings: true` =
  the strip's small label is the string number; finger 0 = open string;
  `teacher.finger.legend` for non-tap finger labels. PlayStep: a REPEATED
  note (ode E-E, G-G…) needs a new pick (useBassOnsets' rule: sound stops, or
  the level rises > 1.6x its minimum and by > 0.03) — a held note no longer
  counts twice; fake-mic ode test heard all 15. `nextLesson` offers
  level 0 only when experience is 'none' (or no intake). Verified: Playwright
  walked all three lessons; a Karplus-Strong WAV of the open strings as the
  fake mic -> the play step heard all 11 notes. The old D-A lesson still has
  its own tune / posture / strings steps (repeat for level-0 students).

- LEVEL 1 written (v1.0.156, 2026-11-07, user: "start"; the USER reviews
  them): method = JustinGuitar's beginner order (D, A, then E; one-minute
  changes per new pair; strumming on a hand that never stops: quarters ->
  down-up eighths -> the common pop pattern D-DU-UDU; change on the last
  "and" with open strings) + RSL Debut rhythm in 4/4. `g1-chord-E` (E =
  Em + index on string 3 fret 1, G -> G♯ = minor -> major 3rd; mic check;
  quiz; D->E guide finger on string 3; changes A–E + D–E; I / IV / V in A),
  `g1-strumming` (4 checklists with MetroBox, the common pattern with the
  rock groove, A–D–A–E loop chart), `g1-first-song` (chart reading, our own
  8-bar song A A D A | A E D A, the 12-bar blues in A with the blues
  groove, quiz bar 9 = V). New skills strum-eighths / strum-pattern /
  strum-change / song-chart / song-12bar (self). Step fields `strum
  {pattern (8 slots D/U/-), chord}` and `chart {bars, pattern?}` drawn by
  `components/Teacher/RhythmBits.jsx` (StrumPattern: 1 & 2 & … — Hebrew
  "ו" — with the playing slot lit; ChordChart: 4 bars a row, the playing
  bar lit; both have Hear at the step's tempo); a strum step shows its
  chord on the neck, a chart step has no neck. TRY_IN rows for the three.
  Pure check: every skill / shape / pattern valid, E = E B E G♯ B E, path
  little: D-A -> E -> strumming -> first song. Playwright walked all three
  (HE + EN), Hear lights slots / bars. NOT verified with a real guitar.
- LEVEL 2 written (v1.0.157, 2026-11-07, user: "keep building, I'll go
  over it later"; the USER reviews): RSL Grade 1 = all open chords + one
  scale, in JustinGuitar's order. `g2-minor-chords` (major vs minor = the
  3rd a semitone lower; Am = the E shape one string over, A C E; Em review;
  Dm = D with the 3rd F♯ -> F, new fingering; quiz; changes E–Am + Am–Dm;
  Am Dm Am E chart), `g2-G-C` (G = G B D with 4-2 open; C diagonal C E G;
  ANCHOR fingers C–Am — index + middle stay, only the ring moves; changes
  C–Am (40) + G–C; G D Em C = I V vi IV song with the rock groove),
  `g2-minor-pent` (A C D E G = 1 ♭3 4 5 ♭7; box at fret 5 one finger per
  fret — ARPS `am-penta-1`; play up, then up+down; roots quiz s6f5 / s4f7 /
  s1f5; alternate picking at 60; first improvisation over the blues
  groove). FINGERS Am / Dm / G / C, new skills changes-EAm / changes-AmDm /
  changes-GC / changes-CAm / song-G / penta-shape / penta-roots /
  penta-improv. TRY_IN (+ new kind `scale` -> Scale practice, `try.scale*`).
  Pure check: shapes = right tones, fingers match frets, penta labels +
  roots, path L1 -> minor chords -> G C -> pentatonic. Playwright walked
  all three; fake-mic (KS) WAV of the 12 box notes -> the play step heard
  all 12. NOT verified with a real guitar.
- LEVEL 3 begins (v1.0.158, 2026-11-07, user: "build another guitar
  lesson"; the USER reviews): `g3-small-F` "On the way to F" in
  JustinGuitar's order (Fmaj7 before any barre, then the small F
  xx3211 = Fmaj7 with the index flat over strings 1–2, full barre later):
  Fmaj7 shape + mic, C -> Fmaj7 (index = anchor, ring + middle one string
  thinner), C–Fmaj7 checklist at 60, quiz the open E = major 7th, the
  small F + "every string rings" checklist + mic (the missing-index rival
  = Fmaj7 itself), one-minute changes C–F (30), C – Am – F – G
  (I vi IV V) chart with the rock groove. SHAPES / FINGERS Fmaj7 + F,
  skills chord-Fmaj7 / fmaj7-tones / chord-F / changes-CF / song-CAmFG,
  TRY_IN. mastery `knownSkill`: intake 'open' now covers chord skills of
  level <= 2 only (F isn't an open chord). Minute changes use F, not
  Fmaj7 (the chroma detector has no maj7 template). Playwright walked it
  HE + EN. NOT verified with a real guitar.
- Plan doc (Docs artifact): https://claude.ai/artifact/CeJC6CVwAu6KmqVXyjPQ46 —
  user approved: Coach merged into the Teacher, guitar levels 0–3 first, no
  AI chat in phase 1, Claude writes lessons and the USER reviews level 1
  before more are written; songs = the student's known songs (YouTube +
  link-out to Tab4u / UG / Nagnu, private paste, auto-detect) — not built yet.
- Home card `teacher` (2nd card, instrument guitar; art = the USER'S picture
  (2026-10-25: two rock guitarists in front of a glowing lesson screen) as
  `public/home/teacher-3.webp` (900x663, legs fading out, no headstock logo; a new picture = a new file name), made transparent by colour-to-alpha from white (`scripts/home-art-color-to-alpha.py`, so the faded legs blend into the light card) — the
  only card whose INSTRUMENT_ART is an <img>, CSS `.home-art-teacher img`, no
  floor shadow; 3 shortcuts = one row of three on phones), shortcuts
  Lesson / Path / Coach -> HomeMenu option `teacherScreen` -> App
  `teacherStart` {screen, n}. The Guitar card no longer has Coach; nav
  section `teacher` (🎓) replaced `coach` in sections.js (`coach` section is
  still rendered if set; CoachBanner's Coach button opens teacher -> coach).
- `teacher/curriculum/guitar.js`: DOMAINS, LEVELS (0 Pre-Debut .. 3 Grade 2,
  RSL), SHAPES/FINGERS, SKILLS (each with a measurable `check`: chord (mic),
  changes {pair,min} (one-minute changes in perfLog), quiz, self), LESSONS
  (only `g1-first-chords` "D and A" has `steps`; others are titles = "Soon").
  Step kinds explain(shape) / tune (inline GuitarTuner) / checklist / quiz /
  chord (useMicChordDetector + judgeShape vs the other open chords and the
  shape with one finger missing, 2 hits 0.5 s apart) / changes (MinuteChanges
  embedded, its header hidden). Text inline {en, he}; Latin tokens in Hebrew
  wrapped with `H()` (LRI/PDI).
- State `dudestar-p-teacher` (`teacher/teacherState.js`, per profile + synced):
  intake, lessons {started, step, at, done}, passes {skill: [days]}, current.
  `teacher/mastery.js` DERIVES status: mastered = check met on 2 different
  days (quiz/self once); homework progress from perfLog `minuteChanges`
  items `A>D` / `D>A` (perMinute). Open homework = finished lessons whose
  skills aren't all mastered.
- Lesson `g3-arpeggios` (level 3, user's request 2026-10-25: arpeggios, how
  to play them and connect them along the neck; method from the published
  outlines of Rick Beato's Arpeggio Masterclass (paid course — only its
  outline was readable) + JustinGuitar's triad arpeggios; text is our own):
  hear strum vs arpeggio -> chord tones 1/3/5 (C = C E G) -> quiz -> open C
  (mic) -> shape 1 root on 6 (G-E, two octaves, rolling) (mic) -> shape 2
  root on 5 (C-A) -> picking checklist -> C triads on strings 3-2-1 at frets
  3 / 8 / 12 (root pos / 1st / 2nd inv) (mic) -> quiz -> Am over C (♭3).
  Shapes in pure `teacher/arpeggios.js` (`ARPS` [stringNumber, fret] in play
  order, `arpNotes()` -> {string idx 0 = low E, fret, midi, noteName,
  degreeLabel, isRoot}, `playOrder(ids, updown)`). Step kinds `arp` (neck =
  Fretboard `scaleNotes` overlay, labelMode degree/note, App teacherStage
  `scaleNotes`; `NoteStrip` pills in the card; Hear = picked, `compare` adds
  Strum) and `play` (`PlayStep`, usePitchDetection: the next note is ringed on
  the neck and advances on the exact midi ±45 ¢ heard twice in a row = the
  Lick Trainer Wait idea; logs perfLog tool 'arpeggio'). A `play` skill passes
  ONLY from the mic, never from Next. Homework kind `play` (Practise opens the
  same PlayStep on its own sub-screen, with the neck). `nextLesson()` prefers
  the first unfinished lesson that has steps. Synthetic test: Karplus-Strong
  WAV of the G-E arpeggio as Chromium's fake mic -> all 13 notes followed.
- UI `components/Teacher/` (TeacherView: Today | Path tabs, intake, coach
  and practise sub-screens; LessonPlayer). Root has `dir` from the language.
  The neck (App `teacherStage`) shows only inside a lesson, with the step's
  chord; none on tune / changes steps. Text `i18n/tips/teacher.js`.

## Songwriter card (built 2026-10-26)

- User's request after a market review (Hookpad, Spit Notes, Songcraft,
  Songwriter's Pad, Hum, ScoreCloud, MasterWriter…): lyrics + chords + the
  SUNG/PLAYED melody turned into notes under the syllables — the gap no app
  fills. User's answers: own home card; full phase 1 incl. melody->notes;
  prosody check (stressed syllable on a strong beat) = phase 2; song TEXT
  syncs (personal key), AUDIO stays on the device.
- Home card `songwriter` (6th, before Tools; HomeMenu option `songwriter:
  'list'|'new'|'idea'` -> App `songwriter` state {view, n} ->
  `components/Songwriter/SongwriterScreen.jsx`, rendered instead of home /
  AppShell, Home button -> back on this card). Art = the USER'S picture
  (2026-11-07: open notebook with lyrics / chords / staves + a gold pen)
  `public/home/songwriter-notebook.webp` (1000x744, rotated 4°); it came
  as a JPG with a BAKED checkerboard (fake transparency): keyed by the
  scratchpad nb/scan.py + final.py (per column / row "first non-checker
  run" bounds inside a hand-drawn polygon, the gold pen from saturation,
  a soft floor shadow of our own — the checker's shadow can't be kept).
  The old drawn `songwriter.svg` stays unused. Same img CSS group as vocal.
  v1.0.159: the picture is 5 % smaller at every size (user's request;
  `.home-art-songwriter img { scale: 0.95 }` at the end of HomeMenu.css).
- Pure `music/songwriter/`: `lyrics.js` (ChordPro-style chords in the line
  text `[Am]words`, parseLine/joinLine, setChordOnWord, replaceText keeps
  chords over their words while typing, splitRaw/joinRaw for Enter /
  Backspace, syllables EN (vowel groups, -le) + HE pointed (vowel points) +
  HE unpointed (matres ו/י, final ה/א) — an estimate, overridable per line
  with hyphens (`line.syl`); rhymeKey/rhymeScheme), `song.js` (model,
  transposeSong — changing an already-set key transposes chords + melody,
  diatonicChords, chordMidis, fitToSyllables (extra notes -> melisma `c`,
  legato ones first), chordTimes (chord = start of its word's first note),
  songTimeline), `transcribe.js` (Lick Trainer analysis + the take's own
  tuning offset removed + vibrato blip merge + grid snap from the count-in),
  `musicxml.js` (lead sheet: melody, lyrics with syllabic, harmony; `screen`
  drops tempo/rehearsal marks that collide with chords in alphaTab).
  Synthetic tests (voice with vibrato/scoop/sharp or flat + KS guitar): notes
  and rhythm exact on 5 of 6 takes.
- Audio: `audio/songwriter/songRecorder.js` (own live context in the tap,
  Settings input, capture worklet, count-in click 1.8/2.4 kHz = above the
  pitch range; latency from the clicks the mic heard (studio's
  latencyFromCountIn) else saved / estimated; iOS closes the mic after each
  take), `songAudioStore.js` (IndexedDB `dudestar-songwriter`, WAV per take),
  `songPlayer.js` (melody + chords on the piano via schedulePianoNotes).
- UI: list (Ideas = a recording, WORDS, or both (user's request 2026-10-31):
  `Words` = a text idea (textarea, the keyboard mic can dictate; empty one
  is dropped), pen = edit words on any idea, mic on a words-only idea
  records onto it (`audioId`; recorded-first ideas keep audio under their
  own id); `Song` makes a song: text -> sections (`sectionsFromText`, blank
  line = new section), audio = a take on the first line; My songs)
- DICTATION (user's OK 2026-10-31): `useDictation.js` = the browser's own
  SpeechRecognition (Chrome/Android -> Google, Safari -> Apple; no key, no
  server), continuous + interim; each final phrase = a lyric line
  (`cleanPhrase` drops a trailing . , ; and turns "new section" / "קטע חדש"
  into a blank line), Safari's never-final words are committed on end;
  Chrome's silence-end restarts while wanted. `DictationBox.jsx` = textarea +
  Dictate key + עב|EN language toggle (device key `dudestar-dictation-lang`,
  default = app language). Used in a words idea and in the editor's
  `Dictate` sheet (next to Add section; autoStart; Add ->
  `appendTextToSong`: an all-empty song becomes the text, else the first
  block continues the last section and further blocks are new sections).
  Hidden where unsupported (Firefox). Tested with a mocked recognizer only
  — NOT on a real iPhone / Android., editor: title, Key / Tempo / Time / Click selects,
  Play; sections (kind select, play / duplicate / up / down / delete with
  Undo), lines: chord row always reserved (selecting must not shift layout —
  a click after pointerdown landed elsewhere), tap word = edit, Enter splits,
  Backspace at start joins, paste with blank lines = sections; syllable
  count + rhyme letter; compact melody lane; tools Record / Play / Melody /
  Takes. Record -> count-in -> Stop -> notes found automatically (toast +
  Undo). Melody editor sheet (MelodyLane editable: tap/drag/stretch/add,
  ↑↓, Join, Snap select, syllables field + Auto). Score view = ScoreView
  (alphaTab, MusicXML). Print = lead sheet (`.sw-print`, print CSS). Export
  = .musicxml download. The song list shows the tempo only once it means
  something (`bpmSet` = changed by the user, or a line has a melody) — the
  default 90 isn't shown (user asked why every song said 90 BPM). Store `useSongs` -> personal key
  `dudestar-p-songwriter` {songs, ideas}. Text `i18n/tips/songwriter.js`.
- APPLE-STYLE PASS (v1.0.121, 2026-11-07; user: "go over the card, check
  design + flow, improve, fit our principles"; rollback branch
  `ui-pre-songwriter-v1.0.120`). List: title + ONE tinted "New" capsule
  (`.sw-btn.is-tint`; was a filled blue pill), the subtitle only while the
  page is empty; Ideas / My songs = iOS inset groups (`.sw-group-sec`,
  `.sw-group-head` with quiet Words + red-tint Record capsules,
  `.sw-group` rows, `.sw-group-empty` empty states). Idea row
  (`.sw-idea-row`): play / record-onto icon, body = first line + (second
  line · date · length) — tap = edit words below the row (the duplicated
  full-text block is gone), peaks, tinted "Song", ••• (Edit words, Delete
  with Undo). Song rows have a chevron (`.sw-chev`, mirrored in RTL).
  Editor: top = back · Lyrics|Score · ••• (Print, Export + its note,
  Delete song -> `.sw-confirm-bar` under the top bar); key / tempo / time /
  click folded behind a summary chip (`.sw-meta-chip` "Am · 92 BPM · 4/4",
  `showMeta`) with Play as the screen's one primary on the same row; each
  section header = kind select + play + ••• (Duplicate, Move up / down —
  only when possible —, Delete with Undo); the footer row (Print / Export /
  Delete) and the export footnote are gone (both in •••). Logic untouched.
- v1.0.124: the idea rows' ••• menu was invisible — `.sw-group`'s
  overflow: hidden clipped it; now no overflow (first/last li inherit the
  radius) and the row holding an open menu is raised (z-index 3).
- SUGGESTED CHORDS (v1.0.122, 2026-11-07; user: "can it listen to humming
  and write chords?" -> a hum has no chord: SUGGEST one per bar, play it on
  guitar or piano). Melody sheet tool "Chords" (`ChordSuggest.jsx`, shown
  when the line has notes). Pure `music/songwriter/harmonize.js`:
  `estimateKey()` (Krumhansl–Kessler + tie-breaks: last note = tonic +0.08 /
  5th +0.03, first = tonic +0.03, major +0.04), `suggestChords(line, {key,
  time})` per bar: the key's triads (+ harmonic-minor V) scored by the bar's
  notes (length × onset weight 1.6 downbeat / 1.25 beat / 1; non-chord tones
  −0.6 strong / −0.15 weak) + function priors, tonic bonus on the first bar,
  last bar tonic +0.15 / V +0.05; top 3 per bar + the WORD sung at the bar's
  start (-1 = none / same word); `applyChords()` = the line's plain text with
  ONLY the chosen chords over those words; `chordsTimeline()`. Key select in
  the panel (song key, else the guess + a note). Player
  `audio/songwriter/harmonyPlayer.js` `playHarmony()`: guitar ("E shape"
  barre voicing R 5 R/♭7 3 5 R, `scheduleGuitarNotes()` new in
  chordPlayer.js + `prepareGuitar()`) or piano (LH bass, RH close chord),
  strum (D · D U · U D U per bar, 3/4 and 6/8 patterns), arpeggio (eighths)
  or held chords; melody = the student's own take (only when sung to the
  click at this tempo: take.downbeat != null and take.bpm = song.bpm;
  decoded buffer started at downbeat + fromBeat) else the notes on piano.
  Tap a chip = choose it and hear THAT bar; Play = the whole line; Apply ->
  line raw (Undo in the sheet's tools). Prefs per song `song.harmony
  {instrument, style, voice}`. `.sw-sheet > *` no longer shrinks (a tall
  sheet squashed its tools row over the panel). Pure checks: Twinkle in C ->
  C | F | F | C; Am tune -> Am G F E. NOT verified with a real hum.
- BAND · PERFORM · RHYME COLOURS (v1.0.137, 2026-11-07; user picked items
  1-3 of the competitor review — Hookpad band templates, Spit Notes
  teleprompter + rhyme highlighter). (1) `audio/songwriter/bandPlayer.js`
  `playBand(song, {only, from, style, melody})` = playSong's handle;
  playSong delegates when `song.band.style` is set (all play buttons).
  `BAND_STYLES` pop / rock / ballad / country / blues / reggae / jazz =
  drum style (drumHits from studio/drumTrack, scheduled 0.35 s ahead every
  60 ms into a gain = drum level) + `bassLine()` kind (pop 1·&2·3·4-5th,
  eighths, half, rootFifth, boogie 1-3-5-6 (minor ♭7), reggae, walk 1-3-5 +
  half-step approach into the next root; roots E1..D#2) + comp (guitar
  strum / block = harmonyPlayer `accompaniment()` (now exported, with
  `shapeOf`), piano arp, skank on 2 & 4, jazz comp on 2 & the and of 3);
  melody on the piano unless `song.band.melody === false` ("I sing it").
  Drum grid origin = the first line's downbeat (pickups). bassPlayer gained
  `scheduleBassNotes()`. Editor Key/tempo panel: Band select (Piano only +
  7) + Melody select; the summary chip adds the style (one line,
  ellipsis). `prepareBand()` preloads piano / guitar / bass samples.
  (2) `PerformView.jsx` (portal, black stage, `.sw-perform*`): sections +
  chords over words big (A/A size, device key `dudestar-sw-perform-size`),
  the sung line lit and centred, past lines dimmer; glass keys Scroll
  (silent clock with the song's timing) | Play (useSongAudio scope
  'perform'; `play(song, scope, only, from, restart)` gained from/restart);
  tap a line = start there; Escape / × closes; Wake Lock keeps the screen
  on. Entry = "Perform" tinted capsule beside Play (icon only <= 430 px).
  (3) `rhymeFamilies(song)` (lyrics.js): line-end words seed families by
  rhymeKey, a family needs 2 different words, then every word with that
  sound joins (inside lines too; < 3 letters only at a line end) ->
  LyricLine `rhymeOf` colours words (`.sw-word-text.is-rhyme`, tint +
  underline, `RHYME_COLORS` Apple palette); ••• "Rhyme colours" toggle
  (device key `dudestar-sw-rhymes`, default on). Checked: night / light /
  bright / right / tonight + nothing / walking; בלילה / שבילה; Playwright
  390 + 1180: band chip, playback lights lines, perform play + scroll
  follow lines, no page errors (samples blocked here — band SOUND not heard;
  verify on the iPad).
- IDEA = RECORD AT ONCE (v1.0.140, user's OK): the card's Idea shortcut
  (`songwriter: 'idea'`) opens the list at Ideas AND starts recording a new
  idea immediately (SongwriterScreen `autoRecord`, once per visit — coming
  back from a song doesn't record again); Stop saves it as usual.
- SUGGEST CHORDS FROM THE VISION (v1.0.141, 2026-11-07; user: "can it
  suggest chords from the words alone?" -> yes, from a short brief of his
  vision; rollback branch `ui-pre-progress-v1.0.140`). Pure
  `music/songwriter/progressions.js`: LIB of standard progressions in Roman
  numerals (major: axis I–V–vi–IV, vi–IV–I–V, 50s, I–IV–vi–V, I–♭VII–IV,
  royal road IV–V–iii–vi, Canon, ii–V–I, maj7 / add9 colours, pre-chorus
  IV–V climbs, bridges vi–V–IV–V / ♭VI–♭VII–I, 12-bar blues; minor:
  i–VI–III–VII, Andalusian, i–iv–v, i–VI–iv–V, VI–VII–i, minor ii–V,
  minor blues …), each tagged mode / roles (verse, prechorus, chorus,
  bridge) / moods / styles / level 1-3; `realize(token, key)` (b/# steps,
  ø, °, 7 / maj7 / add9 / m7), `candidates(role, brief, key)` scores mood
  +3 · style +2.5 · level fit, the "rich" colour enriches plain ones
  (I add9/maj7, IV maj7, minor chords m7); `plans()` = one progression per
  section role in the song, contrasting (the verse never repeats the
  chorus; blues `form` may repeat); `chordLine()` = a sung line: one chord
  per bar on the word sung at the downbeat; no melody: `perLine` chords
  (2, blues 4) spread by syllables; a repeated chord just holds;
  `applyPlan()`; `suggestKey()` (guitar-friendly: sad / tense -> Am / Em /
  Dm, else C / G / D / E / F / A by style), `suggestBpm()`, STYLE_BAND,
  `needsChords()`. UI `components/Songwriter/ProgressionWizard.jsx` (sheet
  `.sw-pw*`): 3 questions as iOS rows (feeling 6 · style 8 · chord colour
  simple / flowing / rich), then per section kind: chord pills, Roman
  numerals, a one-line role note, ‹ n/N › alternatives, ▶ hear it with the
  style's band (temp song, scope `pw:<role>`), key select (+ notes), Hear
  (whole song) + Apply -> chords written, key set, band style / tempo only
  when the writer set none, answers kept in `song.vision` (next open = the
  results), toast with Undo. Entry: editor ••• "Suggest chords" and a hint
  row (`.sw-pw-hint`, "Suggest") while the song has words and no chord.
  Text `sw.pw.*`. Playwright 390 HE + 1180 EN: questions -> results ->
  cycle -> hear -> apply, no errors. Band sound not heard here.
  v1.0.143 (user: "let me change the tempo; Hear covers the words, I
  can't check the fit — solve it as Apple would"): the results have a
  Tempo BpmField next to Key (wizard `bpm`, null = the style's
  `suggestBpm`; Apply sets bpm + bpmSet when changed). "Hear" became
  "Try" (`sw.pw.try`): the sheet folds into a floating Liquid Glass bar
  (`.sw-pw-bar`: Options = back to the sheet · round Play/Stop · tempo
  −/+ · Apply) and the suggestion is shown IN the lyrics as a PREVIEW
  (SongEditor `preview` via `onPreview`, `shown = preview ?? song`,
  sections `inert` + chords in accent, nothing saved, the meta chip shows
  the preview's key / tempo); playback lights + scrolls to the sung line;
  a tempo change while playing restarts at the new tempo. Playwright 390
  HE + 1180 EN: tempo, try, lit line, tempo while playing, back, apply.
  v1.0.162 (user: "the suggestions are banal — the same loop every line,
  no change in the verse, no build-up to the chorus, never leaving the
  key"): `developSection(tokens, slots, {role, minor, level, style,
  next, seed, form})` turns a section's progression into its own chords
  per line: lines pair into phrases; every 2nd statement swaps one chord
  for a same-function one (`SUBS`: I->vi/iii, IV->ii/vi, minor iv->VI /
  iiø7 …, never its neighbour); a middle phrase ends on V (half cadence)
  or on the SECONDARY DOMINANT of the next phrase's first chord (V/vi =
  III7, V/IV = I7, V/V = II7; never into ° / ø; "simple" once, "flowing"
  / "rich" at every phrase); "rich" also borrows on the 3rd statement
  (`BORROW`: iv, ♭VI, ♭VII in major, V / IV in minor); the last bar:
  chorus V–I, pre-chorus IV–V (♭VI–♭VII rich; minor iv–V / VI–VII), bridge
  IV / VI – V, a verse before a chorus Vsus4–V (V alone when simple; VII
  for minor rock / reggae). `applyPlan(song, choice, time, {key, brief})`
  (the wizard passes them; without = the old repeat) counts each line's
  slots with chordLine and writes the developed chords. `plans()`: a
  section avoids starting on the chorus's first chord when an equally
  fitting progression exists (score within 2). Pure check printed whole
  songs in Dm ballad rich / C pop simple / G pop flowing / Em rock / Am
  pop: variations, A7 / E7 / G7 / Bb7 secondary dominants, Dorian G in Dm,
  sus4 handovers; pw2.cjs (wizard try / tempo / apply) still passes.
- IDEA RECORDING ON iPAD + LIVE METER (v1.0.144; user: "on the iPad Ideas
  doesn't record the hum; there must be a visible sign it records — a
  moving light bar like an equalizer"). songRecorder `openInput()`: after
  the mic opens, a context that is still not running (the Idea shortcut
  records with no tap; iOS) is REPLACED by a new one and the input
  reopened on it (the tuner's iPhone fix; resume bounded 400 ms). The
  meter no longer reads the AnalyserNode (iOS WebKit gave zeros): the
  capture worklet keeps a 2048-sample ring (`createCapture().recent(n)`,
  recorder.js), songRecorder `level()` / `bands(12)` (Goertzel, log bands
  110 Hz – 4 kHz, −60..0 dB) read it. `RecMeter.jsx` = an LED equalizer
  (12 columns x 7 LEDs green / amber / red on a black plate, `.sw-eq*`)
  in every recording strip (Ideas, a line, the melody sheet); useSongAudio
  tick = {…, bands (slow fall), silent (pure zeros for 2 s)} ->
  `sw.rec.silent` warning. Fake-mic hum: meter lit, idea saved (0:04).
  NOT verified on the iPad.
  v1.0.147 (user: still not recording on the iPad, the iPhone works):
  three iPad-only suspects fixed at once — (1) `openLiveInput()` (amp /
  recorder / studio / songwriter) falls back to the DEFAULT input when the
  Settings device is gone (Overconstrained / NotFound / NotReadable — the
  iPad had the Riff interface chosen); (2) `inputNode()` splits a channel
  only from a stream KNOWN to be stereo (an unreported / mono built-in mic
  with "Input 2" gave silence); (3) a quiet take (the iPad mic with AGC off
  peaks ~-45 dBFS) is normalised on stop (peak -> -1 dBFS, max +36 dB,
  `gain` / `inputPeak` on the result), and the meter auto-ranges (top =
  the loudest band of the last ~3 s, >= -50 dBFS, 45 dB span) + shows the
  input peak in dB. Silence for 2 s -> the warning + an LTR diag line
  (`recorder.diag()`: ctx state · rate · track state / channels / label ·
  audio session) — ask for a screenshot if it still fails. Fake-mic test:
  quiet hum (0.006) with a missing device + channel 2 -> meter lit, take
  saved at peak 0.48. NOT verified on the iPad.
- SCORE TITLE IN HEBREW (v1.0.149; user: the song name in the Score view
  was written backwards — WebKit draws Hebrew inside SVG <text>
  letter-reversed, as on the lesson pictures): the screen MusicXML gets no
  title (`title: ''`), ScoreView shows it as an HTML `.sw-score-title`
  above the score; `fixHebrew(host)` (exported from ScoreView) marks every
  Hebrew <text> alphaTab draws (lyric syllables) direction="rtl" +
  unicode-bidi="embed" on postRenderFinished — also in GpSongPlayer (GP
  files with Hebrew titles / lyrics). Title fix sure; the lyric marking NOT
  verified on the iPad.
- SCORE PLAYHEAD (v1.0.150; user: "in the Score view, while playing,
  show what sounds at that moment"): `scoreLineStarts(song)` (musicxml.js,
  the same line layout songToMusicXML writes) -> SongEditor `scoreBeat` =
  the active timeline line's score beat + (pos − downbeat) / spb; ScoreView
  `beat` / `bpb` props find the bar (`boundsLookup.findMasterBarByIndex`)
  and the beat whose playbackStart covers the tick (`calculateDuration()`)
  and draw an overlay (`.sw-score-stage` / `.sw-score-marks`): the bar
  tinted, the sounding note boxed (not for rests), a cursor line through
  the staff system; re-measured after every render (`layoutN`), the line
  kept in view. Playwright (seeded song, 100 BPM): the box moved note by
  note (1.8 s = the 3rd note), no errors.
- TAKES (v1.0.151; user: "after recording a take there's no way to
  delete it" — the trash icon existed but Takes only shows for the
  SELECTED line, and his selected line had none): editor ••• "Recordings"
  (`showTakes`, `.sw-takes-sheet`) lists every take of the song by line
  (play / notes / delete); `deleteTake()` = toast "Take deleted" + Undo
  (back at its index), the audio is deleted on the toast's expiry. MoreMenu
  now CLOSES when a `.more-menu-item` button is chosen, except toggles
  (aria-pressed) and `data-keep` (the first tap of a two-tap delete in
  GuitarPro / Lick Trainer).
- LINE TOOLS CLOSE (v1.0.161; user, iPhone: the selected line's Record /
  Play / Melody / Takes row couldn't be closed): SongEditor closes the
  selection on a pointerdown inside `.sw-editor` but outside any
  `.sw-line` / picker / sheet / menu / dialog, and on Escape (not while a
  take records, not with the chord picker open). Playwright 390: select
  -> tap the section header -> closed; Escape -> closed; Melody sheet
  still opens from the row.
- EMPTY SONGS + DELETE FROM THE LIST (v1.0.146; user's iPad: a list of
  "Untitled · 0 lines" songs that couldn't be deleted). "New" creates a
  song at once, so every New -> back left an empty one. `isEmptySong()`
  (useSongs: no title, no words, no melody, no take) + `store.prune(keep)`:
  run when the screen opens (before a card's New creates its song) and
  when leaving a song's editor — the old empty ones vanish on the next
  visit. Song rows got a ••• (MoreMenu, `.sw-song-li` = row + menu) with
  Delete -> toast "Song deleted" + Undo (`store.add(song, index)` puts it
  back in place); its recordings are deleted only when the toast expires.
  Playwright (1180 HE): 3x New -> back = 0 rows; delete + undo + reload.
- FREE WRITING (v1.0.163, 2026-11-08; user asked for a review of how
  McCartney / Bowie / Taupin / Chris Martin / Prince / MJ write, then
  approved stage 1 only — try it ~a week before stage 2 = word ladder +
  Bowie cut-up mixer). Ideas group head: "Freewrite" / "זרימה" (spark
  icon) -> `FreeWrite.jsx` (portal `.sw-fw`, full screen): setup = a
  sensory prompt (pure `music/songwriter/freewrite.js` PROMPTS x30 EN/HE,
  `nextPrompt`, "Another"), time select 3 / 5 / 10 min, Start; write = a
  bare textarea + glass bar (prompt, mm:ss, Done; at 0 "Time's up" + "+2
  min", writing goes on), word count; pick ("Find the diamonds") =
  `pieces(text)` (lines, long ones split at sentence ends / commas) as
  tappable rows, Save -> an Idea {text: the kept pieces (all when none
  marked), free: the whole text, prompt, minutes} -> the usual Idea ->
  Song -> Suggest chords flow; Discard = two taps. Method: Pattison object
  writing, Tweedy, Taupin's freeform (text ours). Text `sw.fw.*`.
  Playwright 390 HE + 1180 EN: start, type, done, mark 2, save -> idea.
  v1.0.164 (user: "expand the topics, from all kinds of worlds"): 132
  prompts in 14 WORLDS (`WORLDS` in freewrite.js; `PROMPTS` = flat with
  `world`): objects, places, moments, people (a character's POV), the
  other side (reversed POV), nature, city, memory, love, roads, music,
  start-with-a-line, what if, two worlds collide (metaphor collisions) —
  the idea sources songwriting teachers name (Pattison object writing,
  overheard speech / first line, reversed POV, metaphor collisions).
  Setup: "Topics from" select (Every world + 14; device key
  `dudestar-sw-fw-world`), the prompt card's eyebrow = its world,
  `nextPrompt(current, rnd, world)`; the idea keeps `world`.
- NOT verified with a real voice / on iPhone yet. Phase 2 ideas: prosody
  check, chords heard while recording (headphones), open in GuitarPro, Hebrew
  rhyme dictionary.

## Adaptive practice (v1.0.131, 2026-11-07)

- User: "the practice is unclear — when do I play, when does it listen,
  what is the feedback; with a metronome it must judge TIMING too; let me
  speed up; find my top speed and adapt; a level the system knows must
  carry across ALL exercises — dynamic and always learning". Phase 1 =
  the beat-per-note engine (Practice -> Scales + Rhythm) + the skill level
  + the Lick Trainer's start tempo / status. Phase 2 (NOT done yet): bass
  practice, chord changes, teacher play steps, drills onto the same model.
- `coach/skillLevel.js`: `passed(e)` (accuracy >= 90 & timing >= 70, or
  lick score >= 85), `npsOf(e)` (metrics.nps, or bpm/60 for scale/rhythm),
  `fluentNps()` (2nd best passing run of 60 days, else 90 % of the only
  one), `lastPassedBpm`, `startBpm({tool, item, suggested, notesPerBeat})`
  (item's last passed tempo > 85 % of the fluent speed > the suggestion;
  why = item | level | default), `nextBpm()` (pass +8 % / >=4, struggle
  (notes < 75 or timing < 45) −8 %, else same).
- `useMetronome.onBeatTime(fn)` -> (beatIndex, HEARD perf-time: audio time
  + outputLatency) — metronome.js passes it as onBeat's 2nd arg.
- `useRhythmGame` rewritten (bass engine pattern): phases idle / demo /
  countin (4 clicks) / run / done; notes judged by time against the heard
  click (early min(200, .45 beat), late min(250, .5 beat), on time ±75 ms,
  DETECT_LAG 40 ms, octave slips accepted, wrong note near a beat = red
  flash + count); own onset detector (new pitch or re-pick by level jump);
  demo plays the sequence (playNote) with the marker; result {notesPct,
  timingPct, mean offset = tendency, wrong, passed, tempo change}; adaptive
  tempo ON by default; Speed = find-my-speed loop (+8 % per clean pass,
  stops at the first unclean one, settles on the best); loadExercise sets
  the start tempo from startBpm; logs nps + passed + timingPct. Old fields
  (score, combo, accuracyPct, stepIndex, feedbackCell…) kept.
- `components/PlayAlong` (PlayAlong.jsx/css, text `pa.*` in
  `i18n/tips/playalong.js`): status pill (idle hint / demo blue / count-in
  orange with the number / your turn red with a pulsing mic + live count /
  done), transport Demo · ONE big start key (red dot -> stop square) ·
  BpmField + "Adaptive" switch · Speed capsule, "starting at N — from your
  level / this item" note, result card (3 tiles + verdict + tendency +
  next tempo). Used by ScalePracticePanel (its effect no longer depends on
  isPlaying — a finished run used to reload the exercise and wipe the
  result + adapted tempo) and RhythmGamePanel.
- Lick Trainer: the same status pill above the transport (lt.idle /
  lt.idleWait texts); a never-practised lick starts at the TEMPO_OPTIONS
  step under 85 % of the fluent speed (`lickNps()`); takes log nps +
  passed. Timing accuracy with a real guitar NOT verified (fake mic only:
  silent run -> 0 %, tempo down, phases right).

- PIANO (v1.0.132, user: "build the new mechanism for the piano too"):
  Practice -> Chord rhythm (`useChordRhythm`) and Flow (`useFallingNotes`,
  now `useFallingNotes(metronome)`) run on the same model: phases idle /
  demo (the trainer plays: chords via playPianoChord with the keys lit /
  Flow notes lit as played) / countin (the whole-beat lead-in, counted
  down) / run / done; the clock starts on the HEARD first click
  (onBeatTime, 800 ms fallback); every chord / note is judged for the notes
  AND the time of its (first right) key vs its click (on time ±100 ms
  chords, ±90 ms Flow); result + adaptive tempo + find-my-speed via the pure
  `coach/playRun.js` (`runResult`, `tempoAfter`); PlayAlong strip in both
  panels (new props `idleText` / `runText`, texts `pa.idleChords` /
  `pa.idleFlow` / `pa.runKeys`; `pa.inTime` takes {ms}); the old play
  buttons + score lines are gone. Start tempo per panel open (`prepare()`):
  startBpm with a tool FAMILY (`tools`, new param) — chord rhythm
  ['chordRhythm'] (item `preset` or `custom:<chords>`), Flow
  ['fallingNotes'] (item = song key); guitar = `GUITAR_SPEED_TOOLS` (scale /
  rhythm / lick) so the instruments' levels never mix. Starter set: a new
  random progression after each played run (Demo + Start play the same
  one; find-my-speed keeps it). Logged tools 'chordRhythm' / 'fallingNotes'
  (nps = bpm / 60). Playwright bots: Flow on the click 13/13 100 % in time
  -> tempo up; chords 180 ms late -> "late by ~191 ms", tempo down; silent
  runs 0 % -> down. Guitar chord rhythm (GuitarChordRhythmPanel) not yet.

## Free play on a scale (v1.0.142, 2026-11-07)

- User: "show the scale on the neck, mark each note I play, check only that
  the notes are in the scale — regardless of rhythm or order — and tell me
  when a note is wrong" (+ look at guitarvisualizerapp.com: a visualizer
  only — scales / intervals / CAGED / chord tones in gold, no mic). Built
  for scales only (Claude's recommendation, user's OK): for licks / solos
  an order-free check is meaningless — the Lick Trainer's Wait mode already
  = right order, any rhythm.
- `hooks/useFreePlay.js` `useFreePlay({range})`: own onset detector (a
  pitch held 3 frames within ±35 ¢ — the way up a bend / slide is not
  judged, its landing is; re-pick = level jump), `placeNote()` = the mic
  hears a PITCH, not a string: the shown shape's place for it (or its
  octave), nearest the last note, else the nearest place to the shape
  (`inShape: false`) — the UI says so (`fp.placeNote`); `nearestInScale()`
  names the scale notes a half / whole step away. State: live counts +
  last note, `hits` (shape cells played), a green / red flash
  (`feedback` = Fretboard quizFeedbackCell), result on Stop: in-scale %,
  box coverage n/N, root landings, degrees never played, the top wrong
  notes, right notes outside the box. Logged as tool 'scaleFree' /
  'bassFree' with metrics {notes, inScalePct, coverPct, mode:'free'} (no
  accuracyPct, so the coach's readers skip it), from 8 notes.
- UI `components/PlayAlong/FreePlay.jsx` (PlayAlong's look; `.fp`, status
  kinds ok / bad green / red, `.fp-counts`): status (what to do /
  listening / "F is not in the scale — E is a half step below"), ONE
  Start / Stop key, live in / outside counts, result card. Fretboard:
  `scaleNotes[].isHit` -> `.scale-dot-hit` (green ring; plain dots filled
  green).
- Guitar: Practice -> Scales gains a "Practice: Click | Free" segmented
  control (first field); Free hides the PlayAlong strip, any mode
  (position / linear / transition) gives the shape; App `scaleFree`
  (isHit on scalePracticeShapeNotes, feedback first), stopped when leaving
  the tab; a new shape / style resets it. Bass (rule 10): Bass Practice
  Mode select gains "Free (any order)" for the Scales + Arpeggios
  categories only (`FREE_CATS`), tempo / Loop / Start hidden there; App
  `bassFree` (BASS_PITCH_RANGE). Text `fp.*` (tips/playalong.js),
  `bp.mode.free`.
- Fake-mic (KS) A C D E F G A A♯ A: guitar Am pentatonic -> every note
  marked, F / A♯ red with "E / A a half step below", 82 % in scale, 6/12
  of the box; bass G major -> same + "never played: B (3) · F♯ (7)". NOT
  verified on a real guitar / bass.

## Triads course (v1.0.133, 2026-11-07)

- User: "a comprehensive, professional triads course, taught the way a
  certified teacher would". Theory -> Triads (guitar only,
  featureCapabilities `triads`, COURSES before CAGED). 10 units in
  `teacher/curriculum/triads.js` (TRIAD_LESSONS, TRIAD_SKILLS — skillById
  in guitar.js also looks there; NOT in the Teacher's LESSONS, so
  nextLesson / the path are untouched): 1 what a triad is (roles, thirds,
  4 qualities, inversions) · 2 major on 3-2-1 (3 shapes, the 1-2-3-8
  ladder, moving by the root) · 3 I-IV-V in one area (common tones) · 4
  4-3-2 (the B-string shift) · 5 5-4-3 + 6-5-4 (same shapes, = 12 major
  shapes) · 6 minor (lower the 3rd) / dim / aug (symmetric) · 7 the chord
  scale (2nd inversion on 3-2-1, degree qualities) · 8 voice leading (C Am
  F G, ii-V-I, the cycle-of-4ths drill, tempo ladder) · 9 spread triads ·
  10 upper structures, sus colours, rhythm uses, G Em C D, final test.
  Method sources in the file header (JustinGuitar IM-151 / Grade 4, Ryan
  Naylor "Triads Inside Out", Goldenberg Guitar Chord Theory, Berklee
  Guitar Chords 201, Open Sauce tempo ladder); text our own. Runs in the
  Teacher's LessonPlayer (arp / play with the mic / quiz / checklist +
  metronome); progress in the teacher state per lesson id. Shapes are
  COMPUTED (`teacher/triadShapes.js`: `tri(root, quality, set, order,
  near)`, `leadPath()` = least-movement inversions) and merged into ARPS.
  UI `components/TriadsCourse/` (Start/Continue row, unit rows with status
  tag, method line) -> App `triadStage` (neck only inside a unit). Text
  `i18n/tips/triads.js`. Pure check: every shape = exactly its chord's
  tones ascending, every step id / skill / quiz valid, fret triples in the
  text match the shapes. Fake-mic (KS) play step verified; NOT on a real
  guitar. The CAGED course's 3 inversion lessons stay as they were.
  v1.0.134 review (user: "check the lessons against more certified
  teachers' material — precise and easy"): cross-checked with Premier
  Guitar's "Why triads are essential" (root on 3/2/1 per inversion, one
  5-fret box), Applied Guitar Theory's spread triads (raise the 2nd note
  an octave: R5 3 / 3 R5 / 5 3R), Ted Greene's inversion rows. Fixed wrong
  voice-movement claims (unit 3 C->F / C->G, unit 8 F->G, unit 10 ->D,
  final test C has only C in common with F), the 4th-up/down wording
  (unit 5), B° resolution text, ska vs reggae skank, string-1 orientation,
  clearer quiz explanation; a Hebrew bidi isolate with an unbalanced "(".
  v1.0.135 (user: "build" after the Beato / Tim Pierce review — their
  courses are paid + copyrighted, so IDEAS only, content ours): an ETUDE
  play step closing units 2-10 (`ETUDES` in triadShapes.js = shapes with a
  picking `seq`, each copy keeps its own chord), EAR quizzes with `listen`
  (QuizStep plays the ids strummed: units 1, 6, 8), checklist `groove`
  (MetroBox Click | Drums switch; App teacherMetro.start(bpm, {groove})
  sets the drum style + source 'drum', stop() returns it to 'standard';
  units 3 + 8 rock, 10 reggae), a song homework item per unit.

## Country style (v1.0.125, 2026-11-07)

- 'country' is a style everywhere a style is picked (onboarding, the
  teacher's "about you", the goal planner; COACH_STYLE / STYLE_GENRE in
  engine.js + challenges.js -> lick genre 'country'; STYLE_SONG country =
  G C G D). Lick genre `country` = COUNTRY_LICKS in library.js (5, ours:
  bass walk-up G->C, G major pentatonic open, the bluegrass G run with the
  ♭3->3 hammer, bend B->C♯ over A, ♭3->3 sixteenth run in A at fret 5;
  pitches checked). Drum style `country` (two-beat boom-chick). Minutes
  lists gained 25. The intake's "songs you'd like to learn" field is only
  STORED (nothing reads it yet) — its hint now says so.

## Arpeggio licks + Arpeggio Builder (built 2026-10-31)

- From the user's reel (tab screenshots): Dm C Bb A as one 6-note triad
  "roll" per chord on the top 3 strings — high E 5th, pull-off to the 3rd,
  B root, G 5th, B root, E 3rd (5-3-1-5-1-3) — at frets 17/15/13/12 (the
  Andalusian cadence i–♭VII–♭VI–V). Minor = 4-fret pull, major = 3.
- Pure `music/lickTrainer/arpeggioBuilder.js`: `triadOf()` (7ths -> triad,
  sus = sus note as "3rd", dim/m7b5 = b3+b5, aug), `parseProgression()`,
  shapes `roll3` (the reel's), `roll3up` (G 5, B R, E 3, hammer 5, pull 3, B
  R), `sweep5` (A-root 5-string sweep A R, D 3, G 5, B R, E 3-h5-p3, back
  down; sixteenths, 3 beats/chord); `placeShapes()` puts each chord's shape
  in the octave closest to the previous one (first near startFret: high 17 /
  mid 12 / low 7), frets 1..21, span <= 5, fingers = one per fret from the
  lowest (pinky capped); rhythm triplet (2 beats/chord) / sextuplet (1);
  repeat 1-2; ends on the last chord's root (B string, vib). Verified: the
  reel's exact frets; every preset x shape x position = chord tones only.
- Library genre `arpeggio` ("Arpeggios"), 7 built-in licks (ARPEGGIO_LICKS in
  library.js, built by the same builder): the reel's lick (triplets), the
  same in sextuplets x2, Am G F E, C G Am F (beginner), rising Am Dm E Am,
  neoclassical A harmonic minor sequence, 5-string sweeps Am G F E.
- Arpeggio Builder (LickTrainer.jsx `ArpBuilder`, shown when Genre =
  Arpeggios): Progression select (presets + "Recent in Compose" from
  localStorage `recent-progressions`) + chords text, Shape / Rhythm / Each
  chord / Start selects, Build -> `trainer.buildArpeggio(params)` (hook):
  one saved lick per profile `dudestar-p-arp-builder` {params, lick}, id
  `arp-mine:<params>` (history per variant), selected at once. Text `arp.*`
  in `i18n/tips/arp.js`.
- Fake-mic Wait-mode run followed the first 10 notes of the reel's lick
  (incl. the pull-offs); NOT verified on a real guitar.

## Tapping (built 2026-10-26)

- User's choice: a Teacher lesson + practice, ONE-finger tapping, classic rock
  + melodic styles. Method from Premier Guitar (Cram Session), fretjam,
  GuitarLessons.com and the Rockschool Grade 4 syllabus; text is our own.
- Lesson `g4-tapping` (new LEVEL 4 'Grade 3–4', "Lead techniques") in
  `teacher/curriculum/guitar.js`: explain -> setup checklist (mute, which
  finger) -> tap-pull (play) -> the triplet (play) -> the FORMULA (tap the
  chord tone the left hand can't reach: e.g. Am = tap 12 E, pull to 5 A,
  hammer 8 C) -> quiz -> Am-F-C-G tapped arpeggios (arp + play) -> melody
  over a pedal (arp + play) -> pentatonic run -> practice checklist; skills
  tap-basic / tap-triplet / tap-formula (quiz) / tap-chords / tap-melody /
  tap-solo + 4 homework items.
- ARPS (`teacher/arpeggios.js`) entries can carry `notes [string, fret,
  finger|'T']`, `seq` (play order with repeats -> `playOrder`), `scale`
  (interval label per note), `gap` (Hear speed, `arpGap`). arpNotes ->
  `finger`, `tapped`. LessonPlayer: labelMode 'finger', NoteStrip `fingers`
  + `.is-tap` (dashed), hint `teacher.tap.legend`.
- Lick Trainer: technique `'tap'` (legato in analysis / lickPlayer /
  lickTrainerAudio, accented attack, "T" above the note in TabTimeline;
  fingering.js treats a tapped note like an open string; withDerived sets
  finger 'T'); `n(..., {f})` = explicit finger. Genre `tapping`, 5 licks
  (TAPPING_LICKS in library.js). lickTrainerAudio now also applies the
  per-note sample tuning (`sampleFix`, SOUNDFONT_TUNING).
- Verified: fake-mic tap-pull step followed all 8 notes; theory test of every
  shape's pitches. NOT verified on a real guitar.

## Bass Practice (built 2026-10-26)

- Bass card shortcut + nav section `bassPractice` (bass only; label `nav.practice`,
  TrainingIcon; featureCapabilities `bassPractice: ['bass']`), separate from the
  guitar/piano `practice` section so no guitar Practice state is touched.
  User's request: the guitar practice logic/display adapted to bass, every
  exercise checked against bass theory and standard bass teaching.
- Content (pure) `music/bass/bassPractice.js`: 4 categories x levels 1-3, 27
  exercises. Technique (fixed notes): i-m open-string alternation, chromatic
  1-2-3-4 at the 5th fret (OFPF starts at the 5th position — wide frets),
  Simandl 1-2-4 in 1st position, octave shape, string crossing / raking,
  permutation 1-3-2-4, shifting climb. Scales (keyed, root on E or A string,
  movable one-octave boxes, standard fingerings: major/majPent/mixolydian root
  finger 2, minor/minPent/blues root finger 1). Arpeggios: R-5-8, major, minor,
  dom7, maj7, m7. Grooves (chord per 4/4 bar, roots on E/A near the key's
  position): roots I-V-vi-IV, rock eighths, root-5th two-feel (5th BELOW on the
  next lower string; above when the root is on E), 1-5-8-5, octaves (disco),
  12-bar boogie 1-3-5-6 / b7-6-5-3, walking ii-V-I-VI and walking 12-bar (1, 3, 5,
  approach = one fret under the NEXT root on its string). Text {en, he} inline,
  Hebrew Latin tokens LRI/PDI. Theory test: `scripts/bass-practice-test.mjs`
  (every exercise x 12 keys x root strings: intervals = degree labels, chord
  tones, approach = half step below, frets 0-17, box span <= 3, bar = 4 beats).
- Engine `hooks/useBassPractice.js` (instance in App, so the Stage bass neck
  shows `scaleNotes` = shape / the groove's current bar, `isCurrent`, hit/miss
  via `quizFeedbackCell`, `noteSound: 'bass'`): modes play (4-beat count-in on
  the SHARED metronome — drums work too; judged per note: right pitch (or its
  octave) within -180 ms .. +150-350 ms of its time, 70 ms detector lag
  subtracted; misses on timeout), wait (advances on the right note), listen
  (playBassNote per step). `useBassOnsets` = usePitchDetection(BASS_PITCH_RANGE)
  -> onsets: new stable pitch, or the level jumping back up (re-plucked same
  note). Loop. Logs perfLog tool 'bass', item `<id>@<key>:<rootString>`;
  `bestFor()`. Leaving the section stops it (App effect).
- UI `components/BassPractice/` (BassPracticeView + css, reuses the Scale
  Practice field chrome): category pills (practice-tabs, like the guitar),
  opens empty (Choose…), Exercise (optgroups by level) / Key / Root on / Mode /
  Show selects, BpmField, Loop + Start, description card (how / why), chord
  bars, note strip, status, result card (accuracy, timing early/late/on,
  steadiness, best). Prefs `dudestar-p-bass-practice`. Text `bp.*` in
  `i18n/tips/basspractice.js`.
- Fretboard drill/scale dots now play through `playStringNote` (bass sound when
  `noteSound === 'bass'`; guitar unchanged).
- Verified: fake mic (Karplus-Strong bass WAV): wait mode 15/15 G major notes;
  play mode roots groove 16/16 incl. repeated notes, wrong notes rejected
  (1/16). NOT verified on a real bass yet.

## Future Piano Teacher card (picture saved, card NOT built)

- `art-src/piano-teacher.png` (1521x1034, white background, NOT in public/ so
  it isn't shipped): the user's picture (2026-10-26, pianist teacher at a grand
  + student at a keyboard + glowing lesson screen) with the screen's music
  repainted by `scripts/piano-teacher-screen-fix2.py <src> [out]` (the AI
  tool kept drawing wrong notes/keys): grand staff 4/4, no key signature,
  C Am F G as whole notes (RH C4-E4-G4 / C4-E4-A4 / C4-F4-A4 / B3-D4-G4,
  LH C3 A2 F2 G2), keyboards F..E with C-E-G and A-C-E lit. For the card:
  key it (`scripts/home-art-color-to-alpha.py`) to a new webp in public/home.
- Future Bass Teacher card: `art-src/bass-teacher.png` (1521x1034 PNG, the
  user's picture, 2026-10-26: smiling bassist in a DUDESTAR shirt + lesson
  screen; real 4-string bass). The GROOVE panel was repainted by
  `scripts/bass-teacher-screen-fix.py <src> [out]` (the AI kept drawing guitar
  boxes / a piano keyboard there): 3 named bass diagrams, 4 strings x 5 frets,
  root-5th-octave shapes G (E3 A5 D5), C (A3 D5 G5), F (E1 A3 D3), drawn only
  on screen pixels so the player / neck stay in front. The user decided on
  the character himself (keep it).

## Competitor-gap features (Gibson / Yousician / MusicMentor / Rocksmith+ review, 2026-10-10)

- Per-profile storage: any key starting `dudestar-p-` (or `dudestar-coach`)
  is automatically per profile.
- **Lick Trainer modes** (`music/lickTrainer/practiceModes.js`, useLickTrainer,
  LickTrainer.jsx; also GuitarPro -> Practice): Mode select Normal / Wait
  (note by note, waits for the right pitch; logs tool 'lick' with
  `metrics.mode:'wait'` and NO score — consumers must skip it) / Build
  (growing chunks); Auto tempo (>=85 up a step, <70 down, steps from the
  existing 50-120 % list) + target + Loop (count-in, next take 3 s after
  results, stops at target held); tempo remembered per lick / `<solo>#<sec>`
  (`dudestar-p-lick-tempo`); solos: section mastery strip (85+ at 100 % =
  mastered) + "practise weakest"; after a take: Mine / Compare / Save (WAV).
- **GuitarPro loop trainer** (GpSongPlayer): Speed-up (step / every N passes
  / up to), live `playbackSpeed` (no MIDI rebuild); Count-in is OUR own one-
  bar click then `play()` — alphaTab's own count-in stalled the player after
  a few loop passes. Song-view tempo per file `dudestar-p-gp-tempo`, loop
  settings `dudestar-p-gp-loop`.
- **GuitarPro Chords view** (Song | Practice | Chords): `music/chordChart.js`
  (file chord symbols first, else derived from all pitched non-drum/vocal
  tracks per eighth, weighted), ChordChartView over the same player/clock,
  Simple names, shape diagrams (ChordShapeDiagram), Mic play-along
  (`useChordPlayAlong`, logs tool 'chordChanges' item `gp:<soloId>`).
  Shapes are standard-tuning even for detuned files (open issue).
- **Rewards** (Coach page: Plan | Rewards): XP (quality-weighted, 60/day cap
  on runs, practice-day + streak bonuses), levels 100+40(n-1), 25
  achievements, 3 daily challenges (1 swap/day) + a weekly challenge
  (Sun-Sat) — `coach/{achievements,challenges,useAchievements,useChallenges}.js`,
  `components/Achievements/` (RewardsView, RewardToast mounted in AppShell).
  Keys `dudestar-coach-challenges`, `dudestar-coach-rewards`.
- **Tools card**: Amp (`components/AmpView`, `audio/amp/*`: own low-latency
  AudioContext created in the tap, gate+comp worklet, drive, amp voicings,
  generated cabinet IR, chorus/delay/reverb, limiter; output muted until
  wired headphones are confirmed once; presets device-level) and Record
  (`components/RecorderView`, `audio/recorder*.js`: WAV takes in IndexedDB
  tagged with the profile id, dry or through the amp, count-in click).
  Recorder face = a vintage reel-to-reel deck (user's request, 2026-10-15),
  always `dir="ltr"`, same in light/dark: walnut cheeks, brushed face,
  `TapeTransport.jsx` (SVG: 2 NAB metal reels, pack radius area-proportional
  to the share played / elapsed of a 15-min reel; reels turned by rAF at
  constant tape speed = K/pack radius with motor inertia, NOT a CSS
  animation), `VuMeter.jsx` (real VU ballistics, 0 VU = -20 dBFS RMS; the
  Playback meter is fed from the take's stored `peaks`, no audio routing),
  mechanical counter (`.rec-time`), REC/PLAY lamps, piano keys Rewind/Play/
  Forward/Stop/Record (tap = ±5 s, hold = wind ~15x), Sound = 2-position knob
  (AmpKnobArt). Hebrew labels: `.is-he` drops letter-spacing, `dir="auto"`.
  iPhone playback = loudspeaker: the mic (rig) is closed as soon as a take
  is saved / a count-in is cancelled and before any playback, and
  `navigator.audioSession.type` is set to 'playback' (back to 'auto' on
  Record) — with capture open iOS routes everything to the earpiece.
  BUT a 'playback' session makes the iOS mic deliver SILENCE: it outlived the
  Recorder and the tuner heard nothing (2026-10-16). `audio/micSession.js`
  `installMicSessionGuard()` (main.jsx) patches getUserMedia once: an audio
  request first switches a 'playback' session back to 'auto'. The Recorder
  also resets to 'auto' when it unmounts.
  Seeks WIND the tape (user's request): `reel` ref + rAF loop in RecorderView
  — a jump > ~0.4 s of tape (waveform seek, Rewind/Forward tap, a new take)
  is eased to over ~0.6 s with the reels in ff/rew and the counter rolling;
  normal play/recording steps are followed exactly. Audio seeks at once.
  **Recorder studio (built 2026-10-15)** — the deck is the transport of a
  small multitrack studio. Pure model `audio/studio/project.js` (project =
  up to 4 tracks; REGIONS {takeId,start,offset,length,gain,fadeIn,fadeOut}
  reference never-changed takes; LANES {takeId,base,from,to} = every pass;
  place/split/trim/move ("moved wins")/compLane/addRecording/removeTake,
  undo history = project snapshots). Engine `audio/studio/studioEngine.js`:
  ONE live AudioContext plays + records; transport = SEGMENTS {from,to,when}
  (loop = a segment per pass), regions as buffer sources per segment, drums
  (`drumTrack.js` drumHits() = pure function of timeline time, same grooves
  as the drum machine; `playDrumHit(..., out)` now takes an output node) and
  click by look-ahead; capture is time-stamped (recorder.js startFrame) and
  `capturePasses()` maps it onto the timeline minus latency. Latency: per
  take from the count-in clicks the mic hears (`latencyFromCountIn`, the
  default Click is Count-in), else the Calibrate value (device key
  `dudestar-rec-latency`), else the browser estimate. The input stream stays
  open between takes except on iOS (closed for the loudspeaker). Punch runs
  0.3 s past the out point (latency shift). `renderMix()` = OfflineAudioContext
  mixdown (export/bounce, 48 kHz stereo WAV via encodeWavBuffer); MP3 =
  `audio/studio/mp3.js`, lamejs (@breezystack/lamejs, LGPL) lazy-loaded as
  its own chunk. Projects in IndexedDB store 'projects' (recorder DB v2),
  last open per profile `dudestar-p-rec-project`. UI: Deck.jsx, Timeline.jsx
  (sticky headers, regions drag/trim, touch = select first then drag, ruler
  tap = playhead / drag = range, lanes under a track for comping, data-start
  etc. on regions for tests), StudioControls.jsx (song bar, region tools,
  Loop & punch, Drums, Import & export, Timing), Library.jsx (takes; Add =
  join at the end of the armed track), useStudio.js (state + actions).
  Tests: `scripts/studio-test.mjs` (pure) + scratchpad studio1/studio2.cjs
  (fake mic = the context's own output delayed 50 ms).
  Studio LOOK (user's request: like studio hardware, in the deck's spirit;
  physical = same in light/dark): Studio.css — every panel is a rack unit
  (`.rk-unit` + `.rk-black` / `.rk-silver` / `.rk-drum` / `.rk-wood`; ears with
  screws via ::before/::after, `RackHead` = status LED + engraved name + ⓘ +
  model plate MT-4 / AL-2 / DR-7 / AD-24 / SY-1). The multitrack unit wraps
  song bar + timeline (a dark screen in `.mt-bezel`, amber ruler, channel
  strips with a white "scribble strip" name, lit R/M/S keys, fader) + EDIT
  keys. Buttons = hardware keys (orange cap = primary, red = danger),
  `.st-toggle` = latching key with an LED strip, selects = green LCD, range
  readouts = red LED, range inputs = faders. Library = walnut cabinet, each
  take a cardboard tape box with a typed label.
  **EQ-10** (user's request 2026-10-18; redesigned the same day after the
  classic studio 1/1-octave graphic EQs, 15% lower): `EqPanel.jsx`, a
  full-width rk-silver unit under the other panels — Channel + Preset selects
  (`EQ_PRESETS` in eq.js: flat/rock/pop/metal/blues/jazz/classical/hiphop/
  electronic/acoustic/vocal/bass/treble/lowcut, moderate starting points;
  `presetOf()` shows "Custom" otherwise), a red LED readout (band + gain while
  setting, else EQ ON / BYPASS), EQ (bypass) + Flat keys; a black window with
  an LED ladder per band (10 LEDs: 7 green / 2 amber / 1 red, -54..-9 dB in
  5 dB steps, 24 dB/s release, 1 s peak hold; fed by `engine.outputBands()` =
  octave-band power from an 8192-pt analyser AFTER the mix-bus EQ, so it
  always shows the OUTPUT; driven in the DOM by rAF while playing), dB scales
  both sides, custom vertical faders with black caps (drag / tap, arrows ±0.5,
  PageUp/Down ±3, double-tap = 0), 31 Hz..16 kHz, ±12 dB, peaking Q 1.41.
  Channel: Whole mix (`project.masterEq`) or a track (`track.eq`);
  `{on, gains[10]}`, missing = flat. Edits go through `studio.updateMix` (no
  undo, heard at once via `engine.setMix`). `audio/studio/eq.js`
  `createEqChain()`: live = track gain -> track EQ -> master -> master EQ ->
  analysers/out; `renderMix` the same (master EQ only for a whole-mix export,
  not single-track stems). `eqResponseDb()` (RBJ, = BiquadFilterNode) is kept
  for tests. Measured: bypass export = identical, all bands -12 = tone -13 dB.
  The deck's Stop also stops a take playing in the Library (it dispatches
  `dudestar-rec-preview-stop`; before, only Play/Record did).
  Amp face: real combo look (AmpView: Knob, ToggleSwitch, ChannelSwitch =
  a rotary selector drawn with the same amp knob art (3 detents CLEAN -60° /
  CRUNCH 0° / LEAD +60°, under INPUT where the dropdown was — knob row unchanged (user); tap = next, tap a printed
  name, drag, arrows) — user's choice after a dropdown and a bat toggle), stompbox pedals all one size (comp silver, drive yellow, chorus purple, delay blue, reverb red). A small
  wireless receiver (InputReceiver: graphite body turned left, LED lit when
  the amp is on) sits in the INPUT jack — the user rejected a drawn cable.
- **Audio interface input** (v1.0.126, user asked where to set it):
  Settings -> "Microphone / audio interface" (was "Microphone &
  calibration") — a how-to line on top (computer: pick the device + Direct;
  iPhone/iPad: plug in first, iOS uses it as the default input), device,
  Input Type, and NEW "Interface input" (only in Direct): All inputs /
  Input 1 / Input 2 (`channel` in audioInputSettingsStore). `audio/
  inputChannel.js`: `channelConstraint()` (asks channelCount ideal 2 when a
  channel is chosen) + `inputNode(ctx, stream)` (splitter -> mono gain of
  that channel; a 1-channel stream is used as is). Used by EVERY listener:
  usePitchDetection, useMicChordDetector, useMinuteChanges,
  lickTrainerAudio, noiseCalibration, amp liveInput (amp / recorder /
  studio / songwriter), useVocalMic. Fake stereo mic (tone on the right):
  Input 1 = 0, Input 2 = full, All = half level. NOT verified with a real
  interface / on iOS (iOS Safari may give mono -> All is used).
  v1.0.127 (user's iPad + Positive Grid Riff: "Test opens the MIC" and no
  live meter): the settings test now uses TUNER_PITCH_RANGE (own context +
  worklet tap — the default shared-context analyser gave iOS zeros, so the
  meter never moved); meter in dB (-60..0) + a "-N dB" readout; a line
  explaining iOS asks for MICROPHONE permission for ANY audio input (an
  interface too); `audioInput.noSignal` when the input is digital silence;
  button "Test"/"בדיקה". NOT verified on the iPad.
- **Room calibration** (Settings -> Audio Input, `noiseCalibration.js`,
  RoomCalibration.jsx): 3 s room + 4 s playing -> gate + noise spectrum per
  mic/mode; detectors use max(own gate, calibrated) and subtract the noise
  spectrum ONLY when a calibration exists (no calibration = old behaviour).
  Measured: chords recognised in noise rose from 0-28 % to 61-76 %.
- **Tuner tunings** (`music/tunings.js`, select per instrument, device key
  'tuner-tuning'); standard stays chromatic; the tuner display is always LTR.
- **Left-handed** (Settings "Playing hand", device key 'left-handed',
  `Fretboard/handedness.js`): every neck mirrored, text un-mirrored, taps and
  scroll arrows mirrored. PNG export of the neck stays right-handed (open).
- **Touch = action only** (user's request 2026-10-17): index.css, under
  `@media (hover: none) and (pointer: coarse)`, turns off text selection,
  the iOS long-press callout (Copy/Paste/Look Up) and the tap highlight on
  html/body; input/textarea/contenteditable keep normal selection. Mouse
  devices unchanged.
- **Install as an app** (user's request 2026-10-21): the app is a PWA
  (vite-plugin-pwa manifest: id/scope/start_url '/', standalone, icons).
  `https://the-dude.vercel.app/install` (vercel.json rewrite -> index.html;
  main.jsx `Root` renders `install/InstallPage.jsx` instead of App) shows only
  what the device needs (`install/pwaInstall.js detectPlatform()`): Install
  button = the browser's own dialog (`beforeinstallprompt`, caught at start-up
  by `captureInstallPrompt()` in main.jsx) on Android / Chrome / Edge;
  iPhone/iPad Safari = 4 steps ••• -> Share -> Add to Home Screen -> Add (iOS 26 Safari keeps Share in the ••• menu; other iOS browsers 3 steps) (Apple allows nothing
  programmatic; the address is reset to '/' on iOS so the icon opens the
  app); in-app browsers (WhatsApp/Instagram/…) = "open in Safari/Chrome";
  Mac Safari = File -> Add to Dock; Firefox desktop = use Chrome/Edge;
  already installed (display-mode standalone) = "Open". Copy / Share link,
  QR code on computers (`qrcode-generator`, MIT). Settings (Tools card) has
  an "Install the app" row (Install when the prompt exists + Guide ->
  /install), hidden inside the installed app. Text `i18n/tips/install.js`.
  TWO SCREENS (user's request 2026-10-21): intro = icon, title, ONE Install
  button + the card wheel (+ QR on computers); Install = the browser's own
  dialog when `beforeinstallprompt` exists (Android/Chrome/Edge: done in one
  tap, nothing else shown), otherwise the steps screen (Back returns); in-app
  browsers / Firefox desktop get their warning on the intro instead.
  iPhone/iPad SAFARI steps screen, under the list: `install/IosGuide.jsx` (user's
  request 2026-10-21) — a looping drawn "video" of the 4 taps (page ->
  ••• menu -> share sheet -> Add dialog -> icon on the home screen), the
  finger ring placed by MEASURING the scene's `.is-target` element; the list
  step it shows is highlighted (`is-now`, onStep); mirrored when the PHONE's
  language is RTL (iOS mirrors its buttons). `IosArrow` = a fixed bouncing
  "Tap here •••" arrow at the page's bottom corner (iPad: top, pointing up);
  the ••• in it sits in a white circle like Safari's button (user's call).
  A page can't see taps on Safari's own UI — the guide only shows. The
  ••• position assumes iOS 26's compact bar; NOT verified on a real iPhone.
  Intro screen picture: `.inst-showcase` = `install/ShowcaseReel.jsx` (user's
  choice 2026-10-21, replaced a card wheel): a self-playing reel of 16 REAL
  app screenshots (`public/install/*.webp`, 2x captures, ~405 KB; instruments
  -> learning features -> tools -> studio), each held 1.8 s (`HOLD_MS`),
  entering from a different place each time (10 `ENTRIES` {dx,dy,r,s} as CSS
  vars into `@keyframes reel-in`: fade + grow/slide, then slow drift; the old
  one grows on and fades), caption per language under it, NO progress bar
  (user removed it), tap = next shot, nothing opens. The old `.inst-wheel*`
  CSS is unused. ONE FRAME (user's request 2026-10-21): `.inst-main` is the
  only white card (border/shadow/radius); the inner `.inst-card`s have no
  frame of their own and the reel stage no grey — the pictures are part of
  the page. The shots have TRANSPARENT backgrounds (keyed with scratchpad
  keybg.py: light neutral pixels flood-filled from the border -> black with
  alpha = darkness, so shadows stay and look identical on white); no CSS
  drop-shadow. The page fits one screen (height 100svh, the
  picture takes the height left; desktop = guide | picture | QR in a row;
  scrolls only under 560px tall); EN/HE pill in the guide card's top-RIGHT
  corner in both languages, always EN | HE order (`direction: ltr`; user's rule
  2026-10-22).
  The text link under Install = "Continue in the browser" (`inst.browser`): iOS
  can't open the installed app from a page, only its home-screen icon is full
  screen (user expected "Open DudeStar" to go full screen, 2026-10-21).
  Language = the device language until the visitor picks one (LanguageContext).
- **Home pictures load at once (v1.0.145, user: "after an update the card
  picture takes ~2 s to appear")**: the 6 card pictures (guitar, piano,
  bass, vocal, songwriter, tools — ~750 KB) are PRECACHED by the service
  worker (vite.config.js workbox `globPatterns` lists them; a changed
  picture = new revision), `index.html` preloads them (guitar
  fetchpriority high — before, the <img> only started after the JS
  bundle had run), and vercel.json gives `/home/*` a 7-day cache +
  stale-while-revalidate. Measured (Chromium, 820x1180): after a reload
  every picture comes from the service worker, the active card's image is
  ready ~0.6 s after navigation incl. the app's JS. A NEW picture must be
  added to that globPatterns list.
- Build: main bundle > 4 MiB, so `workbox.maximumFileSizeToCacheInBytes` is
  6 MiB in vite.config.js.

## Cloud sync between devices (built 2026-10-23)

- Supabase project `dudestar` (org dudestar, account dudestar365@gmail.com,
  eu-west-1), URL `https://fcisgnpdpjgayptiurkc.supabase.co`, publishable key
  in `src/cloud/cloudState.js` (public by design). The SECRET key and the DB
  password are the user's only — never ask for them or put them in the repo.
  Schema = `supabase/migrations/001_user_kv.sql` (run once in the SQL Editor
  by the user; the auto-mode classifier refuses running SQL on the prod DB
  from the browser): table `user_kv` (user_id, key, value text, deleted,
  updated_at = server clock via trigger, user_id forced to auth.uid()), RLS
  own-rows-only, anon revoked, `delete_my_account()` rpc. Verified: anon
  read -> 401 permission denied.
- Auth: Google only (Supabase Google provider; Google Cloud project
  `dudestar`, OAuth client "DudeStar web", origin https://the-dude.vercel.app,
  redirect https://fcisgnpdpjgayptiurkc.supabase.co/auth/v1/callback; consent
  screen External; Branding filled (home page, /privacy, authorized domains
  the-dude.vercel.app + the supabase.co project host) and the user reported
  it PUBLISHED on 2026-10-25 — anyone with a Google account can sign in). Supabase Site URL https://the-dude.vercel.app, redirect
  allow-list https://the-dude.vercel.app/**. Email login NOT set up (the
  built-in Supabase mailer only sends to team members) -> see email below.
- A LOCAL PROFILE is linked to an account (one Supabase session per profile:
  `storageKey` `dudestar-cloud-auth:<profileId>`). Synced = the profile's
  personal keys (profileStorage) + `SYNCED_SETTINGS` (left-handed, sound
  profiles, piano volume, info switch, tuner tuning, piano labels); not
  `dudestar-p-rec-project`; values > 1.9 MB stay local. Recordings /
  IndexedDB are NOT synced (Drive backup = planned step 2).
- profileStorage's patched setItem/removeItem report REAL changes (value
  differs) to `onStorageChange`; `writeSilently` writes without reporting.
  cloudState (light, at boot via profile/install.js): dirty set per profile,
  `applyPendingAtBoot()` writes rows pulled last session BEFORE the app
  reads storage. cloudSync.js (lazy chunk ~57 KB gz, loaded only when linked
  or returning from Google): push dirty 4 s after a change and on hide; pull
  (`updated_at > lastPull`) on start / visible / every 5 min; a dirty key is
  never overwritten. Pull right after opening (no tap yet, < 6 s) = apply +
  reload; later = pending for the next start (writing under running hooks
  would be overwritten by their in-memory state). Conflicts = last change
  per key wins (two devices editing the same list offline: one wins).
- PROFILE NAME syncs (v1.0.123; user: renamed on the iPad, computer +
  phone still said "Me"): the registry is per device, so the name is ALSO
  the personal key `dudestar-p-profile-name` (renameProfile writes it).
  Boot (`reconcileProfileName()`, install.js after applyPendingAtBoot +
  trackChanges): key present -> the registry takes it; no key but a name
  here -> written once (= uploaded). A pulled name row is applied at once
  (cloudSync, not left pending) — it's only displayed.
- PROFILE AVATAR (v1.0.169, user's OK after "would Apple do it?" — yes:
  Contacts / Apple ID offer monogram, emoji, Memoji, photo; monogram stays
  the default): `profile.avatar = {hue?, emoji?}` in the registry AND the
  personal key `dudestar-p-profile-avatar` (JSON; `setProfileAvatar()`,
  reconciled at boot like the name; cloudSync applies a pulled avatar row
  at once with the name row). `Avatar` (ProfileChip.jsx) = the emoji on a
  soft tint of the hue (`.is-emoji`, darker tint in dark mode) or the
  initial on the gradient. The profile popover's "Edit" (`profile.edit`)
  = name field + `AvatarEditor`: preview, 10 colour swatches
  (`AVATAR_HUES`), letter / 12 suggested emoji (`AVATAR_EMOJI`, music
  first) / "Other" field taking the first emoji typed (`firstEmoji`,
  Intl.Segmenter + Extended_Pictographic). A never-named profile can now
  save its look (Save disabled only for a new profile). No photo (yet).
  Playwright 390 HE + 1180 EN: colour + 🎸, typed 🦄abc -> 🦄, saved,
  survives reload, back to the letter.
  v1.0.170 (user: a clear background with a thin ring, more emoji, why
  not the keyboard's emoji pane): `avatar.bg: 'clear'` (`.is-clear`: no
  fill, 1.5 px ring + letter in the hue; dark variant), Filled | Clear
  segmented in the editor; `EMOJI_SETS` = 9 groups x 20 (music, faces,
  people, animals, nature, food, sport, objects, symbols) — a group
  <select> beside the letter button + a scrolling grid (opens on the
  chosen emoji's group); the "Other" field stays (any emoji) with a hint:
  a web page CANNOT open the iOS emoji pane itself — the field opens the
  keyboard, the 🙂 / 🌐 key shows every emoji. cleanAvatar keeps `bg`.
  v1.0.171 (user: why a Filled | Clear button — just add a checkerboard
  circle): the segmented control is gone; the LAST colour swatch is a
  checkerboard (`.profile-swatch.is-clear`) = `bg: 'clear'`; a colour
  swatch sets `bg: 'fill'`. Clear = no fill, 1 px neutral ring
  (`--separator`), letter in `--text`.
  v1.0.172: the keyboard field's placeholder "Other" -> "More…" / "עוד…"
  (user). Asked again to open the emoji keyboard directly: impossible on
  iOS (no inputmode / API for it); iOS reopens the keyboard last used.
  v1.0.173: the field is 76 px wide (its label), not the full row.
- First link: account empty -> upload this device; this device has no real
  data ([] / {} defaults don't count) -> take the account's; both -> the
  CloudPrompt modal "Account | Device" (winner where both have a key;
  one-sided keys kept), then reload. UI: Settings -> "Your account"
  (`CloudField`: Sign in / synced as / Sync / Disconnect / Delete account).
  Text `i18n/tips/cloud.js`. Test with a fake Supabase via Playwright
  page.route (scratchpad cloud1.cjs: 3 devices, push / pull / pending /
  choose) — the container can't reach supabase.co.
- iPhone installed app (standalone) + Google redirect is NOT verified yet.
  First real try (2026-10-24) failed because the consent screen was in
  Testing with 0 test users; the failure toast now shows Google/Supabase's
  `error_description` (CloudPrompt, `errorDetail`).
- **Privacy policy** `/privacy` (vercel.json rewrite, main.jsx `Root` ->
  `privacy/PrivacyPage.jsx`, HE + EN, user-approved 2026-10-25: NO operator
  name — "for any matter contact dudestar365@gmail.com"; minors may open an
  account with a parent's consent). Linked from CloudField. Needed for the
  Google consent screen's Branding (home page, privacy link, authorized
  domain the-dude.vercel.app) before Publish app. Keep it true to what the
  app does (no analytics, mic audio never leaves the device, recordings
  not synced, Supabase in Ireland) — update it with any change to that.
- Email + password (`cloud/EmailAuth.jsx`, cloudSync `email*`). ONE form
  (user's call 2026-10-25, "one place to type the email"): email + password +
  Continue = `emailContinue()` — sign in; on invalid credentials try signUp:
  existing account (empty identities) -> "wrong email or password", new ->
  code screen ("opened a new account"); < 8 chars -> wrong-or-too-short hint.
  Google is a quiet "or continue with [G Google]" row under the form. Forgot; emails carry a 6-digit CODE ({{ .Token }}, verifyOtp
  'signup' / 'recovery'), not a link (a link opened in another browser can't
  finish PKCE). Sender = Gmail SMTP (smtp.gmail.com:465, dudestar365@gmail.com,
  Google app password typed by the user only; SMTP saved 2026-10-24).
  Templates "Confirm sign up" + "Reset password" = HE+EN body with
  {{ .Token }} (no link). Email provider: confirm email ON, min password 8,
  OTP length 6 (was 8), expiry 3600 s. Gmail SMTP limit ~500 mails/day. Real delivery NOT yet
  confirmed by a test sign-up (the user does it — no account creation by Claude).

## Compose insights: tension + roadmap (v1.0.174, 2026-11-14)

- User (iPhone): the big "now playing" chord hid the Tension bar, and he
  didn't understand Position Roadmap / Tension. `.compose-now-playing`
  (absolutely laid over the meter) is gone: TensionMeter takes `chord`
  and shows it in its own header row (chord · label); the label was an
  unreadable coloured block (one selector set `background` on label AND
  fill) — now text only, darker tones + dark-mode values. Each panel has a
  visible one-line explanation (`tensionMeter.desc`, `positionRoadmap.desc`;
  the ⓘ tips are off by default). Roadmap arrows point left in RTL
  (`:dir(rtl)` mirror). Playwright 390 HE + 1180 EN, F Fsus2 Dm.
- ROADMAP PICKER (v1.0.175, user's idea + Claude's version: a choice, not
  a blind cycle). Compose (guitar): each roadmap chord is a button
  (`.position-roadmap-step.is-button`) opening `.position-roadmap-shapes`
  under the chain: that chord's other shapes within 4 frets of its
  neighbours (pure `nearbyShapes()` + `shapeDifficulty()` in
  positionRoadmap.js — from the SAME computeChordPositions list the neck
  uses; max 4, by fret), drawn with the Chord Library's `ChordBox`
  (`boxProps()`), tags Now / Easiest (only when clearly easier), "only
  shape nearby" text otherwise, Done. Choosing = App `pickRoadmapShape`:
  ONLY that chord's positionIndexByChord changes (selectPosition would
  re-arrange the others) + it becomes the active chord. Studies' roadmap
  stays read-only (no props). The engine has NO open Fsus2 (xx3011) —
  its Fsus2 shapes are 3 / 8 / 15 / 20. Playwright 390 HE (F Fsus2 Dm) +
  1180 EN (C G Am F: G Open -> Position 3 changes the chain), no errors.

## Stage — band charts + setlists (v1.0.176, 2026-11-14)

- User: "upload the PDF charts of all the songs I play with the band,
  full screen, auto-scroll, move from chart to chart; can it find the
  chords and change the key?". Section `stage` ("Stage" / "במה", LineIcon
  `stage` = a music stand) in the Play group: NAV_GROUPS play members
  ['guitarpro', 'stage'] (segmented control), every instrument, no neck.
  Charts = the SAME store as GuitarPro's PDFs (sheetStore, IndexedDB, this
  device; `renameSheet` added); per-chart prefs in `dudestar-p-sheet-prefs`
  gain `dur` (song length, s) and `tr` (semitones).
- `components/Stage/StageView.jsx` (+ Stage.css, `.stg-*`, reuses the
  Practice `.ph-*` inset groups / BackButton / MoreMenu): home = title +
  Add capsule (multiple PDFs) · Setlists rows + "New setlist" · All
  charts rows (tap = play from there through all charts; ••• Rename /
  Delete two-tap) · empty state. Setlist screen = back, name (••• Rename /
  Delete), ONE primary Start, numbered rows (tap = start there; ••• Up /
  Down / Remove), "Add songs" sheet (`.stg-sheet`, tap rows to append, Add
  capsule inside). Setlists = personal key `dudestar-p-setlists`
  (`music/sheets/setlists.js` useSetlists, same-tab event) — they sync;
  charts don't (a missing one = "Not on this device").
- `components/Stage/Performer.jsx` (portal `.stage-perf`, black): pages at
  the screen's width (PdfSheetView's now-exported `Page` + `useWakeLock`;
  Page takes `children` = an overlay), top glass bar (close, name, "n of
  N · Next: …", Night = invert filter, device key `dudestar-stage-night`),
  bottom glass bar in two groups (‹ Scroll › | Song length −/+ 10 s ·
  Key −/+). Auto-scroll = the WHOLE chart in the song's length (default
  3:30); at the end it stops and › pulses. Pedals / arrows / PageDown turn
  ~a screen; past the end = next song, before the top = previous; Space =
  scroll; a sideways swipe = next / previous; a tap = hide / show the
  controls; a finger / wheel pauses. Every song starts at the top.
- KEY CHANGE (pure `music/sheets/chartChords.js`): pdf.js text items ->
  lines by baseline -> a CHORD LINE when >= 75 % of its words are chord
  symbols (`isChord` regex incl. 7 / maj7 / sus / add / b5 / (#9) / slash;
  bars, x2, N.C. neutral) -> each chord's box (canvas measureText scaled
  to the run's own width); `transposeChord` (root + slash bass),
  `flatsFor` / `keyOf` from the first chord (flat keys F Bb Eb Ab Db Gb /
  Dm Gm Cm Fm Bbm Ebm). Overlay `.stage-chord`: white box over the old
  chord, the new one bold blue. No text chords (a scan) = Key shows "—"
  and is disabled (OCR not built). Checked: G song +3 -> Bb F Gm Eb …
  Am7b5 Dsus4 D7; Am song +2 -> Bm G D A … F#7; the scan -> "—". Playwright
  390 HE + 1180 EN: upload 3, setlist, reorder, start, transpose, length
  40 s -> scroll speed matched, pedal past the end -> next song, Escape,
  prefs saved; no errors. NOT verified on the iPad / with a real pedal.
- Not built yet: OCR for scanned charts, syncing the PDFs themselves
  between devices, pinch zoom on a phone.

## Stage in the cloud + bands (v1.0.177, 2026-11-14)

- User: "why not Google Drive — I want the charts on all my devices, and
  a GROUP (band) where everything is shared with its members". Claude's
  call (user's OK): the existing Supabase (accounts Google + email, RLS),
  not Drive. Schema `supabase/migrations/002_stage_charts.sql` — the USER
  runs it once in the SQL Editor: tables bands (owner, unique 8-char
  invite_code) / band_members (display_name) / charts (id = the client's
  sheet id, band_id null = personal, path, dur, tr, deleted tombstone) /
  band_setlists (items jsonb); helpers is_band_member / band_owner /
  can_use_chart_path (security definer); RPCs create_band, join_band
  (P0002 'no band' on a wrong code), leave_band (not the owner),
  new_invite_code (owner); RLS on all four + Storage bucket `charts`
  (private, 20 MB, PDF only; paths u/<uid>/<id>.pdf | b/<band>/<id>.pdf).
  Checked on a local Postgres 16 with stub auth / storage schemas: an
  outsider sees / adds nothing, upsert over another's id is refused, a
  member sees only band rows + files, the owner can't leave, removing a
  member cuts their access, deleting a band cascades, anon = denied;
  the script re-runs cleanly.
- Client `music/sheets/chartCloud.js` (store via useSyncExternalStore,
  cached per user in device key `dudestar-stage-cloud:<uid>`):
  `syncWith(sb, uid, local)` = upload local charts not yet in the cloud
  (storage + row, mark `cloud`/`path` on the IndexedDB record) -> read
  every visible chart row: download new ones, apply name / band /
  dur / tr, drop tombstoned ones and cloud charts no longer visible ->
  bands + members + band setlists. Triggers: Stage opens, sign-in
  finishes, app back to the front, after adds / band actions; GuitarPro
  PDF adds sync too and its Delete = `removeChart` (tombstone + file).
  dur / tr changes (Performer) are pushed to the row (sheetStore
  `onSheetPrefs`, 1.5 s debounce) — a band shares song length + key.
  Actions: addCharts(files, band), removeChart, renameChart, shareChart
  (a COPY for the band), createBand / joinBand / leaveBand / deleteBand
  (removes the band's files first) / renameBand / removeMember /
  newInviteCode, bandSetlistApi(band) (optimistic, same shape as
  useSetlists). Signed out = everything local as before.
  `cloudSync.cloudClient()` exported. sheetStore: records carry `band`,
  `cloud`, `path`; `patchSheet`, `putSheet`, `onSheetsChange`.
- UI (StageView): signed out = a tinted row "sign in…" + Account
  (App `onAccount` -> the Settings sheet); signed in = Library <select>
  (My charts / each band, device key `dudestar-stage-scope`) + ••• (Invite
  members — code + Share / Change; Members (n) — remove for the owner;
  Rename band; New band; Join a band; Leave / Delete band two-tap) +
  status line (Synced just now / Syncing… / offline / error). Setlists
  and charts follow the chosen library; a personal chart's ••• has
  "Share with <band>"; rows say "not uploaded yet" until synced. Sheets
  `Sheet` / `AskSheet` (`.stg-sheet`), toast `.stg-toast`. Privacy policy
  updated (charts in the cloud, band visibility; 14 Nov 2026).
- Checked with Playwright + a fake Supabase (route handler: PostgREST,
  RPC, Storage): device A1 uploads 2 -> A2 (same user) gets both; A1
  creates a band, shares a chart, makes a setlist; B with a wrong code =
  the message, with the code = the band's chart + setlist; B's key +2
  reaches the server row; A1 removes B -> B back to My charts with 0
  rows; A1 deletes a chart -> gone on A2; no page errors; signed-out run
  of the v1.0.176 test unchanged. NOT verified against the real Supabase
  (the SQL isn't run yet) or on the iPad.

- v1.0.178 (user: "let me fold the controls bubble down; a PDF's font
  is sometimes small — enlarge it without the whole app growing"):
  Performer bar gets a fold key (chevron, first in the bar) -> `.is-mini`
  = Scroll / Pause + expand, bottom corner (device key
  `dudestar-stage-bar-mini`). ZOOM of the pages only: 100–300 %, per
  chart in sheet prefs `zoom` (not pushed to the cloud row): Size −/+
  stepper (±25 %), + / − keys, Ctrl+wheel (trackpad pinch), and a
  two-finger PINCH on the sheet — `.stage-perf-scroll` has
  `touch-action: pan-x pan-y` + gesturestart/change prevented (no iOS
  page zoom), the pages wrapper `.stage-perf-pages` is CSS-scaled while
  the fingers move, redrawn at the new width on lift, the spot under the
  fingers kept (anchorRef). Zoomed wider than the screen = sideways pan,
  swipe-to-change-song off. Shared PdfSheetView `Page` caps the canvas at
  16 M px (iOS draws nothing above that). Playwright 390 HE (CDP pinch
  155 -> 300 %) + 1180 EN, fold persists. NOT verified on the iPad.

- v1.0.179 (user: "I can only add files from Apple's places — what are my
  options?" -> "build all your suggestions"). (1) Files app: Drive /
  Dropbox / OneDrive show there once their apps are on (Files -> Browse
  -> ••• -> Edit) — told the user, no code. (2) PHOTOS: Add accepts
  `image/*` (iOS offers Photo Library / Take Photo / Choose File);
  `music/sheets/imageToPdf.js` turns images into ONE PDF (JPEG pages,
  DCTDecode, max 2400 px, hand-written PDF) so store / viewer / cloud
  bucket (PDF only) / band sharing stay as they are; several photos -> a
  sheet "Together | Separate"; camera names (image / IMG_1234 / photo)
  -> "Chart <d.m>". No key change on photos (no text). (3) LINK: quiet
  "Link" capsule (icon only <= 430 px) -> AskSheet (`errorOf`,
  `inputMode` props added) -> `api/chart-link.js` (Vercel function):
  Dropbox -> raw=1, Drive file -> drive.usercontent download, Google Doc
  -> export PDF, OneDrive -> download=1; https only, private / local IPs
  refused (DNS checked, every redirect hop re-checked), 20 MB, only PDF /
  JPEG / PNG / WebP / HEIC by magic bytes, name in `x-chart-name`; an
  image link is converted like a photo. Errors `stage.link.err.*`.
  Privacy page updated. Playwright (route-mocked API) 390 HE + 1180 EN:
  1 photo, 2 photos together = 2 pages, bad link message, PDF + photo
  links; api unit: URL rewrites + blocked http / localhost / 127 / 169.254.
  Google Drive Picker NOT built (needs the user's Google Cloud API key +
  scope; the Files app already reaches Drive). Real links NOT tested here
  (container can't reach Dropbox / Drive).

- v1.0.180 (user: "while auto-scroll runs and I drag the chart up / down,
  go on scrolling from where I stopped"): a finger / wheel no longer
  STOPS the auto-scroll — Performer `holdRef {touching, until}`: held
  while a finger is down, while the page still glides (scroll events
  during a hold extend it 160 ms; 220 ms after the lift; wheel 350 ms),
  then the rAF goes on from the new scrollTop. Pinch no longer pauses
  either. A tap still shows / hides the controls; Pause stops. Playwright
  390 (CDP touch drag): 31 -> dragged 317, held 1.2 s at 317, released ->
  344, still playing.

- v1.0.181 (user, iPad screenshot: "centre the song name vertically in
  the row"): Stage rows (setlists, a setlist's songs, all charts) =
  iOS "right detail" — the title alone, vertically centred; the detail
  (song count / length / "not uploaded yet" / missing) is `.stg-detail`
  at the row's end. `.stg .ph-row .ph-title` text-align match-parent:
  a Latin name in a Hebrew list stays on the list's side (it sat on the
  far side because of dir="auto"). Playwright 1180 HE + 390 EN.

- v1.0.182 (user: with the bubble folded, a few taps on the chart made
  it disappear): a tap on the sheet toggles `.is-bare`, which hid the
  folded bubble too. `.stage-perf.is-bare .stage-perf-bar.is-mini` stays
  visible — only the top bar comes and goes. Playwright 390: 3 taps ->
  bubble opacity 1 throughout, top bar 0 / 1 / 0.

- v1.0.183 (user asked whether the scroll speed is kept per chart — yes:
  `dur` per chart, synced + band-shared; zoom per chart, this device —
  and approved a reading guide). Performer `paintGuide()` (DOM, on every
  scroll / resize): p = scrollTop / span; the "now" point = the chart at
  p x its height -> `.stage-guide-line` (2 px accent line + glow; orange
  in Night) glides from the chart's top to ~60 % of the screen over the
  song, `.stage-guide-dim` greys what is above it (played); both only
  while scrolling (fade). `.stage-progress` = 3 px bar at the top
  (scaleX(p), grows from the reading side; root got dir). `.stage-left`
  "−m:ss" (dur x (1 − p)) next to Scroll in the full bar and in the
  folded bubble, once the song has started. Even pace assumed — repeats /
  uneven density make it lead or lag (told the user). Playwright 390 HE
  (30 s) + 1180 EN (folded): line / bar move, time counts down, guide
  hides on Pause.

- v1.0.184 (user's idea, Claude agreed): the progress hairline along the
  top is GONE — the song's title bubble itself fills (Apple Music's mini
  player idea): `.stage-top-fill` = an absolutely placed white 16 % layer
  inside `.stage-perf-top` (overflow hidden + isolation; its other
  children raised), scaleX(p) from the reading side (`[dir=rtl]` ->
  origin right), shown once the song has started. When the top bar is
  hidden (a tap), the time left stays in the bottom bubble. Playwright
  390 HE + 1180 EN: fill grows, no errors.

- v1.0.185 (user: the fill is grey — use Apple's music-player colour; make
  the bubbles real glass like Apple): `.stage-top-fill` = Apple Music's
  red (#FA2D48) at 62→48 %; Performer bars (top + bottom) = Liquid Glass:
  `--glass-bg` rgba(30,30,34,.58) under a white top-down sheen, blur 28 +
  saturate 1.9 + brightness 1.04, 0.5 px light rim, inset specular top
  edge + soft inner glow, text-shadow for legibility over white pages.
  Playwright 390 HE + 1180 EN screenshots checked.

- v1.0.186 (user): the title-bubble fill runs LEFT TO RIGHT in every
  language (the RTL origin rule is gone — time runs left to right); the
  Scroll key (full bar + folded bubble) shows a filled PLAY triangle
  (never mirrored) instead of the down arrow; pause stays two bars.

- v1.0.187 (user: "whatever fits the system's design language best"):
  the title-bubble fill = a white wash (34→24 %) like Apple's Now
  Playing scrubber, not Apple Music red (it clashed with the orange
  Pause key and added a hue the app doesn't use).

- v1.0.188 (user: "on stage we may change the order — a button that
  shows the whole setlist at once; and at a song's end a button straight
  to the next one"): Performer top bar gets a list key (`.stage-list-key`,
  only with > 1 song) -> `.stage-list` glass sheet under the top bar: the
  set numbered, the current row tinted with a play glyph, played rows
  dimmer, each song's length; tap = jump there (`goTo`), tap outside /
  Escape closes (that tap doesn't also hide the controls —
  `swallowTapRef`). End of a song (`atEnd`, not playing, > 1 song) =
  `.stage-endcard` floating just above the control bubble (its height
  measured into `--stage-bar-h`): "Up next · <name>" + Next, or on the
  last song "End of the setlist" + Finish (closes). Text `stage.setlist /
  upNext / nextBtn / setDone / setDoneText / finish`. Playwright 390 HE +
  1180 EN: list, jump, outside-close, end card -> next, last -> finish.

- v1.0.189 (user: "build 1–4" of the live-show list):
  (1) REORDER on stage: the setlist sheet's rows have a grip (≡,
  `.stage-list-grip`, touch-action none) — drag = live reorder
  (`startDrag`, a row's height per step), the current song keeps playing
  (`applyOrder` keeps idx on its id); on release `onReorder(ids)` ->
  StageView `reorderSet` (setlist items, missing songs kept at the end;
  personal or band setlist). "All charts" = this session only.
  (2) SONG DETAILS: tap the title -> `.stage-details` sheet: tempo (−/+ +
  type-in, 30–300, none = "—"), stage notes (≤ 300), "Click on the
  count-in" switch (device key `dudestar-stage-click`, default off).
  Saved per chart in sheet prefs `bpm` / `note`; shown as the
  `.stage-note` glass pill under the top bar (♩ BPM with a beat dot ·
  notes, 2 lines; the chart gets room via `.has-note`). Cloud: columns
  `bpm` / `notes` on `charts` (002 now has them; NEW
  `supabase/migrations/003_stage_notes.sql` adds them to an existing
  table — the USER runs it); chartCloud falls back without them on
  42703 / PGRST204 (`hasMeta`), so sync never breaks before 003.
  (3) COUNT-IN: with a tempo, Scroll from the top (or the end) shows a
  big glass 1 2 3 4 (`.stage-count`, one bar, `COUNT_BEATS`) then the
  scroll starts; Scroll during it cancels; optional click (1.8 / 2.4 kHz
  on the shared context). Space = the same key.
  (4) PLAY TOGETHER (band setlists / charts, signed in): the setlist
  sheet has "Play together · <band>" select Off / I lead / Follow the
  leader. `music/sheets/bandLink.js` = a Supabase Realtime BROADCAST
  channel `stage-<bandId>` + presence {name, role} (nothing stored, no
  SQL needed). Leader sends {order, song, playing, p} on every change,
  every 2 s while scrolling, `count {bpm, at}` (Date.now clock) and
  answers a follower's hello; followers apply the order, jump to the song
  (place + playing applied once its chart is drawn — `pendingPRef`),
  start the same count-in, follow play / pause and correct the scroll
  when off by > 1.5 % (not while a finger holds it); no grips while
  following. Top-bar subtitle: "Leading · n" / "Following <name>" /
  "Waiting for the leader" (no profile name = "the leader").
  Privacy page updated. Playwright: 390 HE + 1180 EN (drag, details,
  count 1-2-3-4 -> scroll), two devices through a fake Realtime relay
  (routeWebSocket, vsn 2.0.0 binary broadcast): presence count, jump,
  reorder (+ server setlist), count-in, play / pause followed. NOT
  verified against the real Supabase Realtime or on iPads.

- v1.0.190 (user: "make the scroll bubble glass; glass is the guiding
  line for the whole system" -> rule 11 rewritten): one Liquid Glass
  material for every Performer bubble (`--sg-*` on `.stage-perf`): a
  clear pane (tint 34 % + backdrop blur 14 / saturate 1.9 / brightness
  .66 — the chart shows through, white text stays readable), a sheen
  gradient, a lit rim + specular top edge (inset shadows, no border),
  soft depth; sheets (list / details) the stronger variant. Keys inside =
  glass capsules (white sheen + inset highlight), primary = tinted blue
  glass, Pause = tinted orange glass, steppers / sync box / current row
  likewise. Playwright screenshots 390 HE, 1180 EN, folded bubble.

- v1.0.191 (user: "fit the rule to Apple's design principles"): rule 11
  rewritten from the HIG Materials page + WWDC25 "Meet Liquid Glass" (two
  layers, sparingly, no glass on glass, tint only the primary, regular vs
  clear, legibility, reduced transparency). The Performer follows it: the
  keys / steppers / sync box / current row inside its bubbles are flat
  fills again (v1.0.190 made them glass capsules = glass on glass), the
  primary stays the only tint (blue, orange while running); under
  prefers-reduced-transparency / prefers-contrast the bubbles go solid.

- v1.0.192 (user: "go over the whole system with this principle and
  apply it where needed"): ONE file `src/styles/liquid-glass.css`
  (imported in main.jsx right after index.css; selectors prefixed `html`
  so they beat every component rule whatever the load order — roll back =
  delete the import). (1) Regular-variant glass (`--glass-sheet`, blur
  30 / saturate 180, rim + specular edge, `--glass-sheet-shadow`) for the
  solid floating panes: tuner / metronome / display / saved / settings /
  exercise drawers, songwriter sheet + chord picker, the profile popover
  (home too), the cloud alert, the reward toast and the ⓘ bubble (was a
  navy box; now glass + label colour). (2) Toasts (songwriter, stage,
  cloud) = dark HUD glass `--glass-hud`. (3) Songwriter top bar and the
  teacher's live banner = glass (banner no longer accent-tinted). (4) No
  glass on glass: the desktop top bar's round buttons / avatar and the
  metronome / drums / tuner pills inside the Tools popover = flat fills.
  (5) Phone / tablet top strip = a SCROLL EDGE (fade + light blur, masked)
  instead of a glass bar — the round buttons over it are the glass.
  (6) prefers-reduced-transparency / prefers-contrast: all glass tokens
  near-opaque. Content (cards, lists, devices, necks) untouched; the
  ear-training panel is inline content, left solid. Playwright 390 HE,
  1180 EN, 1180 HE dark: compose, Tools popover, tuner drawer — no errors.

- v1.0.193 (user: "build all your recommendations and make them part of
  the fixed design principles" -> rule 11 gained STRUCTURE / INTERACTIVE /
  web limits): liquid-glass.css — (1) phone / tablet tab bar = a floating
  glass capsule (inset 12 px, max 560, above the home indicator, chosen
  tab on a soft pill, items centred); (2) desktop / iPad landscape top
  row = no bar (transparent, no hairline): the five tabs in ONE glass
  capsule (plain inside, chosen = 15 % accent pill + accent text — was
  gray chips + a solid accent chip), Home / Tools / avatar = floating
  glass circles again (the v1.0.192 flat-fill rule for them is gone);
  (3) interactive glass: round glass buttons, avatar, Done, the stage
  handle, Performer round / primary keys and the songwriter perform keys
  scale 1.07 + brighten while pressed; tabs press to 0.96;
  prefers-reduced-motion = none. Content reserve unchanged (the capsule
  ends lower than the old bar's top). Playwright 390 HE, 820 HE dark,
  1180 EN, 1366 HE dark (Chords): no errors.

- v1.0.194 (user, iPhone at 295 %: "save where I placed the chart
  sideways — coming back it sat at the left"): Performer keeps each
  chart's SIDEWAYS place in sheet prefs `panX` (0..1 of the room to
  pan, this device, not pushed to the cloud): saved 300 ms after a
  sideways scroll (not during a zoom anchor), restored when the chart is
  drawn (the song still starts at the top). Playwright 390 HE + 1180 EN:
  zoom 250 %, pan to 70 %, close, reopen -> 0.70.

- CONTROLS LIBRARY, step 1 (v1.0.195, 2026-11-15; user: "are all our
  controls exactly as Apple designs them?" -> no: ~94 button classes, ~44
  toggles, 139 bare <select>s; canvas approved, "build"; rollback branch
  `ui-pre-controls-v1.0.194`). `components/ui/`: Select.jsx = a DROP-IN
  for <select> (same native element, same props / children / onChange)
  drawn as the HIG pop-up button (grey capsule, accent text, ⌃⌄ at the
  end side); touch = the system's own menu (iOS UIMenu), mouse /
  trackpad = a Liquid Glass listbox portaled to <body> (✓ beside the
  chosen row, accent highlight, optgroup headers, arrows / Home / End /
  type-ahead / Enter / Escape / Tab, flips above when there's no room,
  closes on outside tap / scroll / resize); choosing sets the native
  value + fires a real change event. controls.jsx = Button / Switch /
  ControlRow / Segmented / Stepper; ui.css (+ `.ui-slider`, and the
  BpmField outside device faces now looks like the stepper: − value + in
  one grey box). ALL 115 selects in 53 files moved to <Select> (device
  faces kept: RecorderView, Metronome / DrumMachine, GuitarTuner, AmpView,
  Performer). `min-width: 74px` keeps "A#" readable in narrow ones.
  Playwright 1180 EN light / dark + 390 HE dark: every guitar practice
  tool, chord library advanced, settings pages, songwriter, bass practice
  — menu opens / chooses (value reaches React), no page errors. Next:
  screens' own buttons / toggles -> Button / Switch, one screen at a time.

- CONTROLS LIBRARY, step 2 = PRACTICE (v1.0.196): Chord changes'
  Content / Chords / Length chip rows -> pop-up buttons, Loop -> Switch,
  Start -> Button filled (Stop = gray danger); Scales' scale chips -> a
  pop-up (the whole setup now fits one row on a computer); One-minute
  changes: Swap = gray Button + ⇄ glyph, Start / Stop = Button; Bends:
  Start = the one filled primary (was a 2nd "primary" next to Play again),
  Play again = gray + PlayGlyph (the ▶ in the string is stripped), Skip
  plain, Again tinted; Ear training: Exit / Skip = plain (Exit was a red
  outlined pill — it isn't destructive), Next filled, Finish gray, Play
  again tinted, answer choices = the gray md button look (CSS); Rhythm /
  Finger drills "Pick another" = plain (was red outlined). The inline
  exercise list (ExerciseDrawer inside the page) lost the glass sheet
  v1.0.192 had given every `.exercise-drawer` (content, not floating).
  New glyphs `PlayGlyph`, `SwapGlyph` in ui/controls.jsx. PlayAlong's
  round Demo / record keys stay (transport). Playwright 1180 EN + 390 HE:
  all 9 tools, ear session, rhythm with an exercise, bends — no errors.

- CONTROLS LIBRARY, step 3 = TEACHER (v1.0.197): the teacher's own
  button system (`.tc-btn` / `.tc-chip`, Teacher.css) now draws like the
  library: gray buttons = accent label + press feedback, primary = filled
  with no outline, `.tc-wide` = a 50 px capsule (min 260) centred instead
  of a full-width bar (full width only <= 600 px, as iOS), multi-select
  chips = gray fill, chosen = 14 % accent tint (were white outlined).
  Playwright 1180 EN + 390 HE: intake, home, lesson steps — no errors.

- CONTROLS LIBRARY, step 4 = SONGWRITER (v1.0.198): the selected line's
  tools (`.sw-tool`) = gray buttons with accent labels (were white
  outlined pills), Record = red tint (Voice Memos), a tool that's on =
  accent tint (was a filled blue pill); "+ Add section" + Dictate = gray
  buttons (the dashed outline is gone; the section-kind select inside is
  the button's own label, no capsule of its own). Rest of the card was
  already HIG (v1.0.121). Playwright 390 HE + 1180 EN — no errors.

- CONTROLS LIBRARY, fix (v1.0.199): the pop-up's chevron used
  `:dir(rtl)`, which the build (lightningcss) rewrites into a `:lang(he…)`
  list — every select inside the Hebrew page put its chevron on the left
  even when the select itself is dir="ltr" (GuitarPro's tempo "70%" and
  the song name sat under it on the iPhone). Select.jsx now reads the
  computed direction after layout and sets `data-rtl`; the Switch knob
  moves by `margin-inline-start` (logical, no :dir). Never write
  `:dir()` in our CSS — use an attribute or logical properties. GuitarPro
  / Stage checked: already on the library's look (tinted Add, gray
  transport keys, segmented modes). Playwright 390 HE + 1180 EN.

- CONTROLS LIBRARY, step 5 = THE REST (v1.0.200): went over Chords,
  Compose / Improvise, Theory, Singing, Settings, bass and piano
  practice. Chords / Singing / Settings / piano were already on the look.
  Retrofits in ui.css (one list): Compose's white shadowed pills —
  chord ‹ Prev / Next ›, position ‹ Back / Next ›, Display, Save, Smart —
  and the bass Loop latch = gray buttons with accent labels (on = accent
  tint); the position chips 1–9 = gray like the chord chips (the chosen
  keeps its colour); Training lost its outline. Theory -> Chord Structure
  showed its title twice (page h1 + the view's own h2): the h2 is hidden
  inside the Theory section and the description sits right under the
  title. Playwright 1180 EN + 390 HE — no errors.

- STAGE + BAND, the Apple way (v1.0.201, 2026-11-15; user: "the band
  feature is buried" -> canvas https://claude.ai/artifact/WLKwrYsDPmMKvisEMaR3Jg
  approved, "build"). SOLO FIRST: no band = one quiet row "Playing with a
  band?" (`.stg-hint`, × hides it, device key `dudestar-stage-band-hint`;
  then ••• "Band…") -> `BandJoinSheet`: three perks, then Create a band |
  I have a code (Segmented) + one field + one filled CTA; signed out = "sign
  in first" + Account. With bands: Segmented "Mine | <band>" (<= 2 bands,
  else the pop-up Select) replaces the Library select + its ••• of seven
  actions; the band = ONE row (`.stg-band-row`: member faces · "N members"
  · Invite ›) -> `BandManageSheet` (code card + Share, members with "here
  now" / Remove, Rename / New code / Another band, Leave / Delete two-tap).
  Sync status = a footnote. PLAY TOGETHER = SharePlay: a band setlist shows
  Start (filled) + "Start with the band" (opens the Performer as leader,
  `initialRole`) + who of the band is here (faces); members on the band's
  home / setlist see a green banner "<name> is on stage now · <set> · song
  i of n · Join" (`LiveBanner`, from presence meta {set, song, i, n} that
  the leader tracks) -> opens that setlist as follower. Performer: the
  Off / I lead / Follow select is gone — the list sheet has a status line +
  ONE key (Lead / Join / Stop / Solo) and a glass pill over the chart while
  following ("Following X · Solo") or when someone leads ("X leads ·
  Join"). The Performer now keeps the band channel open while a band chart
  is open (also solo). bandLink.js: ONE channel per band per device,
  ref-counted (supabase-js returns the existing channel for a topic),
  closed 1.5 s after the last user, a re-open waits for the removal;
  `setRole(role, extra)`. Invite text points to Stage › Band › I have a
  code. Playwright (fake Supabase + Realtime relay, A 1180 EN / B 390 HE):
  create, invite code, join, Start with the band -> B's banner -> Join ->
  follows song jumps, Solo / Join again, Stop leading, manage sheet; no
  errors. NOT verified with the real Supabase Realtime or on devices.

- v1.0.202 (user: "the guitar / piano cards say Play, only bass says
  GuitarPro — shouldn't it be the same?"): the bass card's shortcuts are
  the bar's group names too — Practice · Play (group, guitarpro) · Create
  (group, compose) — and the piano's first one is Learn (group learn,
  section studies, teacher icon) instead of "Theory". Every instrument card
  now speaks the same five group names as the in-app bar.

- v1.0.203 (user, iPhone screenshot of a Theory lesson: "wherever there's
  text like this, justify it — make it a general rule" -> rule 16):
  `html { text-align: justify }` (inherited; centred blocks keep theirs),
  `p` hyphens auto + `text-wrap: pretty`; containers that forced `start`
  on running text now justify (first-visit note, settings root, profile
  popover, lick card, idea text / freewrite pieces, Stage hint + note,
  install steps / warning). Stage's subtitle moved under the title row
  (justified in the narrow column beside Add it opened wide gaps).
  Checked: 31 phone screens (no paragraph inside a centred block got
  justified), Theory lesson / Practice / Stage screenshots, no errors.

- v1.0.204 (user: "in Settings, when a sound is changed, play a few notes
  of it so I can judge it"): `audio/soundPreview.js` `previewSound(kind,
  key)` — guitar = C E G C E picked + the open C strummed, piano = C E G C
  up + the chord in two hands, bass = root–5th–octave–6th–5th–root; sets
  the store first, waits up to 4 s for the new samples (no synth stand-in
  when they're coming), a new choice cuts the phrase playing. Wired to the
  three sound pop-ups in SettingsBody (sound page + Tools-card Settings).
  Playwright 1180 EN + 390 HE: each choice schedules its phrase (10 / 8 / 6
  notes, right pitches); samples blocked here, so heard as the fallback
  synth — real sound NOT judged.

- v1.0.205: re-push only — Vercel never built v1.0.204's commit (no
  deployment / status on it; check with `gh api repos/hayhaber/TheDude/
  commits/<sha>/status`). If a push doesn't reach the user, look there.

## ⓘ explanations (info switch)

- `InfoTooltip` (components/InfoTooltip) renders only while the global "i"
  switch is on — default OFF now (`infoTooltipsEnabled` in localStorage).
  Texts live in `src/i18n/tips/{compose,practice,tools}.js` (EN+HE, keys
  `tip.<area>.<name>`), looked up by `t()` after STRINGS. ~60 places across
  the app, ONLY where a term/setting/score isn't self-evident (user's rule:
  not next to obvious buttons). New non-obvious features get one too.
  `.info-tooltip > .info-tooltip-trigger` resets container button styles;
  the bubble is `dir="auto"`, max 280px — keep texts short (≤ ~230 chars).

## Backlog (user-approved ideas, not built yet)

- (DONE 2026-10-10, see above) **Personal profiles for the WHOLE app**:
  several people on one device, each with a named profile. Everything
  personal is in localStorage per device today (vocal range/level/progress,
  Lick Trainer progress, settings…), so a shared device mixes them. Plan
  discussed: local profiles first (a "who's practising?" select + New;
  every personal localStorage key namespaced by profile id; the current
  data migrates into the first profile; a new profile takes the vocal range
  test first), optional cloud sync later on top of the existing
  `api/library.js` mechanism (needs a real login — not the shared
  DUDESTAR_KEY).

- STAGE CARD + THE SINGER'S WORDS + HOME CARDS (v1.0.206, 2026-11-15;
  user: "a Play & Band card, hide cards in Settings?" -> Claude: yes, only
  if Stage LEAVES the instruments' Play (no two doors); + "a singer needs
  the words, not a PDF" -> "build"). (1) Home card `stage` ("Stage" /
  "במה", art = drawn `public/home/stage.svg`, precached + preloaded; 4
  shortcuts in one row on phones: Setlists · Songs · Band · Rehearse (=
  the Recorder tool screen, back = the Stage card); primary = Continue
  the last setlist (device key `dudestar-stage-last` {id, scope, name},
  `lastSetlist()` in StageView) else Start). App `stageScreen` {start,
  n} -> `components/Stage/StageScreen.jsx` (round Home + StageView
  `start` = sets | songs (scrolls to `#stg-songs`) | band (manage sheet /
  join sheet) | continue); onOpen with section 'stage' (old remembered
  place) opens it too. NAV_GROUPS play = ['guitarpro'] only (no
  segmented control); GuitarPro still opens PDFs (same sheetStore).
  (2) A song = a chart PDF and/or WORDS: sheet records carry `lyrics`;
  words-only songs (`saveTextSheet`, no blob; listSheets gives `pdf`,
  `lyrics`; GuitarPro lists only `pdf` ones). Pure
  `music/sheets/lyricsText.js`: [Section] / "Chorus:" labels, [Am]word
  chords, {note} stage notes, blank line = new section; tab-site chord
  lines above a LATIN line are merged by column (`mergeChordLines`, a
  chord over a space goes to the next word), above Hebrew kept as a
  chord row; `songToLyrics()` (Songwriter song -> text + first melody
  note), `pdfLines()` (PDF text runs -> lines, Hebrew runs reversed).
  `LyricsSheet.jsx`: Type | My songs (Songwriter, `SONGS_KEY`) | PDF
  (take the text out, to check), name for a new song; Stage header
  "Words" capsule, every song row's ••• Add / Edit words, Performer
  details "Words · Edit". (3) Performer: per DEVICE view (device key
  `dudestar-stage-view` chart | words | wordsChords; Segmented in the
  details sheet when the song has both) — words = `.stage-words` big
  text (size = device key `dudestar-stage-words-zoom` 0.6–2.2, the Size
  stepper / pinch), section labels orange, stage notes yellow, chords
  blue above their word (transposed with the Key stepper), the line at
  the reading guide lit, sung lines dimmed (paintGuide), 20vh end room.
  FIRST NOTE: sheet pref `start` (midi), set in details (Select C2–C6 +
  Hear, "In the moved key: …"), from a written song's melody on import;
  in the words view it replaces Night in the top bar (♪ G♯4, played on
  the piano at the transposed pitch). No roles: the view says who you
  are (user's question, Claude's call). Cloud: migration
  `supabase/migrations/004_stage_lyrics.sql` (lyrics, start_note; path ''
  = words only) — THE USER RUNS IT; until then words-only songs stay on
  the device and words don't travel (`hasSong` fallback, like hasMeta).
  (4) Home cards: personal key `dudestar-p-home-cards` {hidden, order}
  (`HomeMenu/homeCards.js`, `useHomeCards`, never all hidden); home
  "Edit" pill -> sheet (`HomeCardsList reorder`: grip drag + Switch,
  Original order); Settings -> "Home screen" page (switches only).
  HomeMenu's ring takes the visible cards (N dynamic, ringDist(i,pos,N)).
  Playwright 390 HE + 1180 EN (+ dark): card, words song, PDF words,
  My songs import (start note), setlist, chart -> words switch, next song,
  start note + key +2, Continue, Rehearse round trip, edit hide / drag,
  settings page; no page errors. NOT verified on devices / real Supabase.
- v1.0.207 (user: rename "במה" to "להקה"): the card / screen / nav name
  is "Band" / "להקה" (`home.stage.title`, `stage.title`, `nav.stage`;
  code keys stay `stage`); its band shortcut became "Members" / "חברים"
  (`stage.nav.band`) so it doesn't repeat the card's name.
- v1.0.208 (user picked option 5 of 10): the Band card's Rehearse
  shortcut icon = a sound wave (LineIcon `waveform`), was the record dot.
- v1.0.209 (user: "Rehearse is really Record?" -> option 2): the Band
  card's 4th shortcut is named "Record" / "הקלטה" (`stage.nav.rehearse`,
  it opens the Recorder tool screen) and its icon is the record dot again. A real
  rehearsal screen was offered, not chosen.
- v1.0.210 (user: "Setlists and Songs are the same thing" -> option 1):
  the Band screen's home is two lists like Apple Music's library — a
  Segmented "Setlists | Songs" (`.stg-tabs`, StageView `tab`, start
  'songs' opens Songs, everything else Setlists); each tab shows only its
  list (section titles screen-reader only); the empty state shows on
  Songs, and on Setlists only while there are no songs and no setlists.
- v1.0.211 (user, iPad: the blue "‹ Stage" link + "Not on this device"
  twice; "many songs need a search"): (1) BACK = a round glass chevron
  circle beside the Home button everywhere (`components/HomeButton/
  BackButton.jsx`; PracticeHome re-exports it). Screens keep rendering
  `<BackButton label onClick>` where they like; it is PORTALED into a slot
  (`BackSlotContext`): AppShell `.app-back-slot.is-strip` (phone / tablet,
  fixed, Home + 45 px) + `.is-bar` (desktop top bar's brand area), the
  Band screen's top, ToolScreen's `.tool-screen-lead` (Settings pages;
  as a sheet = top-start beside Done). No slot = inline circle. The
  label is read out only (aria "Back · <screen>"), chevron mirrored in
  Hebrew. `stage.back` = Band / להקה. (2) SEARCH in Band -> Songs and the
  "Add songs" sheet once the list is longer than 8 (`SEARCH_FROM`):
  iOS grey search field, matches the name or the words (niqqud / chords
  / notes ignored); a words hit shows "in the words · <line>" under the
  title; none = "No song matches …". (3) A setlist song missing here
  shows "Not on this device" once (title), no detail. Playwright 390 HE +
  1180 EN: search name / Hebrew / words / none / clear, pick sheet,
  back beside Home on Band, Practice tool, Settings pages; no errors.
- BAND SUGGESTIONS (v1.0.212, 2026-11-15; user: "for a cover band's
  repertoire — each member suggests a few songs, one shared list everyone
  sees, from it we pick the songs to rehearse"). Band screen, band scope
  only: a 3rd tab "Suggestions" / "הצעות" (StageView `tab` 'ideas';
  hidden in "Mine", falls back to Setlists). `Stage/SuggestionsView.jsx`:
  one-line how-to; groups "For rehearsal · n" (+ quiet "Setlist" capsule =
  a band setlist "Rehearsal <d.m>" of the picks, opened at once) ·
  "Suggestions · n" (most likes first, "+ Suggest a song" row) · a folded
  "Not chosen · n". Row = like key (thumb + count, accent when mine, 44 pt)
  · title / artist · "by <name>" / the note (2 lines) · ••• Listen (link) /
  Rehearse it / Back to suggestions / Not for us / Edit / Delete (two-tap,
  only who suggested it or the band owner). Tap = the sheet (song, artist,
  https link, why; shows who suggested + who liked). "Rehearse it" =
  status picked + a words-only BAND SONG "Title – Artist" (addTextSong,
  reused if its song still exists) so it can go into setlists; toast says
  to add words / a chart. Cloud (chartCloud.js): state `suggestions`,
  `suggestReady`; synced in syncWith step 4 (missing table 42P01 /
  PGRST205 -> not ready = "one-time server setup" card, nothing breaks);
  addSuggestion / updateSuggestion / removeSuggestion (soft) /
  voteSuggestion (rpc) — optimistic, a refused write re-syncs. NEW
  `supabase/migrations/005_band_suggestions.sql` — THE USER RUNS IT:
  table band_suggestions (status open | picked | dropped, votes uuid[],
  by_user / by_name, deleted), trigger keeps band / author / created fixed,
  votes change ONLY via `toggle_suggestion_vote(s)` (security definer,
  members only, atomic), delete only by the author or the owner, RLS
  members read / add / change, anon none. Checked on a local Postgres 16
  (stub auth / storage): member adds, direct vote edit ignored, rpc
  toggles, outsider sees / adds / votes nothing, bad link refused, member
  can't delete another's, owner can, undelete ignored, anon denied, script
  re-runs. Playwright (fake Supabase, A 1180 EN owner + B 390 HE member):
  suggest (bad link blocked), like / unlike, B's suggestion seen by A,
  pick -> band song + toast, drop -> folded, rehearsal setlist, no table ->
  setup card; no page errors. Not checked against the real Supabase.
- v1.0.213 (user's iPad: "Create a band" said only "That didn't work"):
  band sheets now say WHY (`bandErr()` in StageView): wrong code ·
  offline / fetch failed · server not set up (PGRST202 / PGRST205 / 42883
  / 42P01 / "could not find the function" -> `stage.cloud.setup` = run
  002_stage_charts.sql) · sign-in expired (`stage.cloud.signAgain`) ·
  else "That didn't work (<server message>)". Most likely cause on his
  iPad: migration 002 never run (create_band missing). Fake-Supabase
  check: PGRST202 -> the setup text; after "running" it -> band created.
- v1.0.214 (user: Timed ear training on guitar / piano started its clock
  the moment Timed was chosen / the session opened, and there was no way
  to start over): useEarTraining `start()` no longer starts the countdown
  — it waits at 60 ("· starts on the first play", `earTraining.timerWaits`)
  and starts on the first Play / answer (`ensureTimerRunning`, the first
  question still doesn't auto-play). New `restart()` (exposed with
  `timerRunning`): fresh score / streak / session best, full waiting clock,
  a new question that waits for Play; a plain "Restart" / "מחדש" next to
  the clock (`.ear-training-timer-row`) once the clock runs or something
  was answered. Singing ear training (rule 10): its Start already plays +
  starts the clock; Timed runs get the same Restart key (= begin()).
  Playwright 390 HE guitar + 1180 EN piano: Timed -> 60 held 2.5 s, Play
  -> 58 after 2.6 s, Restart -> 60 waiting; no errors.
- v1.0.215 (user: the first question's key said "Play again" before
  anything played; "go over the design, fit it to Apple"): ear training
  (guitar / piano) — useEarTraining `heard` (set by every play, false for
  the first question that waits): the key is the screen's one FILLED
  primary "Play" / "השמעה" until heard, then tinted "Play again".
  Inline (Practice): no title of its own (the page h1 says it), no Exit
  (the back circle is the way out — leaving the tool now ENDS the session,
  App practicePlace effect -> `earTraining.exit()`, so a Timed clock never
  runs on and a return starts fresh), the empty header row hidden; the
  scoreboard (six zeros) shows only once there's a score this session or
  all-time; Start / Again = library Buttons (filled + PlayGlyph). Popup
  variant unchanged. Playwright 390 HE guitar + 1180 EN piano: Play ->
  Play again, no board / title before answering, back + return = start
  card, Timed flow as v1.0.214; no errors.
- v1.0.216 (user: "would Apple design the Restart next to the clock like
  this?" -> no): Timed clock moved ABOVE the question (`.ear-training-
  clock`; it sat under Play / Skip, below the fold on phones), shown as
  m:ss in tabular numerals in the LABEL colour with a stopwatch glyph (was
  accent blue "Time: 58" — accent means tappable), red (`--danger`) in the
  last 10 s, `role="timer"`; "starts on the first play" in secondary text
  while waiting; Restart = a gray 44 pt round icon key (new `RestartGlyph`
  = SF arrow.counterclockwise in ui/controls.jsx, aria-label / title
  "Restart") at the row's end instead of a plain text word. Playwright 390
  HE + 1180 EN: 1:00 waiting -> 0:58 after play -> red at 0:50? no (only
  <= 10), restart -> 1:00; no errors.
- v1.0.217 (user: the screen jumped after the first answer): two things
  appeared ABOVE the question on the first answer — the scoreboard (shown
  only once there's a score, v1.0.215) and, inline, the header row with
  Finish (its only button). Both now live at the END of the session
  (scoreboard, then `.ear-training-finish-row` with Finish, inline only;
  the popup keeps Finish in its header). Measured (scratchpad
  earshift.cjs: y of prompt / reveal / instrument / actions / choices
  before vs 250 ms after the first answer, every mode x Standard / Timed,
  390 HE guitar + 1180 EN piano): 0 px everywhere (was +52 px).
- v1.0.218 (user: Ear training's Chord (major / minor) mode still said
  "Play again" on its first question; "apply the update to every
  exercise"): (1) useEarTraining — a mode / difficulty change is a fresh
  start too: its first question waits for Play (suppressAutoplayOnceRef
  set in the open / mode / difficulty effect), so the key reads "Play"
  and the Timed clock starts with that play. (2) Piano exercises
  (`usePianoPractice` + PianoPracticePanel) get the ear-training model:
  `heard` (Play filled -> Play again tinted), the first question of a
  session / exercise waits, Next / Skip play the new one at once
  (`newQuestion(autoplay)`, `playQ`), answered = filled Next (was Skip
  only), no own title / Exit (page h1 + back circle; leaving the tool
  ends the session, App practicePlace effect), the scoreboard at the END
  and only once there's a score / best streak, Start = library Button,
  note-name choices dir="ltr" (F# read #F in Hebrew). (3) Bends: the demo
  key reads "Play" until that bend's demo played, then "Play again".
  (4) Singing ear training's Timed Restart = the same gray round
  RestartGlyph key. Playwright 390 HE + 1180 EN: chord mode Play -> Play
  again; piano Play / Play again / Next, no title / board before an
  answer, prompt moved 0 px, back + return = start card; bend Play ->
  Play again; no errors.
- v1.0.219 (user: the neck's fold handle jumped sideways when touched;
  make it 10 % bigger): the interactive-glass press rule set `transform:
  scale(1.07)`, which replaced the handle's `translateX(-50%)` centring —
  liquid-glass.css now presses with the individual `scale` property (+
  `scale` in the transition; reduced motion `scale: none`), and
  `.app-stage-toggle` centres with `translate: -50% 0` (not transform) so
  it grows about its own centre. Handle 40x16 -> 44x18 (top -9, chevron
  20x10). Measured 390 + 1180: centre 195 / 590 at rest and pressed (was
  a full jump), toggle still folds the neck; no errors.
- v1.0.220 (user: "what does Add in the Chord Library do? I don't get
  it"): the button is "+ Compose" / "+ להלחנה" (guitar + piano
  libraries), and a tap shows `AddedToast` (ChordLibrary/AddedToast.jsx,
  `.cl-added`): a glass HUD under the top controls, "Am7 added to
  Compose" + ONE action Open (`chordlib.goCompose`; `chordlib.open` is
  the "Open position" label) -> App `onOpenCompose` = the Compose
  section; 4 s, a new add replaces it. Playwright 390 HE + 1180 EN: label,
  toast, Open -> Compose holds the chord; no errors.
- v1.0.221 (user's iPhone: dragging down on the Chord Library's key /
  type chips slid the row down inside itself and cut it): `.cl-strip`
  (guitar + piano libraries) and Practice's `.practice-tabs` get
  `overflow-y: hidden` (overflow-x auto made y auto, and the 44 pt hit
  areas stick out of the 40 px chips = a vertical scroller) +
  overscroll-behavior-x contain. Sweep at 390 (simple + advanced): no
  small vertical scrollers left. Any new sideways chip row: set
  overflow-y hidden too.
- v1.0.222 (user: "the tab says Create and you call it Compose"; "in
  Hebrew the chords must read left to right, aligned left, like in
  English — the bubbles are reversed too"): (1) Chord Library button =
  "+ Create" / "+ ליצירה" (the tab's name), toast "Am added to Compose,
  in the Create tab" / "נוסף להלחנה, בלשונית יצירה". (2) A chord
  SEQUENCE is always LTR (time runs left to right, like the neck): the
  Compose field (`ChordInput` dir ltr), the chord chips + Prev / Next row
  (ChordChips), the position row + 1..N chips (PositionControls), the
  piano inversion row, the roadmap chain (its RTL arrow mirror removed),
  Scales' position nav and the piano clef demo's ‹ › row; only the
  middle labels keep the language's dir. Hebrew strings: "← קודם",
  "הבא →", "← חזרה" (arrows now point the way they go). Playwright 390
  HE: chips Am Fm C G at x 16 / 79 / 139 / 189, arrow glyph after "הבא";
  toast text; no errors. New UI with a chord sequence: dir="ltr".
- v1.0.223 (user: "would Apple put an Edit button at the top to edit the
  cards?" -> no; "build"): the home header's Edit pill is GONE. A LONG
  PRESS on a card (500 ms, touch; cancelled by > 6 px movement; the lift
  isn't a tap) or a RIGHT CLICK opens `.home-ctx` — a glass context menu
  at the finger with one row "Edit Cards" / "עריכת הכרטיסים" + grid icon
  (`home.editCards`) -> the same HomeEditSheet; outside tap / Escape
  closes. Settings -> "Home screen" stays as the visible way. Playwright
  390 HE (CDP touch long press on a shortcut: menu, still home, sheet
  opens) + 1180 EN (right click, outside click closes); no errors.
- LEVEL 3 CONTINUED (v1.0.224, 2026-11-20; user: "keep writing lessons,
  I'll review them all together"): four lessons after `g3-small-F`, in
  JustinGuitar's order from the small F to the full barre (RSL Grade 2):
  `g3-sevenths` (A7 / D7 / E7 open, the ♭7 vs Fmaj7's major 7th, A7–D7
  changes 30, the 12-bar blues in 7ths with E7 -> A7 voice leading),
  `g3-power-chords` (E5 open, movable G5, the natural notes on strings 6
  and 5 as arp + play steps — ARPS `notes-6` / `notes-5`, palm muting +
  our riff E5 E5 G5 A5, the blues shuffle root–5th / root–6th on A D E),
  `g3-barre-E` (E fingered 2-3-4, the barre learned at fret 5 first, then
  F at 1, technique checklist, minor = lift the middle finger, Am–F
  changes 20, Am – F – G – Am with one shape = i ♭VI ♭VII i), `g3-barre-A`
  (B at fret 2 with a ring-finger mini barre, named from string 5, Bm,
  D–Bm changes 20, D – A – Bm – G = I V vi IV, quiz: C in both shapes).
  SHAPES may carry `name` (internal keys barA5 / barF1 / barBm2 … ->
  `shapeName()` for the box caption, chart labels, the ✓ message). The
  lesson ChordBox now starts at the lowest fret when the shape goes past
  fret 5 and draws the barre bar (finger 1 on 2+ strings at that fret).
  ChordStep rivals drop open chords with the SAME notes (a barre A = open
  A's notes — it could never pass). `.cl-box { direction: ltr }`: in
  Hebrew the diagram's names read "♯C" and the fret label flipped (all
  ChordBoxes). mastery: intake 'open' also covers the open 7ths
  (`skill.open`), 'barre' covers `skill.barre` chords. TRY_IN rows for
  the four. Checks: pure (every shape's notes = its chord, fingers match
  frets, skills / arps / changes chords valid, path some-player:
  sevenths -> power -> barre E -> barre A -> arpeggios), synthetic chroma:
  every new chord step passes, a missing finger fails, the small F does
  not pass the full F; Playwright walked all four HE 390 + EN 390, no
  errors. NOT verified with a real guitar; the USER reviews them.
- v1.0.225 (user's iPad round): (1) the Tools button's icon = a wrench
  (LineIcon `tools`, Lucide ISC) — the menu holds drums + tuner too, not
  only a metronome. (2) Tool drawers (metronome / drums / tuner): the ×
  sat top-right under the iPad's battery — now an iOS 26 sheet header:
  gray 30 px × (44 pt hit area) on the LEFT, the title centred, the
  drawer padded by the top safe area (`html .metronome-drawer` /
  `.tuner-drawer` rules at the end of MetronomeBar.css). (3) Profile
  popover + Settings account row: "{email} · Synced" (was "Synced ·
  {email}"), the email isolated (LRI/PDI) and the line in the language's
  direction. (4) Chord Library "Pick" is an arpeggio -> "Arpeggio" /
  "ארפג׳יו" (`chordlib.pick`), and now also in the SIMPLE view beside
  Strum / Play (guitar + piano). (5) GuitarPro PDF sheets scroll with the
  Band's Performer: the inline view = a preview with ‹ n/N ›; its Scroll
  key (and Space) opens `<Performer songs=[{id, name}]>` (song length,
  reading guide, zoom, key, count-in); the old per-page speed select and
  its own full screen are gone. Playwright 390 / 820 / 1180 HE + EN: icon,
  × left + title centred on all 3 drawers, arpeggio in simple + advanced,
  GuitarPro PDF -> Performer scrolls, Escape back; no errors.
- DRUM MACHINE, the Apple way (v1.0.226; user: "redesign it as Apple
  would, same functionality"): the 808 face (DR-8 plate, LCDs, keys) is
  gone. `DrumMachine.jsx` now = `.dmx` (styles in `Metronome/
  DrumMachine.css`; WoodMetronome.css lost every `.dm-*` rule): a tempo
  card (big 46 px number between round − / + via BpmField, BPM caption,
  Tap, a dot per beat lit from the playhead, beat 1 orange) · an inset
  list Style / Sound / Time = `<Select>` pop-ups, Fills = `Switch` (+ ⓘ)
  · the pattern card: Segmented "In use | All drums" (was the Kit latch)
  + plain Edit / New; a GarageBand-style beat sequencer (rounded pads in
  Apple system colours per group — kick red, drums orange, cymbals
  yellow, perc teal; soft = 42 % tint; every other beat a shade darker;
  playhead column ringed in accent; grid always LTR; row name = colour
  dot + name, tap = hear); editing = name field + Grid pop-up, hint,
  Delete (plain red) · Clear · Cancel · Save (tinted) · levels: master
  volume row always, "Mixer" disclosure row (device key
  `dudestar-dm-mixer-open`) with the 4 channels (dot, ui-slider, speaker
  mute key, red when muted) · ONE filled Start (gray red Stop). The
  strings' leading ▶ / ■ are stripped (the Button has its glyph). Tool
  screen gets the grouped grey ground (`.tool-screen:has(.dmx)`).
  Engine / patterns / saved beats untouched. Playwright 390 HE, 820 HE
  dark (drawer), 1180 EN (drawer + tool screen): playhead + beat dot
  move, mixer opens, tap a pad -> edit -> save -> "My patterns" style,
  no errors, drawer needs no zoom. Not added: swing (the engine has no
  swing control).
- v1.0.227 (user, iPad: singing isn't heard and he can't tell if it's him
  or the mic; + a listening link per song in the Band's setlists).
  (1) `VocalTrainingView/MicMeter.jsx` (`.vocal-mic-meter`): mic glyph +
  16 LEDs of the RAW input (-72..-12 dBFS; useVocalMic `live` gained `db`
  and `voiced` = above the room gate) + one line: Mic off / resting while
  the piano plays (cue) / No sound at all (deadInput, red) / Mic on · hum
  to check / Hearing you (· G4 with a pitch). It moves for any hum, even
  below the gate. Shown in the runner (every exercise, above the roll;
  replaces the 64x6 `.vocal-level`, with a Test key when idle), in the
  range test (every step but the result; Test on the intro) and as a
  "Mic check" row on the Vocal home (tap = mic on + meter, tap = off).
  Playwright fake mic 390 HE + 1180 EN: off -> Test -> hearing · G4.
  NOT verified on the iPad. (2) LISTENING LINK on the SONG (not the
  setlist entry, so every setlist + the band get it): sheet prefs `link`;
  pure `music/sheets/songLink.js` (`cleanLink` = https only, http
  upgraded, bare host accepted, <= 500; `serviceOf` youtube / spotify /
  apple / web). StageView: a 44 pt round listen key `.stg-listen.is-<svc>`
  (play-in-circle, tinted red / green / pink, label "Listen on …"; opens
  the link — iOS hands YouTube / Spotify / Apple Music links to their
  apps) at the end of setlist rows and Songs rows; ••• "Add / Edit
  listening link" -> `ListenSheet` (field, detected service, "Find it on:
  YouTube · Spotify · Apple Music" search links with the song's name,
  Remove, Save). Picking a band suggestion copies its link to the new
  song; shareChart copies it. Cloud: column `charts.link` =
  `supabase/migrations/006_stage_link.sql` — THE USER RUNS IT; until then
  `hasLink` falls back (42703 / PGRST204 mentioning link) and the link
  stays on his own devices (prefs sync with the profile). Pushed with the
  other prefs (onSheetPrefs), pulled unless a send is pending. Fake
  Supabase: A adds a youtu.be link -> server row -> B (390 HE) sees the
  key in the setlist; no errors.
- v1.0.228 (user picked option 1 of 5): the Tools button's icon is a
  TUNING FORK (LineIcon `tools`: two tines joined in a U + the stem) — it
  says "music tools"; the wrench (v1.0.225) read as generic settings.
- v1.0.229 (user, iPad: the 2nd+ song's ••• had no "Add link"; "can Play
  play the song while I keep seeing the chart?"). (1) The items were
  there — `.ph-group`'s overflow: hidden CLIPPED the menu under a lower
  row (only "Rename" showed). Stage.css: `.stg .ph-group.stg-group`
  overflow visible (first / last child inherit the radius) and the row
  with an open menu raised (`:has(.more-menu-btn.active)`, z 5).
  (2) IN-APP LISTENING: `songLink.embedOf()` = the service's own embed —
  YouTube (youtu.be / watch / shorts / music.youtube -> youtube-nocookie
  embed, playsinline, t= -> start, 16:9), Spotify (track / album /
  playlist / episode, intl-xx ok -> open.spotify.com/embed, 152 px),
  Apple Music (album / song / playlist -> embed.music.apple.com, 175 px);
  else null = the key opens the link outside as before. Pure store
  `music/sheets/listenStore.js` (open / close / hosts). `Stage/ListenDock
  .jsx` (mounted by StageView, portal, z 260 = ABOVE the Performer's
  200): a Liquid Glass card at the bottom end corner (phones: full width
  minus 12) — song name · service, ↗ open in the app, fold (smaller:
  220 px wide, Spotify 80 px — never hidden, the services' players must
  stay visible while playing), × stop; the iframe stays mounted so the
  song plays on while the chart / words show. The list's listen key plays
  in the dock; the Performer's top bar gets a headphones key when the
  song has an embeddable link and a dock host exists. iOS may need one
  tap on the player itself to start (autoplay with sound is the browser's
  call). Spotify / Apple embeds play the full song only when signed in to
  that service in the browser, else a 30-s preview (their rule). Privacy
  page: listening links + embedded players (21 Nov 2026). Playwright 390
  / 820 HE + 1180 EN (embeds route-mocked): every row's menu fully
  visible, link -> dock with the embed URL, open the song -> Performer
  with the dock on top + its listen key, fold, close; no errors.
- SONG SEARCH (v1.0.230, user: "type a song and the band + a YouTube
  link are added; type a band and pick from its songs" + "the play key
  by the song looks too small"). `api/song-search.js` (Vercel): `?q=&c=`
  = Apple's public iTunes Search (no key; entity song, country IL for
  Hebrew / US, 8 unique title+artist, art 120 px, trackViewUrl = Apple
  Music link; cached a day) · `?yt=<title artist>` = YouTube Data API v3
  search (1 embeddable video) ONLY when the Vercel env var
  `YOUTUBE_API_KEY` is set (never in the browser; 100 units / pick, free
  10,000 / day) -> `{youtube, ready}`. Client `music/sheets/songSearch.js`
  (`searchSongs` cached, `linkFor(song)` = YouTube else Apple Music,
  `songLabel` "Title – Artist"). `Stage/SongSearchField.jsx` = a field
  that suggests as you type (320 ms debounce, only after the user typed —
  a prefilled value doesn't search): iOS rows (art 40 · title · artist),
  "Song details from Apple Music" foot; a pick -> onPick. Used in: the
  new-song Words sheet's name (pick -> "Title – Artist" + link; a new song
  may now be saved with a name only; words-only songs with empty words
  upload too), the Suggest sheet (title + artist + link), the listening-
  link sheet ("Search for the song" above the link field; the old "Find it
  on" search links stay as a fallback). Listen key = a 30 px filled disc
  with a white triangle (SF play.circle.fill) in the service colour, 44
  pt target. Privacy page: searches pass through our server to Apple /
  YouTube. Playwright (API route-mocked) 390 HE (YouTube ready) + 1180 EN
  (no key -> Apple link): 3 suggestions, pick fills name + link, row key,
  listen-sheet search sets the link; no errors. Real iTunes / YouTube NOT
  reachable from here.
- v1.0.231 (user: the Suggest sheet had "Done" on top — which only
  closed it — and "Suggest" at the bottom; confusing): FORM sheets in
  Band now use iOS's new-item header: Cancel (start, regular) · title
  (centred) · Add / Save (end, bold, disabled until the form is valid),
  no bottom button. StageView `Sheet` takes `action` {label, onClick,
  disabled, busy}; used by the Suggest sheet (Add / Save), the
  listening-link sheet (Save; Remove stays at the bottom, red) and
  AskSheet (new band / join / rename). Info sheets (manage band, pick
  songs, photos) keep Done. Strings `stage.cancel`, `stage.sg.addBtn`.
  Playwright sugg.cjs + ss.cjs (390 HE + 1180 EN): add / edit / link
  flows pass, no errors.
- v1.0.232 (user: "build 1, 2, 3"): Band suggestions — (1) TWINS: the
  Suggest sheet checks the typed song against the band's suggestions and
  songs (`findTwin` in SuggestionsView: titles without case / niqqud /
  punctuation / a leading "the"; artists must match only when both are
  given; band songs split at " – ") and shows an inline note under the
  song field (`.stg-twin`): open -> "Already suggested by X (likes: n)" +
  Like (if not voted; votes and closes), picked -> "Already chosen for
  rehearsal", dropped -> "Suggested before … not chosen" + Bring back
  (reopens), a band song -> "Already in the band's songs". Add stays
  enabled (could be another version). (2) LISTEN IN THE APP: a suggestion
  with a link has the same round listen key as songs (StageView passes
  `ListenKey`; YouTube / Spotify / Apple Music play in the dock); the
  ••• "Listen" item (opened outside) is gone. SuggestionsView now takes
  `songs` (the scoped sheets) instead of `songIds`. (3) Enter in the
  song field submits (SongSearchField `onEnter`). Strings
  `stage.sg.twin*`. Playwright sugg.cjs: zombie / "The Zombie!" ->
  chosen, Hebrew dropped -> Bring back reopens, Africa -> open,
  unknown -> none; listen key -> dock; Enter saves. (The test's only
  pageerror is its own init script inside the embed's iframe.)
- READINESS + SHOW LENGTH (v1.0.233, user: "build 1, 2"). (1) Each
  member marks each song Ready / Learning / Not yet (the song's ••• menu,
  ✓ beside the current; choosing it again clears) — setlist rows + Songs
  rows. Band songs: NEW table `band_ready` (chart_id, user_id, band_id,
  state; one row per member per song; members read, each writes only
  their own — trigger forces user_id = auth.uid(); insert only for a song
  of that band) = `supabase/migrations/007_band_ready.sql` (THE USER
  RUNS IT; also adds `band_setlists.gap`); chartCloud `setReady()`
  (optimistic), state `ready` / `readyOk` (missing table -> no marks, the
  setlist shows `stage.rd.setup`). My own songs (Mine): sheet prefs
  `ready`. Row mark (`ReadyMark`): band = a ring k/n of members ready
  (green ✓ when all, orange partial; hidden until someone marked the
  song), mine = filled ✓ / half / empty circle. Band setlist: "Ready for
  the show" (`ReadyPanel`): "k of n songs ready for everyone" + a row per
  member (most pending first) "1 learning · 2 not marked" / "All ready",
  tap = the songs + their state. Mine setlist subtitle adds "k of n
  ready". (2) Show length: setlist subtitle "3 songs · about 11 min"
  (sum of each song's length, 3:30 when unset = "about") + a "Between
  songs" pop-up (no pause / 15 s / 30 s / 1 min / 2 min; personal
  setlist field `gap`, band column `gap` with hasGap fallback) and a
  footnote "Show length: 11 min." Strings `stage.rd.*`, `stage.len.*`.
  Checked: 007 on local Postgres 16 twice + RLS (member marks own,
  can't write another's, outsider sees / writes nothing); Playwright
  rd.cjs (fake Supabase, A 1180 EN owner + B 390 HE): length 10 -> 11
  min with 30 s, server gap 30, A Ready -> 1/2, B Ready + Learning ->
  2/2, panel counts, toggle off clears; sugg / ss tests still pass.
- APPLE DESIGN AUDIT, pass 1 (v1.0.234, 2026-11-21; user: "go over the
  whole system in order and make sure everything meets Apple's
  standard"). Crawler `scratchpad/s8/audit.cjs` (every home card ->
  every shortcut -> every library row one level deep -> segmented 2nd
  sections; phone 390 HE light + iPad 1180 EN dark, 85 screens each):
  44 pt targets, WCAG contrast, > 1 filled primary per screen, bare
  <select>, horizontal overflow, text < 11 px + screenshots. Fixed:
  (1) RTL chrome mirrored (rule 17); (2) light `--accent` #005cb8 / dark
  #409cff (Apple's accessible blues) — tinted-button labels were 4.1:1;
  unchosen bottom-tab label #4b4b50 on light glass; bass level tags;
  settings footnotes (opacity removed, 12 px); minute-changes idle "60";
  (3) FirstVisit "Got it" = plain accent text (it was a 2nd filled
  primary on 6 screens); (4) 35 content cards lost their 1 px hairline
  (Apple inset cards: white on the grey page; the gray-on-gray start
  cards of ear training / piano exercises / bends became white);
  (5) Improvise: Licks | Phrases | Solo coach = a Segmented under the
  title (was 3 wrapped chips, labels shortened); (6) vocal runner / ear
  training / range test and the teacher's sub-screens: the "Back" pill /
  "‹ Back" link -> BackButton beside Home; (7) songwriter: no full-width
  glass bar (scroll edge like Band) + its "‹ Songs" link -> BackButton
  in a back slot; (8) Settings Account / Install pages: label, text and
  actions stacked (the 92 px label column squeezed the text); gray
  buttons there + in Singing use accent labels; (9) bass exercise = a
  page title (h1 + level tag) like the guitar's Practice; (10) amp preset
  = Select; (11) 44 pt hit areas added (bass Loop / play, vocal actions,
  mic Test, shortcut keys, sheet Done, ui-btn sm / md, segmented
  segments, BPM value, GP transport, settings buttons; Theory lesson rows
  min-height 44); lick tags 11 px. After: no screen with 2 filled
  primaries, no bare select, no overflow; contrast left = only
  device-face engravings. Accepted: pop-up buttons 36 px (HIG form
  size), tab-bar labels 10 px (HIG), device faces untouched.
- APPLE DESIGN AUDIT, pass 2 (v1.0.235; user: "continue"): deeper
  screens (scratchpad s8/deep.cjs: a lesson's steps, ear-training
  session, lick player, a Theory course, songwriter meta / ••• / chord
  wizard, drum edit, GuitarPro practice / chords, vocal start; 390 HE +
  1180 EN dark). Fixed: (1) GuitarPro song view hides alphaTab's score
  header (title / artist / album / credits — NotationElement Score*): the
  file picker already names the song, and on a phone the serif title was
  cut on both sides; (2) desktop / iPad: the group's segmented control
  (Teacher | Theory …) is centred under the tab capsule (it hugged the
  left edge); (3) sheet Cancels in the songwriter (chord wizard, chord
  suggestions, dictation) = plain accent text (`.sw-btn.is-plain`), not
  a gray pill; (4) Compose's "Try:" example chords = gray chips with
  accent labels (were dashed outlines); Improvise's lick rows = white
  inset rows (no hairline, gray on hover); (5) singing ear training: the
  score row appears only once a session runs (it showed 0/0 · 0 · 0
  before Start). No page errors on either device.
- APPLE DESIGN AUDIT, pass 3 (v1.0.236): the last hairline borders
  (scratchpad s9/hair.cjs = the audit crawler with a finder for 1 px faint
  borders on rounded boxes; 85 screens, 390 HE light + 1180 EN dark).
  Fixed in one block at the end of `components/ui/ui.css` (+ the mixer in
  liquid-glass.css): white cards on the grey page lose the outline (bass
  BPM stepper, scale stepper, piano "generated" chord box, GuitarPro score
  box, guitar / piano chord-rhythm lanes = white); boxes inside a white
  card = gray fill (room calibration, the lick trainer's library bar);
  Theory's lesson ‹ › nav + "Mark complete" = gray capsules with accent
  labels; GuitarPro's track mixer (floats over the score) = regular
  Liquid Glass. Left on purpose: the metronome's wood-face tiles (device
  face). After: no hairline left outside device faces; no 2 filled
  primaries, no bare select, no overflow.
- v1.0.237 (user: "in dark mode a white shadow suddenly shows under the
  tool cards"): (1) the Tools card's photo still held the studio's white
  floor / backdrop between the cables and stands — invisible on the light
  card, a white smear on the dark one. Re-keyed to
  `public/home/tools-studio2.webp` (new name: /home/* is cached 7 days):
  light neutral pixels (lum > 140, sat < 0.15) connected to the
  transparent background and holding real white (> 215) -> black with
  alpha = darkness x 0.6 (soft floor shadow); protected rects: cymbals /
  everything above y 275, toms, floor tom, hi-hat, bass-drum head, tape
  deck, the clear pedal box (one-off script in the scratchpad, not in
  scripts/). index.html preload + vite globPatterns + instrumentArt
  updated; the old file removed. (2) Dark home cards (`.home-card.is-active`)
  and the dark tool-screen card lost the blue-white halo (0 0 44px glow +
  blue ring) — it read as a light shadow under the card; tool-screen dark =
  solid #1c1c1e card on a black page, no lit title; the drum machine has
  no card around its own groups. Checked 1180 + 390 HE dark: home card +
  every Tools shortcut screen.
- BAND INVITE LINK (v1.0.238; user: "does the member get the invite? the
  message text is wrong, the code can't be copied alone — make the message
  lead him through joining as clearly as possible"). The old text pointed
  to Play › Stage › Band (gone since v1.0.206). Now the invite = a LINK
  `https://the-dude.vercel.app/?band=CODE` (`music/sheets/joinLink.js`:
  `captureJoinCode()` in main.jsx keeps the code in device key
  `dudestar-join-code` for 7 days and takes it out of the address — it
  survives a Google sign-in redirect and the first-run screens; App opens
  the Band screen with `start: 'join'` once onboarding is done). StageView
  `openJoinFromLink()`: already a member -> that band; else the join sheet
  (`BandJoinSheet initialCode`): headline "You're invited to a band", no
  Create | I have a code switch, the code typed in, one Join; signed out =
  "sign in (Google or email), the code waits here" + Sign in — the sheet
  opens again by itself when the sign-in lands (`wasInRef`); the code is
  cleared on Join or when a signed-in user closes the sheet. Message
  (`stage.band.inviteText`): invited line · "tap to join:" + the link on
  its own line · "sign in, tap Join" · the code ALONE on the last line
  (fallback: Band card › Members › I have a code). Playwright (fake
  Supabase): signed out /?band=code1xy -> address cleaned, sheet asks to
  sign in, code kept; signed in -> field CODE1XY, Join -> member, code
  cleared; no errors.
- v1.0.239 (user, iPhone dark: a white shadow under the guitar — "what
  did you change?"): not a CSS change — the guitar photo itself
  (`guitar-lp.webp`, since 2026-10-26) had its floor shadow baked as
  OPAQUE light grey, which only blended on the light card. Re-keyed to
  `public/home/guitar-lp2.webp` (new name, /home/* cache): neutral floor
  pixels below y 975 connected to the transparent background -> black
  with alpha = darkness (identical on a white card, a soft dark shadow on
  the dark one). index.html preload, vite globPatterns, instrumentArt +
  Onboarding updated; old file removed. All 8 home cards screenshotted in
  dark at 390: no light floor left (bass / piano / others were fine).
- v1.0.240 (user: "Learning / Not yet aren't clear; would Apple reorder
  a setlist like this?" -> no): (1) READINESS = word tags on tinted
  capsules (`.stg-ready`, iOS status badge): mine Ready green /
  Learning orange / Not yet grey; band songs "k/n ready" (orange,
  grey at 0) / "All ready" green; the song's ••• has a "My status"
  header over the three choices. (2) SETLIST REORDER = iOS Edit mode:
  "Edit" plain accent text beside Start (only with songs) -> rows get a
  red ⊖ at the start (tap = a red "Remove" key), ≡ grip at the end
  (pointer drag, a row per half-height; arrow keys move too), the row
  lifts while dragged; "Done" (bold) commits the order once
  (`sets.setItems`); Back also commits; Add songs hidden while editing;
  Up / Down left the row's •••. Playwright 390 HE + 1180 EN dark: tags,
  drag 0 -> 2, remove, Done saved; no errors.
- v1.0.241 (user: "why isn't Edit inside the ••• menu?" — right: on a
  screen that already has a •••, Apple puts Edit in it, as Music does
  for a playlist): the setlist header = Start + ••• only; Edit is the
  menu's first item (Rename, Delete after it); while editing, Done
  stays the one visible key. Playwright 390 HE + 1180 EN: ••• -> Edit
  -> drag / remove -> Done saved.
- v1.0.242 (user: "Band -> Members opens the screen AND a share
  window"): Members opened the Band screen with the band's manage SHEET
  on top (invite card with a big Share key first). Now the band is a
  PUSHED PAGE (iOS Settings / Family Sharing): StageView renders
  `BandManagePage` when dialog === 'manage' (the band row and the
  Members shortcut both open it; Back = the Band screen): h1 = band
  name, Members group with "Invite Members" (person+ icon, accent) as
  its last row — the system share sheet opens only on that tap — the
  code as a selectable footnote, then rename / new code / another band,
  then leave / delete. The Members shortcut also waits for the first
  cloud sync on a device that never synced (it offered "create a band"
  to a member). Playwright fake Supabase 1180 + 390 HE: no sheet on
  open, invite row shares the link text, Back -> band screen.
- v1.0.243 (user: "in readiness, Learning and Not yet get the same
  mark?" — yes: in a band the row tag counted only READY members, so
  Learning and Not yet both read "0/2 ready"): the row tag is now MY
  status in every library (Ready green / Learning orange / Not yet grey,
  none = no tag); "All ready" green only when every member is ready. The
  band's overall picture stays in the "Ready for the show" panel.
  Playwright rd.cjs (fake Supabase, 2 members): B marks Zombie Ready +
  Africa Learning -> tags "All ready" / "Learning"; panel unchanged.
- REHEARSAL TOOLS (v1.0.244, 2026-11-21; user: "build 2, 3, 4 — notes
  can also be a key change etc."). (1) OFFLINE: a setlist shows under
  its title "✓ Saved on this device — works without internet" (green
  check, like Music's downloaded mark) or "N songs aren't on this device
  yet" + Download (= syncCharts; offline -> "connect to download").
  pdf.js's standard fonts: workbox runtimeCaching CacheFirst `/pdfjs/`
  (cache `pdfjs-fonts`) + StageView warms all 14 font files once per
  session when a setlist opens online. (2) REHEARSAL NOTES: a song's
  ••• "Notes & recordings" -> a pushed SONG PAGE (StageView `songPage`,
  Back = where you were; Start opens it in the Performer): "Rehearsal
  notes" group (open notes, author · time, ••• Mark as done / Delete —
  delete only the writer or the band owner) + an inline composer row
  ("Add a note…", Enter / Add), done ones folded ("Done · n"); a row's
  open-note count = bubble + number (`.stg-notes-badge`). KEY / TEMPO /
  LENGTH CHANGES are logged by themselves (`music/sheets/songNotes.js`:
  setSheetPrefs now passes `prev` to listeners; the stepper taps of one
  go are gathered for 4 s and logged once from-before -> after; back to
  the start = nothing): "Changed the key: −3 semitones (was the
  original)". Band songs = Supabase `song_notes` (NEW
  `supabase/migrations/008_song_notes.sql` — THE USER RUNS IT; chartCloud
  step 6, `addBandNote` / `updateBandNote`, missing table -> the setup
  line, nothing breaks); my songs = personal key `dudestar-p-song-notes`.
  The Performer's details sheet lists the song's open notes. (3) REHEARSAL
  RECORDINGS (`audio/rehearsal.js`): the song page's "Record rehearsal"
  row (red dot, Voice Memos style; "Recording · 0:42" + Stop) and a
  record key in the Performer's top bar — moving to the next song closes
  the take on the song that played and opens one on the next (the mic
  stays open); closing the Performer stops. Takes = MP3 128 kbps mono
  (lamejs; WAV fallback), quiet input brought up (≤ +24 dB), < 3 s
  dropped, split at 12 min, IndexedDB `dudestar-rehearsals` (this device,
  per profile); rows: play / pause, waveform with progress, length, •••
  Share (the MP3 file) / Delete. Privacy page: band notes visible to the
  band; recordings never uploaded. Checks: 008 on local Postgres 16 twice
  + RLS (member adds; another member can mark done but not change the
  text; outsider sees / adds nothing; owner deletes anyone's, a member
  only their own; undelete ignored; anon denied). Playwright fake mic 390
  HE + 1180 EN dark: offline line (1 missing / all saved), notes add /
  Enter / done fold / badge, record 4 s -> MP3 take plays, Performer
  record across 3 songs = 3 takes on their songs, key +2 -> change note;
  fake Supabase 2 members: B's note + B's key change reach A, owner menu,
  done synced. NOT verified on devices / real Supabase.
- BAND TAKES (v1.0.245; user: "at a band rehearsal record the song being
  played so every member can listen afterwards and improve; sometimes
  several takes of the same song"): a take of a BAND song now goes up to
  the band. NEW `supabase/migrations/009_song_takes.sql` (THE USER RUNS
  IT): table song_takes (who / when / path / duration / peaks / size,
  everything fixed after insert, deleted only by who recorded it or the
  band owner, no undelete; path must be in the band's folder) + private
  bucket `takes` (60 MB, audio/mpeg + audio/wav, path
  b/<band>/<song>/<take>.mp3; `take_band(path)` -> members read / add;
  delete = the uploader or the band owner). Checked on local Postgres 16
  twice + RLS (outsider sees no row / file, other band's folder and junk
  paths refused, fields immutable, member can't delete the owner's take).
  Client: rehearsal.js saves locally, then `uploadBandTake` (chartCloud:
  storage upload + row, state `takes` / `takesOk`, sync step 7);
  offline / failed = `retryUploads()` after every Band-screen sync; MP3
  now 96 kbps (~3 MB / 4 min). SongTakes merges the band's takes (all
  members) + mine still going up ("Sending to the band…" / "Goes to the
  band when you're online"); rows "Take n · time" numbered per day in
  playing order + who recorded it; play downloads once and keeps a copy
  (`cacheTake`, offline later); ••• Share / "Delete for the whole band"
  (two taps; only the recorder or the band owner). Footnote: "Every take
  goes to the band — all members can listen" / setup line before 009 /
  "stay on this device" for my own songs. Privacy page updated. Playwright
  fake Supabase + fake mic: B (390 HE) records Zombie twice -> 2 MP3s +
  rows; A (1180 EN) sees "Take 2 / Take 1 · Dana", plays (download),
  deletes one for the band -> row deleted + file removed; B after sync
  sees 1; no errors. NOT verified with the real Supabase / devices.
- v1.0.246 (user: an invited member gets no email and Google sign-in
  fails): checked live — Supabase auth settings fine (Google + email on),
  Google's account chooser opens from the app's authorize URL (no
  redirect error), and Gmail SMTP DOES send: the dudestar365 Sent folder
  held 3 code emails, all bounced "550 address not found" — the member
  typed his address wrong. Google: the likely cause is WhatsApp /
  Instagram's in-app browser (Google refuses to sign in there). Fixes:
  (1) EmailAuth — a domain typo check (`fixDomain`: gmial.com -> gmail.com,
  walla / hotmail / outlook / yahoo / icloud …, edit distance <= 2) shows
  "Did you mean …" (tap = fix; submitting again goes ahead as typed); the
  code screen says a wrong address never gets the code and its back key
  is "Change address". (2) CloudField: inside an in-app browser
  (`detectPlatform()` *-inapp) the Google button is replaced by a note
  "open in Safari / Chrome (••• / ⋮), or use email". (3) joinLink: in an
  in-app browser ?band= stays in the address, so "Open in Safari" carries
  the invite code to the other browser's storage. Playwright 390 HE
  (WhatsApp UA): code kept in URL, note shown, typo suggested + fixed,
  code screen text; Safari UA strips ?band as before.
- MEMBER AVATARS IN THE BAND (v1.0.247; user: "an emoji a user sets on
  his name should show in the band, for every member"): NEW
  `supabase/migrations/010_member_avatar.sql` (THE USER RUNS IT):
  `band_members.avatar` (text, the profile avatar's JSON) + trigger
  `band_members_touch` keeping band_id / user_id / joined_at fixed on
  update (the "own name" policy let a member move his own row into
  another band's id). chartCloud sync step 3: selects `avatar`
  (`hasAvatar` fallback on 42703 / PGRST204 before 010) and, when my rows
  differ from my CURRENT profile name / avatar (`myName()`, personal key
  `dudestar-p-profile-avatar`), updates them once — so a renamed profile
  reaches the band too (name works even before 010). members carry
  `avatar`; StageView `MemberAvatar` draws it like the profile chip
  (`.stg-avatar.is-own` + is-emoji / is-clear, hue gradient, dark tint),
  else the old letter on a colour; presence faces look the member up.
  Privacy page: avatar visible to the band. Checked: 010 on local Postgres
  16 twice + a member can't move his row to another band or touch another
  member's avatar; Playwright fake Supabase A (🎸, hue 30) + B (hue 280):
  each pushed once, both see 🎸 + the purple D, name "Me" -> "Hay".
- v1.0.248 (user: "why such a loud Remove key beside a member — is that
  where Apple would put it?" — no): the band page's member rows lost the
  red "Remove" capsule and the "only the creator can remove" footnote.
  For the band's manager every OTHER member's row is a button with a
  chevron (`.stg-member-row`) -> a pushed member page (StageView
  `memberPage`, `MemberPage`: big avatar (`MemberAvatar big`) + name +
  "here now", one red row "Remove from Band" -> second tap "Tap again to
  remove", a footnote saying what removal means; Back = the band page;
  removing returns there) — iOS Family Sharing's pattern. Others see plain
  rows. Strings `stage.band.removeFrom / removeSure / removeNote`.
  Playwright fake Supabase 1180 EN + 390 HE: no inline key, row -> page,
  two taps -> member removed on the server, back on the band page.
- MEMBER PAGES (v1.0.249; user: "build 1-3" = part in the band, the
  member's readiness, recent activity): every member row on the band page
  is a button with a chevron (the manager's included) and shows the
  member's part under the name. `MemberPage` (StageView): big avatar,
  name, part ("Guitar · Vocals"), here-now; MY page = "My part in the
  band" iOS checkmark list (`MEMBER_ROLES` vocals / guitar / bass / drums /
  keys / winds / other, multi) -> `setMyRoles(band, roles)` (chartCloud,
  optimistic; column `band_members.role` text "vocals,guitar" = NEW
  `supabase/migrations/011_member_role.sql` — THE USER RUNS IT; `hasRole`
  fallback, before it the list is disabled with a setup footnote); "The
  band's songs": "Ready for k of n" + the songs not ready (Learning first,
  then Not yet / Not marked tags), tap = the song page (Back returns to
  the member); "Recent activity": the member's takes / notes /
  suggestions in this band, newest 6, coloured icons, tap = song page or
  the Suggestions tab; the manager's "Remove from Band" stays at the foot.
  Strings `stage.role.*`, `stage.mp.*`. Playwright fake Supabase 1180 EN +
  390 HE: role subtitle in rows, B's page (1/3 ready, Learning / Not
  marked, 3 activity rows), song page + back, my roles saved to the
  server row; no errors.
- BAND KITTY (v1.0.250; user: "a band pays for rehearsals — everyone puts
  in e.g. 150, each rehearsal comes out of the shared kitty until it's
  empty and everyone tops up again; equal shares, with exceptions"). Band
  screen 4th tab "Kitty" / "קופה" (band scope only, like Suggestions).
  A RECORD BOOK only — no money moves through the app. NEW
  `supabase/migrations/012_band_kitty.sql` (THE USER RUNS IT): table
  `band_kitty` (band_id pk, treasurer, currency ILS; written only via rpc
  `set_treasurer(b, u)` — the manager, u must be a member or null) +
  `band_ledger` (kind round / deposit / expense, amount integer agorot,
  member, round_id, note, who uuid[] = expense sharers (null = all), at
  date, by_user / by_name, deleted sticky); `band_cashier(b)` = owner or
  treasurer (a member) -> insert / update; members read; anon none.
  Checked on local Postgres 16 twice + RLS (member can't write, can't name
  the treasurer, an outsider can't be treasurer, treasurer writes,
  undelete ignored, outsider sees nothing). Pure `music/sheets/kitty.js`:
  `kittyOf(entries, memberIds)` -> inKitty, per member {paid, share, net}
  (expense split to the agora among its sharers), the newest round {paid,
  open}, last expense, rehearsalsLeft, low; `historyOf`, `parseAmount`,
  `money(amount, lang, currency, sign)` (Intl he-IL "150 ₪").
  chartCloud: state `ledger` / `kitties` / `kittyOk`, sync step 8,
  `addLedger` (optimistic) / `removeLedger` (soft) / `setTreasurer`.
  `Stage/KittyView.jsx`: balance card like Apple Cash ("In the kitty",
  big amount, "Enough for N more rehearsals" / orange "time to top up",
  "Kept by <name>", ••• Record a payment / Treasurer); cashier keys
  Rehearsal (filled; sheet: amount = last cost, what, date, "who shares
  it" checklist = everyone) + Top-up (tinted; amount each, note); the
  newest round "₪150 each · k of n paid" with a tinted Paid key per member
  (= a deposit in the round); "Each member" put in · share · ± net;
  History (tap = entry sheet with details + two-tap Delete for the
  cashier); others read only ("Only <name> or the manager updates the
  kitty"). Strings `stage.nav.kitty`, `stage.kt.*`. Privacy page updated.
  Playwright fake Supabase A 1180 EN (owner: round 150, both paid,
  rehearsal 120 -> ₪180, 1 more rehearsal; treasurer -> B) + B 390 HE
  (treasurer adds 120 shared by one -> ₪60, low; delete -> ₪180); no
  errors.
- SONG COVERS (v1.0.251; user: "the search shows the album picture — why
  not beside the song wherever it appears?"): pure `music/sheets/
  songArt.js` — no server column: each device finds a cover from the
  song's name "Title – Artist" (`splitName`) through /api/song-search
  (one lookup at a time, 250 ms apart; a hit needs the same normalised
  title AND artist — no artist = an original = no cover, never a guess),
  device cache `dudestar-song-art` {"title|artist": url | ""}; a pick in
  any song search (new song, listening link, suggestion) seeds it
  (`rememberArt`); `artAt(url, px)` resizes Apple's URL. `Stage/
  SongArt.jsx`: `SongArt` (img 6 px radius, else `fallback` or a grey note
  tile) + `SongName` (title, artist under it — Apple Music's two lines).
  Shown in: Songs rows (cover replaces the doc / words tile when found),
  setlist rows (number · cover · title / artist), the Add-songs sheet,
  suggestion rows, the song page header (88 px cover + title, "artist ·
  length"). Privacy page: covers load from Apple. Playwright (search +
  images mocked) 1180 EN + 390 HE: 2 covers + 1 note tile for "My own
  song" in Songs and the setlist, 1 on the suggestion; no errors. Real
  iTunes NOT reachable here.
- TAB4U PDF -> WORDS + CHORDS (v1.0.252; user: Tab4u blocks copying, only
  print-to-PDF; sent a real Tab4u print). Checked with pdf.js: the print is
  TEXT (monospace), chordsOnPage finds all 80 chords = the Key stepper
  works on the PDF itself. `pdfLines()` (lyricsText.js) now places a chord
  line that sits right above a HEBREW line INTO it by real x (words split
  from runs evenly, a Hebrew run's string is in reading order): a chord
  goes before the word under its right edge, over a gap = the next word in
  reading order, past the last word = at the line's end; "הודפס ב" footer
  dropped. `isTabLine()` = guitar-tab staff lines (e|---5-7---|) dropped
  from the words (Tab4u + Ultimate Guitar), and mergeChordLines never
  merges a chord line into one. Tab4u "תיסלם – לראות אותה היום": every
  chord on its word. Left: a chord line at a page's foot whose words start
  the next page stays a chord row.
- PDF PAGES FRAMED TO THEIR CONTENT (v1.0.253; user's Tab4u print came
  cut at the right edge — "can the system check the display and fix it
  by itself?"): Tab4u prints flush against the RIGHT edge (text to
  595.5 pt on a 595 pt page) and uses only the right half. PdfSheetView
  `pageFrame(page)` (called where both PdfSheetView and the Performer
  measure pages; size = {w, h, lo, cw}) reads the page's TEXT extent:
  narrower than 88 % of the page -> the window = text + 4 % margin each
  side; else, one side touching (< 4 %) with uneven margins -> centred.
  No text (scans / photos) = unchanged. `Page` draws that window
  (`frameAt`: px per pt = min(width / cw, max(width / W, 1.8 x width /
  screen width)) — fills a phone, at most ~1.8 px/pt on a wide screen,
  never smaller than the plain page, Size zoom unchanged), canvas at the
  page box size with pdf.js `offsetX`, and wraps overlays in
  `.sheet-page-shift` (laid out on the full page, scale + translateX
  onto the window) so transposed chords stay on their chords. Tab4u
  print: phone 390 text ~2x, iPad 820 enlarged + centred, 1180 as before
  but nothing cut; Key +2 boxes on their chords at all three.
- SONG DETAILS (v1.0.254; user: "when I add a song and rename it I can't
  add the band too, or find a link or the album picture"): one sheet like
  Apple Music's Get Info replaces the inline Rename + the separate
  listening-link sheet (`SongInfoSheet` in StageView, was ListenSheet):
  Cancel · "Song Details" · Save; the cover (SongArt 88 px, found from
  song + artist as you type), Song = SongSearchField (a pick fills song,
  artist, cover cache and a link: YouTube when the server has the key,
  else Apple Music), Artist field, Listening link field (+ "find it on"
  links while empty). Save = `renameChart(id, "Song – Artist")` + link
  pref, only what changed. ••• item "Song Details" / "פרטי השיר" on Songs
  rows (Rename + link items gone) and setlist rows (link item gone).
  Playwright (search mocked) 390 HE + 1180 EN: type -> pick -> fields
  Yesterday / The Beatles / youtu.be, save -> row title + artist, cover,
  listen key; no errors.
- ADD A CHART TO A WORDS SONG (v1.0.255; user: "adding a song lets me
  paste words but not attach a file"): before, a PDF always became a
  SEPARATE song (his list had "לראות אותה היום" twice: chart + words).
  A words-only song's ••• (Songs rows + setlist rows) has "Add chart
  (PDF / photo)" -> a hidden file input (PDF, or photos -> imagesToPdf)
  -> chartCloud `attachChart(id, file)`: the SAME record gets the blob
  (id, name, words, setlists, notes, prefs unchanged), `cloud: false`
  so sync step 1 uploads the file + upserts the row's path; step 2 on
  other devices: a local words-only song whose row now has a path
  downloads the file. Playwright 390 HE + 1180 EN: words song -> Add
  chart -> one row with the doc tile, item gone, Performer shows the 2
  pages; no errors. Cloud path not run against a fake Supabase.
- FORM SHEETS ASK BEFORE DISCARDING (v1.0.256; user: a tap outside
  Song Details closed it and lost what he typed; "is Cancel the right
  word?" — yes, iOS form sheets say Cancel · title · Save): StageView
  `Sheet` with an `action` tracks `dirty` (any input / change event
  inside it); not dirty = outside tap / Escape / Cancel close as before;
  dirty = an iOS action sheet over the screen (`.stg-discard`, in the
  scrim): "Discard Changes" (red) / "Keep Editing" (bold accent, focused;
  a tap on the dim area or Escape = keep). Covers every form sheet in
  Band (Song Details, Suggest, new band / join / rename, kitty sheets).
  Info sheets (Done) unchanged. Strings `stage.discard.*`. Playwright 390
  HE + 1180 EN: untouched -> closes; typed -> asks, keep keeps the text,
  Cancel + Discard closes; no errors.

- PLAY-ALONG (v1.0.257; user: "a play key on the chart page when the song
  has a link, and when it ends the next song plays"): the Performer's
  bottom bubble has a headphones key (`.stage-along-key`, when the song has
  an embeddable link, a dock host exists and no band sync runs; the old
  top-bar listen key is gone). YouTube = play-along: the recording plays
  in ListenDock (opens FOLDED, sits above the control bubble via
  `--stage-bar-lift` / `html.has-stage-perf`; the end card rises above it
  via `--stage-dock-h` / `html.has-listen-dock`) and the chart's scrollTop
  follows the PLAYER's time (`ytTime() / dur`, rAF; a finger still holds
  it); Pause / Play drive the player (`ytCommand`); the song length takes
  the recording's (saved only when unset); at its end "Up next · plays in
  3" + Cancel, then the next song loads into the SAME iframe
  (`openListen(…, {reuse: true})` -> loadVideoById, src pinned per player)
  so iOS needn't a new tap; next song without a YouTube link = stops.
  Scroll alone never plays anything (the band on stage). Spotify / Apple
  Music = the dock + the clock scroll (they report nothing). YouTube iframe
  API by postMessage, no script (`enablejsapi=1&origin`, "listening"
  handshake, infoDelivery / onStateChange) in ListenDock; state in
  listenStore (`ytInfo`, `onYt`, `reportYt`, `setYtSender`). Playwright
  with a fake YouTube page, 390 HE + 1180 EN: progress 0.37 after 3 of 8 s,
  pause holds, countdown -> song 2 in the same player, last song -> "End of
  the setlist", stop closes the dock; no errors. NOT verified with real
  YouTube / on iOS (autoplay with sound may need one tap on the video).
- v1.0.258 (user: "let me add the band's suggested songs to my own list;
  and my user icon doesn't show anywhere in the Band screen"): (1) a
  suggestion's ••• has "Add to My Songs" / "הוספה לשירים שלי" (Apple Music's
  Add to Library): the band's song copied with `shareChart(id, null)` when
  the suggestion was picked (words / chart / key / link come along), else a
  words-only personal song "Title – Artist" + its link; toast; once the
  song is in Mine (same `sameSong` match) the row reads "✓ In My Songs"
  (disabled, secondary text). SuggestionsView prop `mySongs`. (2) The
  Band screen AND the Songwriter screen had no avatar (rule 17): both top
  bars now end with `ProfileChip compact` (`.stg-screen-me`); its Settings
  opens the settings sheet (App renders it on the songwriter screen too).
  Playwright fake Supabase 1180 EN: add picked + open suggestions -> both
  in Mine, menu shows ✓; chip + settings sheet on Band / Songwriter 390 HE.
- v1.0.259 (user's play-along screenshot: "it scrolls too fast, the title
  covers the words"): timing was right (0:22 = "I believe in yesterday"),
  but in the words view the reading line started at the very top and only
  slid down slowly (guide = offsetTop + p·(height − span)), so the sung
  line sat under the title bubble early in the song. Words view = a
  TELEPROMPTER now: `.stage-perf.is-words` scroller padding top
  `--stage-read` (max(30dvh, 150px + safe top)) and bottom (100dvh − it),
  words-end 0 -> scroll span = the words' height exactly, so the guide and
  the lit line stay at that line for the whole song (clock or recording);
  the chart (PDF) view is unchanged. Measured 1180 + 390: span = box
  height, lit line 150–330 px from the top (bubble ends at 66) at p 0–0.4.
- LYRICS TIMING (v1.0.260; user: "the lit words come a little late —
  can it follow the song exactly?" -> an even pace can't: intro, solos,
  dense / sparse verses). Each SUNG line (words view, `data-li` on
  `.stage-w-line`, `isSung` / `sungKeys` in Performer) gets the second it
  starts in the song's recording; sheet pref `sync` = {v, src 'lrclib' |
  'tap', off, lines [[t, key]]} (key = start of the line's text, so the
  times survive edits: `timesFor()` re-aligns by key). Pure
  `music/sheets/lyricSync.js`: lineKey, parseLrc, Dice `similar`,
  `alignKeys` (ordered DP), `timesFromLrc` (>= half the lines must match),
  `fillTimes`, `makeSync`, `posAt` (holds on the sung line, glides to the
  next in the last 40 % of its span). (1) AUTO: on play-along with words
  and no sync, once per song, after the recording's length is known:
  `fetchLrc()` (songSearch.js) -> `/api/song-search?lrc=1&t&a&d` ->
  LRCLIB /api/search (title + artist, else q), the synced result closest
  to the recording's length; only the TIMES are kept; flash "Found the
  lyrics timing". (2) TAP: song details -> "Lyrics timing" block (state,
  Sync · Find · Clear, "earlier / later" ±0.2 s offset stepper, hints;
  "needs a YouTube link"): Sync replaces the control bubble with a tap bar
  (× · "Tap Now as each line starts" + "Line i of n · tap a line to redo
  from it" · ↶ back one line · filled Now · Done); the next line is
  underlined; Space / Enter = Now, Backspace = back, Escape = stop; a tap
  on a line = seek 1 s before the line above it and redo from there; end
  of the recording / last line = save (tapped times win, the rest keep the
  earlier ones). While play-along runs with timing, the words box scroll =
  `posAt(ytTime, times, line tops)` (guide at scrollTop since v1.0.259);
  the chart (PDF) view keeps the even pace. Cloud: column `charts.sync`
  (JSON text) = `supabase/migrations/013_lyrics_sync.sql` (THE USER RUNS
  IT) — its own select / update + `hasSync` fallback, so nothing else
  waits for it; pushed with the prefs debounce, pulled unless sending.
  Privacy page: title + artist go to LRCLIB through our server. Checked:
  pure test (match, a line added / removed, offset), 013 twice on local
  Postgres 16; Playwright fake YouTube (22 s) + mocked LRC with uneven
  gaps, 390 HE + 1180 EN: every line lit at its own second, tap-sync 6
  lines saved, the v1.0.257 PDF play-along test unchanged. LRCLIB itself
  NOT reachable from here — coverage (Hebrew songs!) unknown.
- v1.0.261 (the user ran 013): the first pull after the migration saw
  `charts.sync` = null for every row and ERASED the timings saved on the
  device before it. Now the server's null = never sent -> the device
  uploads its own timing; a deliberate Clear is sent as '' (syncText(null))
  and clears the others. Node test with a stub Supabase: null + local ->
  uploaded, '' -> cleared, a different server timing -> taken, same ->
  nothing. A timing already erased by v1.0.260: LRCLIB ones come back by
  themselves on the next play-along; tapped ones must be tapped again.- v1.0.262 (user: "suddenly the YouTube player doesn't open"): two
  causes. (1) The song page (••• Notes & recordings -> Start), the member
  page and the band page returned WITHOUT StageView's `dialogs` — so no
  ListenDock was mounted, `hasListenHost()` was false and the Performer
  showed no headphones key. Those three paths now render `{dialogs}` too.
  (2) The folded control bubble (device key `dudestar-stage-bar-mini`)
  had no headphones key: Performer `alongKey` is shared by the full bar
  and the folded bubble. Playwright 1180: song page -> Start -> key ->
  dock opens; folded bubble shows the key.
- v1.0.263 (user: "changing the song length doesn't change the scroll
  speed; when I move to another song the player stays on the old one"):
  (1) In play-along the chart's place = recording time / the SONG LENGTH
  (`durRef`, was the recording's length), so −/+ length changes the pace;
  the recording's length is taken only when the song has no length of
  its own (it used to overwrite the stepper on every report). (2) Next
  song: ListenDock sends `loadVideoById` with POSITIONAL args [id, start]
  (the object form may not pass over postMessage), reads the player's
  `videoData.video_id`, and if after 2.5 s the old video is still there it
  opens a fresh player with the new song (may need a tap on iOS); a cued
  / unstarted player gets `playVideo`. Fake player (postMessage) 1180:
  length 8 -> 30 s drops the place 0.32 -> 0.14; next song loads by id;
  a player that ignores the load -> fresh iframe /embed/<new id>. NOT
  verified with real YouTube / iOS.
- TRIADS ACROSS THE NECK (v1.0.264, 2026-11-27; user: "one chord on
  strings 1-3 in every position / inversion along the neck, then the next
  chord … then strings 2-4"; his answers: its own practice tool + a link
  from the course, note by note then strummed, cycle of fourths, major on
  every set first then minor). Pure `music/triadNeck.js`: `drillPath()` =
  96 items (major / minor x sets 321, 432, 543, 654 x roots C F B♭ E♭ A♭
  D♭ G♭ B E A D G), `neckShapes(root, quality, set)` = every root / 1st /
  2nd inversion placement up to fret 15 (triadShapes `placements`), sorted
  up the neck, notes spelled by the chord's usual key (`FLAT_ROOTS`),
  `sixFrets` + `rivalFrets` (3rd moved, a fret lower / higher) for the
  strum check. Practice tab `triadNeck` (chords group, icon path, levels
  1–3, featureCapabilities guitar) -> `components/TriadNeck/
  TriadNeckPanel.jsx`: card (eyebrow type · strings, big chord, "chord n
  of 12 · set s of 4", progress n of 96, Type / Strings / Chord pop-ups),
  the shapes as a row (dir ltr, now / ✓), Start opens BOTH listeners in
  the tap (usePitchDetection for each note, exact midi ±45 ¢ twice;
  useMicChordDetector + judgeShape for the strum, 2 passing windows),
  Hear (arpeggio + strum), Skip; done card "Next: F" / "Next: strings
  4–3–2". Neck (App `triadNeckStage`): the whole map resting, the current
  shape with the next note marked while running, degree labels. Progress
  per profile `dudestar-p-triad-neck` {done: {key: day}, pick}; perfLog
  tool 'triadNeck'. Theory -> Triads has a row "Across the neck" ->
  launch({tool:'triadNeck'}). Text `i18n/tips/triadneck.js`. Checks: pure
  — 96 items, 3–4 shapes each, every shape = its 3 chord tones ascending;
  fake mic (KS: G3 C4 E4 + strum) 1180 EN + 390 HE: shape 1 passed by
  notes + strum, shape 2's G4 not taken from G3, done card -> next = F.
  NOT verified with a real guitar.
- v1.0.265 (user: "in Band -> Songs let me add a song like Suggestions'
  '+ Suggest a song'"): the Songs list ends with a "+ Add a song" /
  "הוספת שיר" row (`.stg-add-row`, like Setlists' "+ New setlist"; hidden
  while searching) -> the new-song sheet (LyricsSheet: song search fills
  name + artist + link, words optional). A chart is attached afterwards
  from the song's ••• "Add chart"; the header Add / Link capsules stay for
  files. Playwright 1180: row -> sheet; no errors.
- v1.0.266 (user: "find a song like in Suggestions, add it for myself,
  then add a chart"): Band -> Songs' "+ Add a song" row opens a NEW SONG
  sheet (`SongInfoSheet isNew`: Cancel · New Song · Add): Song =
  SongSearchField (a pick fills artist, cover, listening link), Artist,
  Link, and an optional Chart field (PDF or photos -> imagesToPdf; × to
  clear); StageView `createSong` = addTextSong (words empty) +
  attachChart when a file was chosen, joins the open setlist. Words are
  still added later from the song's •••. Strings `stage.new.*`.
  Playwright (search mocked) 1180 + 390: search -> Yesterday / The
  Beatles / youtu.be link, PDF attached -> row with title + artist and
  the doc tile; no errors.
- v1.0.267 (user: "if I drag the chart back while playing along, the
  YouTube song should go on from where I stop"): play-along driver in
  Performer — while a finger / wheel holds the sheet the player keeps
  going and the chart stays where the reader puts it; when the hold ends
  (finger up + glide settled) the place becomes the song's time: chart
  (and words without timing) = scrollTop / span x song length; words with
  lyric timing = the start of the line nearest the reading line (the
  inverse of posAt); a move of >= 1 s -> `ytCommand('seekTo', [t, true])`
  + `reportYt({time})`, and for 1.5 s the chart follows our own clock
  from t (a stale player report can't pull it back). Pinch zoom (2
  fingers) never seeks; tap-sync mode untouched. Works backwards and
  forwards, playing or paused. Playwright fake YouTube (60 s) 1180 wheel
  + 390 CDP touch drag: at 8 s dragged to the top -> player at ~0.4 s and
  the chart goes on from there.
- v1.0.268 (user: "played along, left, went to another song — YouTube
  still played the previous song"): the reuse-the-same-player trick
  (loadVideoById over postMessage) can't be trusted on the real player.
  Now (1) only the automatic "Up next" countdown reuses the playing
  player (`autoNextRef`; no tap to give iOS then); a song the reader
  picks (Next / Previous, the setlist sheet, a swipe) opens a FRESH
  player with that song; (2) ListenDock's 2.5 s check treats a player
  that never reported the new video id as still on the old one -> fresh
  player; (3) leaving the Performer closes any play-along player
  (`listenNow().along`) and the Spotify / Apple Music player the stage
  itself opened (`startedRef`). A song played from the LIST's listen key
  keeps playing (the reader started it there). Playwright fake YouTube
  1180 + 390: Next -> Beta's iframe, Previous -> Alpha's, close -> no
  dock, another song opened -> no dock; v1.0.257 / 263 / 267 tests pass.
  NOT verified on the iPad (a fresh player may need one tap on iOS).
- v1.0.269 (user: "the triads-across-the-neck screen isn't clear — would
  Apple do it this way? and the Band's Add / Link / Words buttons aren't
  intuitive"). (1) TRIAD DRILL re-laid out in Apple's order (the old one
  led with four ways of saying "where am I" — eyebrow, "chord n of 12 ·
  set s of 4", bar, "n of 96" — plus three pickers, and pushed the live
  task + its keys under the neck on the iPad): a HERO card = the chord
  big + "Major · Strings 3–2–1" + the ONE action (filled Start / gray red
  Stop); "N shapes up the neck · tap one to start there" + the shapes as
  numbered STEP buttons (number -> green ✓ when done, accent while
  playing; tap = start / jump there — `start(from)`, `pickShape`); the
  TASK card (how-to, or "Shape i of n: pick the three notes, low to high"
  + note pills + "Next note" + Hear / Skip); at the foot "Practice" = an
  inset list of ControlRows (Type / Strings / Chord pop-ups) + the 96-step
  progress bar. Measured 1180x820 HE: the whole task incl. Hear / Skip is
  above the neck. Strings `tn.shapesTitle / notesNow / chooseTitle`, new
  `tn.how`. (2) BAND HEADER: the three capsules (Add = a file, Link,
  Words) are ONE round "+" (iOS add button, 44 pt, MoreMenu gained `icon`
  / `btnClass` / `disabled`) whose menu names each way in full, with
  glyphs: Find a Song… (New Song sheet) · New Setlist · ── · Import a PDF
  or Photo… · Import from a Link… · New Song from Words…; the Add-songs
  sheet's foot has the same "+" (without New Setlist); "Adding…" shows
  beside it while busy. Strings `stage.addMenu`, `stage.addm.*`.
  Playwright 1180 HE + 390 EN: every menu item opens its sheet / the file
  chooser; triad drill run (fake mic) still passes shape 1 -> done card
  -> Next F; no errors.
- v1.0.270: the lyrics-timing state in the Performer's song details read
  "Off" / "כבוי" — `stage.sync.off` was defined twice (timing + the old
  play-together select; the later one won). Timing now uses
  `stage.sync.notSet` ("Not synced" / "לא מסונכרן").
- v1.0.271 (user: "editing Hebrew words I need the whole text laid out
  right to left"): the words editor (LyricsSheet textarea) had dir="auto"
  + `unicode-bidi: plaintext` = each line its own direction, so a line
  starting with a chord / Latin word / a chord-only line sat on the left.
  Now ONE direction for the whole text (Pages / Notes): Hebrew anywhere in
  the text -> rtl, other text -> ltr, empty -> the app language; a key
  above the field (`.stg-ly-dir`, paragraph glyph + "Right to left" /
  "Left to right", 44 pt gray capsule) flips it by hand for this edit.
  The Performer's words view: a line holding Hebrew is dir="rtl" (was
  "auto" = a line opening with a Latin word went left). Strings
  `stage.ly.dir*`. Playwright 390 HE + 1180 EN: empty -> app dir, Hebrew
  -> rtl, toggle -> ltr; screenshot: every line right-aligned, [Am] before
  its Hebrew word.
- v1.0.272 (user, screenshots: the Performer's words view showed a
  Hebrew song's chords as a separate left-aligned row, not over their
  words as in the editor): `mergeChordLines` now also merges a bare
  chord line into the HEBREW line under it (`mergeIntoRtl`): both lines
  sit right-aligned in the RTL editor, so a chord's distance from the
  right edge = its column counted from the chord row's end, a Hebrew
  character's = its index; the chord goes before the word under its
  right edge (gap = the next word, past the end = the line's end). The
  Performer then draws them over their words, RTL. A chord row left on
  its own (an intro) sits on the reading side (`dir` of the view), the
  chords still reading left to right as in the editor. Latin merging and
  the Tab4u PDF path unchanged. Node check + Playwright 390 HE.
- v1.0.273 (user: "in Hebrew, right-align the headings — verse, chorus
  — too"): the Performer's words view takes its direction from the SONG,
  not the app language: any Hebrew in the words (or a label) = rtl, so
  section labels, stage notes and chord rows sit on the right even with
  the app in English. Playwright 390 EN app + Hebrew song: labels right.
- v1.0.274 (user: "make the verse / chorus headings the size of the
  song's text"): `.stage-w-label` font-size = `--w-size` (the lyric
  lines' size, follows the Size stepper / pinch), padding + radius in em
  so the orange pill scales with it.
- v1.0.275 (user: "put a colon after the headings"): the Performer's
  words view shows each section label with a trailing ":" ("בית:"),
  unless the label already ends with one.
- v1.0.276 (user: "left the chart, picked another song, pressed play —
  YouTube opened the PREVIOUS song"): listenStore numbered players with
  `n = (cur?.n ?? 0) + 1`, so after a close (cur = null) the next player
  was n = 1 again; ListenDock keeps the iframe address per `n`
  (`srcRef`), saw "the same player" and mounted the new iframe with the
  OLD song's address (the title showed the new song). Now a module
  counter `seq` that a close never resets; the dock also forgets the
  reported video id when a new player opens. Playwright (fake YouTube)
  1180 + 390: Alpha -> close -> Beta play = Beta, close -> Alpha play =
  Alpha (before: Alpha's title over Beta's video).
- MANAGER SETS PARTS + SINGER'S VIEW (v1.0.277; user: "let the band's
  manager set each member's instrument; for the singer, fit the chart to
  a singer's view"). (1) The member page's part checklist now also shows
  for the band's OWNER on any member ("Part in the band"; note "as the
  manager you set it; <name> sees it and can change it too"). Members
  still write only their own row; for others the owner calls rpc
  `set_member_role(b, u, r)` = NEW `supabase/migrations/
  014_member_role_by_manager.sql` (THE USER RUNS IT; security definer,
  owner of b only, u must be a member, only known parts, <= 120 chars).
  chartCloud `setMemberRoles(band, user, roles)` (own row -> setMyRoles;
  optimistic, reverts on error; PGRST202 / 42883 -> `managerRolesReady()`
  false = rows disabled + "needs 014" line). Checked on local Postgres
  16 twice: owner sets ✓, other band / non-member / junk part / plain
  member / anon all refused. (2) SINGER'S VIEW in the Performer: my parts
  in the song's band (all my bands for my own songs) = vocals and none of
  guitar / bass / keys -> the view choice is kept under its own device
  key `dudestar-stage-view-singer`, default WORDS (no chords); players
  keep `dudestar-stage-view` (default chart). So giving someone Vocals
  turns their Performer into the singer's view by itself; the details
  sheet says "Singer's view — you sing in this band…". (3) Words view:
  a song with no Hebrew reads LTR (labels too) even in the Hebrew app
  (an English song showed its label right, lines left). Playwright with
  a fake Supabase 1180 EN + 390 HE: vocals -> words, 0 chords; manager
  sets Dana = guitar via rpc; me vocals + guitar -> chords shown; no rpc
  -> toast, nothing saved.
- PLAY-ALONG TRANSPORT, the Apple way (v1.0.278; user, iPad screenshot
  of Practice -> Scales: "Demo and Start aren't the same size — design
  them as Apple would and fit the screen to our standards"). PlayAlong
  (Scales, Rhythm, piano Chord rhythm / Flow) + FreePlay: the round Demo
  key (44) and the red record circle (58) with labels UNDER them are gone.
  Now one row of library Buttons, all lg 50: Start = the ONE filled
  primary (PlayGlyph; running = gray danger Stop + new `StopGlyph` in
  ui/controls), Demo = gray (speaker glyph; Stop while demoing), Speed =
  gray (was a tinted capsule 36). Settings on their own row: the tempo
  stepper + "Adaptive" label + ui `Switch` at its end (was the old
  lt-switch checkbox before the label). The idle instruction is plain
  secondary text (the gray box stays only for live states: demo / count
  / your turn / free-play hits). Phones: Start takes the row, Demo +
  Speed share the next. Scales' position stepper = gray fill + accent
  chevrons (was a white card among gray controls). PlayAlong root dir =
  the language (was "auto"). Playwright 1180 HE + 390 EN: keys 50 high,
  Demo -> Stop / Start + Speed disabled, Free mode Start 50.
- MORE BAND PARTS (v1.0.279; user: "instead of Other, a + to add more
  parts — a list and/or free text"): the member page's part list = the
  base five (Vocals, Guitar, Bass, Drums, Keys) + any other part the
  member has, then an accent "+ Add Part…" row (iOS Contacts' add-label
  pattern) -> `AddRoleSheet` (StageView): a field that filters the other
  usual parts (`EXTRA_ROLES` in chartCloud: backing vocals, lead /
  acoustic guitar, percussion, sax, trumpet, trombone, winds, violin,
  cello, flute, harmonica, accordion, ukulele, mandolin, DJ / samples,
  sound engineer; 'other' kept for old rows only) and, when the typed
  words aren't a part already, a last row "Add "<words>"" = a part of its
  own, stored as "~Words" (no commas, <= 30 chars; Enter adds). Unchecking
  an extra / custom part removes its row. `cleanRoles()` (chartCloud) =
  known keys + "~" tokens, no repeats, <= 300 chars; `roleLabel()` shows a
  custom part as typed. NEW `supabase/migrations/015_more_member_roles.sql`
  (THE USER RUNS IT): role length 120 -> 300 (constraint
  band_members_role_check) + set_member_role accepts the new keys and "~"
  tokens. Before it: the manager's rpc refuses a new part (22023) ->
  `moreRolesReady()` false -> the footnote asks for 015 (own parts work
  within 120 chars). Singer view: backing vocals sings; lead / acoustic /
  ukulele / mandolin / accordion count as chord players. Checked: 015 on
  local Postgres 16 twice (new parts + custom ok, junk / "~" / long
  refused, own 250 ok, 301 refused); Playwright fake Supabase 1180 EN +
  390 HE: filter "sax" -> Saxophone, "Theremin" -> custom, saved via rpc,
  uncheck removes the row, member subtitle shows the parts.
- SIGNED OUT FOR NOTHING (v1.0.280; user: hillihaber@… has to sign in by
  email again every time): the access token lasts 1 h; opening the app
  later, auth-js refreshes it at boot. When that refresh fails ONLY for
  the network (an iPhone app waking up, a weak line) auth-js KEEPS the
  session in storage but getSession() returns null — and boot() then set
  status 'signedOut' = "sign in again". Now boot checks `keptSession()`
  (the stored session with its refresh token is still there — auth-js
  removes it on a real refusal): status 'offline' (Settings: "Still signed
  in — no connection right now…", `cloud.offline`) and `retryResume()`
  tries again on 'online', on return to the app and every 20 s -> 2 min;
  the Sync key retries at once. Truly refused = storage empty = signed out
  as before. Playwright fake Supabase: expired session + aborted refresh ->
  session kept, 'online' -> refreshed (r1 -> r2) and synced. Dashboard
  logs NOT checked (needs the user's Supabase sign-in).
- TAP A CHORD -> ITS PICTURE (v1.0.281; user: "a tap on a chord in the
  chart opens it — guitar for a guitarist, piano for a pianist…"). Every
  chord in the Performer is a button (`data-chord`, role button, Enter /
  Space): the words + chords view (over words and in chord rows) and the
  chords found in a text PDF (`.stage-chords` now always rendered; in the
  original key an invisible `.stage-chord.is-hit` over the PDF's own
  chord). A chord tap never toggles the controls. Pure
  `music/sheets/chordView.js`: `parseChartChord()` (as written: ♯/♭,
  (add9), 7(#9), ø, °, Δ, 6/9, slash bass; unknown colour = the longest
  known start, e.g. Cadd11 -> C) -> {rootPc, typeKey (Chord Library),
  bassPc}; `guitarShapes` (libraryVoicings, standard tuning, open first,
  easiest index), `pianoShapes` (close voicing + inversions; slash = one),
  `bassShapes` (root on E: R-5-8 + the 3rd above the octave; root on A:
  R-5-8; slash = the bass note + its octave; lower one first).
  `Stage/ChordPop.jsx`: Liquid Glass popover beside the chord (>= 600 px;
  a card just above the control bubble on phones): name + its notes, ×,
  Segmented Guitar | Piano | Bass, the shape on a white tile (ChordBox /
  KeysBox; left-handed respected; tap = hear — guitar strum, piano chord,
  bass note by note), ‹ › + "n / N" (arrow keys too), outside tap /
  Escape closes (without toggling the controls / closing the Performer).
  Shows the TRANSPOSED chord when Key is moved. Instrument = the choice
  made here before (device key `dudestar-stage-chord-inst`), else my part
  in the song's band (keys / accordion -> piano, bass -> bass, guitar
  parts -> guitar, a singer -> piano = the notes), else the app's
  instrument. Playwright 390 HE + 1180 EN: 11 chord buttons, pop + next +
  piano + bass + another chord + outside / Escape; a reportlab text PDF:
  5 chord buttons, Am opens. Sound not judged by ear (samples blocked).
- v1.0.282 (user: "open the chord picture without the sample playing?"
  -> Claude: silent by default, no setting): the Performer's ChordPop
  makes NO sound on open, on Guitar | Piano | Bass or on ‹ › — only a
  tap on the shape plays it (on stage / with YouTube a sound must never
  start by itself). The Chord Library keeps its own auto-play toggle.
  Playwright 390 HE (sound starts counted): open 0, next + switch 0,
  tap the shape 3.
- WORDS FROM A TEXT PDF, AUTOMATICALLY (v1.0.283; user: "recognise the
  text + chords of an uploaded PDF chart and put them in the words
  editor"; Claude: text PDFs now, OCR for scans / photos = a later
  decision — Tesseract (weak on Hebrew / chords) vs AI vision (needs an
  API key + cost)). Pure-ish `music/sheets/pdfWords.js` `pdfWords(blob,
  {song})` = pdf.js text -> `pdfLines()` per page (the Tab4u / Hebrew
  chord merging of v1.0.252), pages split by a blank line; `song: true`
  = only when >= 3 lines hold words, else ''. chartCloud `takeWords()`
  runs in `addCharts` (every Band add: files, photos, links; `{words}`
  option, shareChart passes false when the source has words) and
  `attachChart`, only when the song has no words yet — the words are
  written BEFORE the sync, so the cloud row carries them. The PDF stays;
  the Performer offers Chart | Words | Words + chords, the editor (•••
  Edit words) has them to fix. StageView toast `stage.wordsTaken` /
  `stage.wordsTakenN` (k of n). LyricsSheet's PDF tab uses pdfWords too.
  Playwright 390 HE + 1180 EN: a reportlab text chart + an empty "scan"
  -> words on the first only, toast "1 of 2", Words + chords view = Am /
  G / F over their words, 5 chord buttons. No OCR yet.
- v1.0.284 (user: a Tab4u PDF gave "No text in this PDF"): his file was
  printed with "Microsoft Print to PDF" (pdffonts: no fonts at all) —
  Windows' printer draws every letter as vector SHAPES, so the page looks
  like text but holds none (same as a scan; the Key stepper can't move it
  either). The PDF printed from Chrome / Edge's own "Save as PDF" keeps
  the text (the v1.0.252 Tab4u file). `stage.ly.pdfNone` now says this and
  what to do (print again with "Save as PDF", or type). Real fix for such
  files = OCR (open decision).
- v1.0.285 (user: "a song that already has a PDF — its file can't be
  replaced"): the song's ••• (Songs rows + setlist rows) now always has
  the chart item: "Add chart (PDF / photo)" for a words-only song,
  "Replace chart (PDF / photo)" / "החלפת צ׳ארט" when it has one. Same
  record = name, words, notes, takes, setlists, key / length kept;
  the sideways place (`panX`) is reset; words are taken from the new PDF
  only when the song has none. Cloud: a replaced chart gets a NEW file
  name (`<id>.<ver>.pdf`, record `ver`; pathFor), the old file is removed
  after the new one is up (`oldPath`), and sync step 2 re-downloads when
  a cloud row's path differs from the local one — so the band / other
  devices get the new chart. Toast "Chart replaced — the words, notes and
  setlists stay". Playwright 1180: 193 B PDF -> 3-page PDF, Performer
  shows 3 pages; stub-client sync test: path change -> download.
- v1.0.286 (user: "the ••• menu always opens downward, even on the last
  song of a list — I have to scroll to see it all"): MoreMenu (every •••
  in the app) measures before showing: the room below vs above the button
  inside its visible band (`visibleBand()`: the nearest scrolling box,
  above the floating tab bar / Performer bubble); not enough below and
  more above -> `.more-menu-pop.is-up` (opens upward, own entry
  animation); even the larger side too short -> `cap()` = max-height +
  scroll inside the menu. Playwright Band -> Songs (9 songs): 390 last row
  opens up (119–610 of 760), first row down; 1180 the same.
- v1.0.287 (user: "a song found by the search saves with its picture,
  but when I change its details — e.g. the band's name — the picture is
  gone"): the cover was looked up by the NAME ("Title – Artist") only, so
  an edited artist found nothing. Now a song KEEPS its cover: sheet pref
  `art` (synced with the profile's prefs; copied by shareChart / Add to
  My Songs), set by the New Song sheet (createSong) and by Song Details;
  SongInfoSheet holds `art` (= the song's kept cover or the cached one of
  its old name), shows it while you edit, a new pick from the search
  replaces it, Save writes it. `SongArt` takes `id` (prefs art first, then
  the name lookup) or `url`; songArt.js `cachedArt()` (no lookup). Rows,
  setlist rows, the add-songs sheet and the song page pass the id.
  Playwright 1180 (search + image mocked): pick Yesterday -> cover, edit
  artist to "הביטלס" -> cover stays in the sheet, the row and after reload.
- STABILITY PASS (v1.0.288, 2026-11-28; user asked "what's missing?",
  then "all" of: server check, device checklist, tests + bundle split,
  error log). (1) SERVER CHECK: Settings › Advanced › Server
  (`SettingsPanel/ServerCheck.jsx` + pure-ish `cloud/serverCheck.js`):
  when signed in it probes every migration with harmless reads (empty
  select of the table / column it adds, a storage bucket listing, rpc
  set_member_role with nil ids = 42501 if present / PGRST202 if not),
  10 s timeout = offline; green "Up to date" or the missing ones by
  number + what each opens (`srv.m.<n>`) + the file name + how to run.
  015 can't be probed without writing, so NEW `016_schema_version.sql`
  repeats 015 and adds `public.dudestar_schema()` (returns 16) — THE USER
  RUNS IT; every later migration bumps that number and gets a SCRIPTS
  entry. (2) ERROR LOG: `debug/errorLog.js` (device key
  `dudestar-error-log`, last 40, repeats within a minute folded,
  browser noise ignored; installed first thing in main.jsx: window error +
  unhandledrejection) + `debug/ErrorBoundary.jsx` around Root (a screen
  that throws = an iOS-style "Something went wrong" page with Reload +
  Send report instead of a blank page) + Settings › Advanced › "Errors on
  this device" (count, last time, Share = system share / copy as text,
  Clear). Nothing is sent anywhere by itself. (3) BUNDLE: vite.config.js
  `build.rolldownOptions.output.codeSplitting.groups` = lib-alphatab /
  lib-pdfjs / lib-react / lib-audio chunks (a deploy re-downloads only the
  app's code; lazy libs supabase / lamejs deliberately NOT grouped), and
  vexflow (1.1 MB) loads only when a notation draws
  (`StaffNotation/vexflow.js` `useVexflow()`, used by StaffNotation,
  GuitarNotation, LickNotation). Main chunk 5.66 MB -> 2.72 MB; first load
  4.5 MB total. (4) SMOKE TEST: `scripts/smoke-test.cjs` (`npm run
  test:smoke`, needs the preview on :4187 + global Playwright) opens every
  home card x every shortcut at 390 HE + 1180 EN, fails on page errors,
  blank screens or the error page — 7 cards / 28 screens each, 0
  problems. Run it before pushes. Checks: 016 twice on local Postgres;
  fake Supabase: 4 missing shown (009 bucket, 012, 013, 016), all present
  = green, offline = "couldn't reach" after 10 s; error log 3 entries ->
  Clear; piano Theory staff renders with vexflow fetched on demand.
- GUITARPRO FILES IN THE ACCOUNT (v1.0.289; user: "why is sync between
  devices off?" — it was the OLD shared library (api/library.js + Vercel
  Blob + a DUDESTAR_KEY typed per device), not the account sync; Claude
  recommended folding it into the account, user: "yes"). NEW
  `supabase/migrations/017_gp_imports.sql` (THE USER RUNS IT; bumps
  `dudestar_schema()` to 17): table `gp_imports` (user_id + grp pk, name,
  records jsonb = the import's records without the file, path, size,
  deleted sticky; owner forced to auth.uid(); RLS own rows only; anon
  none) + private bucket `gp` (<uid>/<group>.bin, 30 MB, own folder only).
  Pure-ish `music/lickTrainer/accountLibrary.js`: `syncAccountLibrary`
  (local records flagged `acct`; remote tombstone / vanished + acct =
  deleted elsewhere -> dropped; local unflagged = uploaded; remote not
  here = records + file downloaded), `uploadToAccount`,
  `deleteFromAccount` (tombstone + file removed). useLickTrainer: status
  off (signed out) / syncing / ok / offline / setup (017 missing) /
  error; syncs at start, on return to the app and when a sign-in lands
  (subscribeCloud); a device that still has the old DUDESTAR_KEY pulls
  the old library once more (cloudLibrary.syncLibrary), its files go up
  to the account, then the key is cleared. The Settings "Sync between
  devices" block (LibraryBar) is GONE; GuitarPro shows one line only on a
  problem (`gp.syncProblem` / `gp.syncSetup`). Server check lists 017.
  api/library.js stays for that one-time move. Privacy page updated
  (28 Nov). Checks: 017 twice on local Postgres + RLS (owner forced,
  another user sees / changes nothing, deleted sticky, anon denied);
  Playwright fake Supabase: A imports November Rain -> row + file, B (same
  account) gets it in its file list, A deletes -> tombstone + file gone,
  B drops it; old-key device -> the old library's file upserted to the
  account and the key cleared; 017 missing -> the setup line; smoke test
  28 + 28 screens, 0 problems.
