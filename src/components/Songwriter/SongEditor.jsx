import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { BpmField } from '../Metronome/BpmField';
import { parseLine, splitRaw, joinRaw, replaceText, setChordOnWord, syllables, rhymeScheme } from '../../music/songwriter/lyrics';
import {
  SECTION_KINDS,
  TIMES,
  beatsPerBar,
  chordMidis,
  diatonicChords,
  fitToSyllables,
  keyName,
  newLine,
  newSection,
  songChords,
  transposeSong,
  uid,
} from '../../music/songwriter/song';
import { transcribe } from '../../music/songwriter/transcribe';
import { songToMusicXML } from '../../music/songwriter/musicxml';
import { deleteAudio } from '../../audio/songwriter/songAudioStore';
import { schedulePianoNotes } from '../../audio/pianoPlayer';
import { LyricLine } from './LyricLine';
import { ChordPicker } from './ChordPicker';
import { MelodyEditor } from './MelodyEditor';
import { ScoreView } from './ScoreView';
import { Takes } from './Takes';
import { Icon } from './icons';
import { gridFor, laneFor, scalePcs, validChord } from './swHelpers';
import '../ModeToggle/ModeToggle.css';

const CLICKS = ['count', 'all', 'off'];

export function SongEditor({ song, update, onBack, onDelete, audio, toast }) {
  const { t, lang } = useLanguage();
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  const [view, setView] = useState('write');
  const [selected, setSelected] = useState(null); // line id
  const [editing, setEditing] = useState(null); // { id, caret }
  const [picker, setPicker] = useState(null); // { sec, line, word, rect }
  const [melodyFor, setMelodyFor] = useState(null); // { sec, line }
  const [takesFor, setTakesFor] = useState(null); // line id
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [finding, setFinding] = useState(null); // line id while notes are being found

  const set = useCallback((fn) => update(song.id, fn), [update, song.id]);
  const bpb = beatsPerBar(song.time);

  // ---- lines / sections ----
  const mapLine = useCallback(
    (secId, lineId, fn) =>
      set((s) => ({
        ...s,
        sections: s.sections.map((sec) => (sec.id !== secId ? sec : { ...sec, lines: sec.lines.map((l) => (l.id === lineId ? fn(l) : l)) })),
      })),
    [set]
  );
  const mapSection = useCallback((secId, fn) => set((s) => ({ ...s, sections: s.sections.map((sec) => (sec.id === secId ? fn(sec) : sec)) })), [set]);

  const allLines = useMemo(() => song.sections.flatMap((sec) => sec.lines.map((l) => ({ sec: sec.id, line: l }))), [song.sections]);
  const findLine = (id) => allLines.find((x) => x.line.id === id);

  const onEnter = (secId, line, caret) => {
    const [a, b] = splitRaw(line.raw, caret);
    const nl = newLine(b);
    mapSection(secId, (sec) => {
      const i = sec.lines.findIndex((l) => l.id === line.id);
      const lines = [...sec.lines];
      lines[i] = { ...line, raw: a };
      lines.splice(i + 1, 0, nl);
      return { ...sec, lines };
    });
    setSelected(nl.id);
    setEditing({ id: nl.id, caret: 0 });
  };

  const onJoinUp = (secId, line) => {
    const sec = song.sections.find((s) => s.id === secId);
    const i = sec.lines.findIndex((l) => l.id === line.id);
    if (i <= 0) return;
    const prev = sec.lines[i - 1];
    const prevLen = parseLine(prev.raw).text.length;
    const keepTakes = [...(prev.takes ?? []), ...(line.takes ?? [])];
    mapSection(secId, (s) => {
      const lines = s.lines.filter((l) => l.id !== line.id).map((l) => (l.id === prev.id ? { ...l, raw: joinRaw(l.raw, line.raw), takes: keepTakes, melody: l.melody ?? line.melody } : l));
      return { ...s, lines };
    });
    setSelected(prev.id);
    setEditing({ id: prev.id, caret: prevLen });
  };

  const onMoveFocus = (lineId, delta) => {
    const i = allLines.findIndex((x) => x.line.id === lineId);
    const target = allLines[i + delta];
    if (!target) return;
    setSelected(target.line.id);
    setEditing({ id: target.line.id, caret: null });
  };

  const onPasteLines = (secId, line, pasted, caret) => {
    const { text } = parseLine(line.raw);
    const blocks = pasted.replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.split('\n').map((x) => x.trim()).filter(Boolean)).filter((b) => b.length);
    if (!blocks.length) return;
    const head = text.slice(0, caret);
    const tail = text.slice(caret);
    set((s) => {
      const sections = [];
      for (const sec of s.sections) {
        if (sec.id !== secId) {
          sections.push(sec);
          continue;
        }
        const i = sec.lines.findIndex((l) => l.id === line.id);
        const before = sec.lines.slice(0, i);
        const after = sec.lines.slice(i + 1);
        const first = blocks[0];
        const firstLines = first.map((x, k) => (k === 0 ? { ...line, raw: replaceText(line.raw, head + x) } : newLine(x)));
        if (blocks.length === 1) {
          const last = firstLines[firstLines.length - 1];
          firstLines[firstLines.length - 1] = { ...last, raw: replaceText(last.raw, parseLine(last.raw).text + tail) };
          sections.push({ ...sec, lines: [...before, ...firstLines, ...after] });
          continue;
        }
        sections.push({ ...sec, lines: [...before, ...firstLines] });
        // Each further block (after an empty line) is a section of its own.
        blocks.slice(1).forEach((b, k) => {
          const lines = b.map((x) => newLine(x));
          const isLast = k === blocks.length - 2;
          if (isLast && (after.length || tail)) {
            if (tail) lines[lines.length - 1] = newLine(b[b.length - 1] + tail);
            lines.push(...after);
          }
          sections.push({ id: uid('s'), kind: k % 2 === 0 ? 'chorus' : 'verse', lines });
        });
      }
      // A paste that made sections of its own fills the empty ones after it
      // (a new song's empty Chorus) instead of leaving them behind.
      const isEmpty = (x) => x.lines.every((l) => !parseLine(l.raw).text.trim() && !l.takes?.length && !l.melody);
      const made = blocks.length > 1;
      return { ...s, sections: made ? sections.filter((x) => x.id === secId || !isEmpty(x)) : sections };
    });
    setEditing(null);
  };

  const removeLineAudio = (lines) => deleteAudio(lines.flatMap((l) => (l.takes ?? []).map((x) => x.id)));

  // ---- chords ----
  const pick = (symbol) => {
    if (!picker) return;
    mapLine(picker.sec, picker.line, (l) => ({ ...l, raw: setChordOnWord(l.raw, picker.word, symbol) }));
    if (symbol) {
      const ms = chordMidis(symbol);
      if (ms) schedulePianoNotes(ms.map((m, i) => ({ midi: m, start: i * 0.015, dur: 0.9 })), undefined, { velocity: 70 });
    }
    setPicker(null);
  };

  // ---- recording ----
  const stopRecording = async (secId, lineId) => {
    const out = await audio.stopRec({ bpm: song.bpm, time: song.time });
    if (!out) return;
    const { take, audio: a } = out;
    mapLine(secId, lineId, (l) => ({ ...l, takes: [...(l.takes ?? []), take] }));
    setFinding(lineId);
    setTimeout(() => {
      findNotes(secId, lineId, take, a);
      setFinding(null);
    }, 30);
  };

  const findNotes = (secId, lineId, take, a) => {
    let res;
    try {
      res = transcribe({
        samples: a.samples,
        sampleRate: a.sampleRate,
        bpm: take.bpm ?? song.bpm,
        beatsPerBar: beatsPerBar(take.time ?? song.time),
        grid: gridFor(song),
        downbeat: a.downbeat ?? take.downbeat ?? null,
        clicks: a.clicks ?? [],
      });
    } catch {
      toast({ text: t('sw.notes.none') });
      return;
    }
    if (!res.notes.length) {
      toast({ text: t('sw.notes.none') });
      return;
    }
    let before = null;
    mapLine(secId, lineId, (l) => {
      before = l.melody ?? null;
      const syl = syllables(parseLine(l.raw).text, l.syl).length;
      const notes = syl ? fitToSyllables(res.notes, syl, res.attacks) : res.notes;
      return { ...l, melody: { notes, from: take.id } };
    });
    toast({
      text: t('sw.notes.found', { n: res.notes.length }),
      action: t('sw.undo'),
      onAction: () => mapLine(secId, lineId, (l) => ({ ...l, melody: before ?? undefined })),
    });
  };

  const notesFromTake = async (secId, lineId, take) => {
    setFinding(lineId);
    const a = await audio.loadTakeSamples(take.id);
    if (!a) {
      setFinding(null);
      toast({ text: t('sw.take.missing') });
      return;
    }
    setTimeout(() => {
      findNotes(secId, lineId, take, { ...a, downbeat: take.downbeat ?? null, clicks: [] });
      setFinding(null);
    }, 30);
  };

  // ---- key ----
  const changeKey = (value) => {
    if (!value) {
      set((s) => ({ ...s, key: null }));
      return;
    }
    const [pc, m] = value.split(':');
    const key = { pc: Number(pc), minor: m === 'm' };
    if (!song.key || song.key.minor !== key.minor) {
      // Naming the key (or switching major/minor): nothing moves.
      set((s) => ({ ...s, key }));
      return;
    }
    let semis = (key.pc - song.key.pc + 12) % 12;
    if (semis > 6) semis -= 12;
    set((s) => transposeSong(s, semis, key));
    toast({ text: t('sw.transposed', { key: keyName(key) }) });
  };

  // ---- playback ----
  const tl = audio.playing?.handle.timeline;
  const activeLine = tl && audio.pos != null ? tl.lines.find((l) => audio.pos >= l.start && audio.pos < l.end) : null;
  const spb = 60 / song.bpm;
  const lastActive = useRef(null);
  useEffect(() => {
    if (!activeLine || activeLine.id === lastActive.current) return;
    lastActive.current = activeLine.id;
    document.querySelector(`[data-line="${activeLine.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeLine]);

  const xml = useMemo(
    () => (view === 'score' ? songToMusicXML(song, { screen: true, title: song.title || t('sw.untitled'), labels: Object.fromEntries(SECTION_KINDS.map((k) => [k, t('sw.kind.' + k)])) }) : ''),
    [view, song, t]
  );

  const exportXml = () => {
    const x = songToMusicXML(song, { title: song.title || t('sw.untitled'), labels: Object.fromEntries(SECTION_KINDS.map((k) => [k, t('sw.kind.' + k)])) });
    const blob = new Blob([x], { type: 'application/vnd.recordare.musicxml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(song.title || t('sw.untitled')).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'song'}.musicxml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const diatonic = diatonicChords(song.key);
  const used = songChords(song);
  const inKey = scalePcs(song.key);
  const kindCount = {};

  const melodyTarget = melodyFor ? findLine(melodyFor.line) : null;

  return (
    <div className="sw-editor" dir={dir}>
      <div className="sw-editor-top">
        <button type="button" className="sw-back" onClick={onBack}>
          <Icon name="back" />
          <span>{t('sw.nav.songs')}</span>
        </button>
        <div className="mode-toggle sw-view-toggle" role="group" aria-label={t('sw.view')}>
          {['write', 'score'].map((v) => (
            <button key={v} type="button" className={view === v ? 'active' : ''} onClick={() => setView(v)}>
              {t('sw.view.' + v)}
            </button>
          ))}
        </div>
      </div>

      <input
        className="sw-title"
        dir="auto"
        value={song.title}
        placeholder={t('sw.untitled')}
        onChange={(e) => set((s) => ({ ...s, title: e.target.value }))}
        aria-label={t('sw.titleLabel')}
      />

      <div className="sw-meta">
        <label className="sw-field">
          <span>{t('sw.key')}</span>
          <select value={song.key ? `${song.key.pc}:${song.key.minor ? 'm' : ''}` : ''} onChange={(e) => changeKey(e.target.value)}>
            <option value="">—</option>
            <optgroup label={t('sw.key.major')}>
              {Array.from({ length: 12 }, (_, pc) => (
                <option key={'M' + pc} value={`${pc}:`}>
                  {keyName({ pc, minor: false })}
                </option>
              ))}
            </optgroup>
            <optgroup label={t('sw.key.minor')}>
              {Array.from({ length: 12 }, (_, pc) => (
                <option key={'m' + pc} value={`${pc}:m`}>
                  {keyName({ pc, minor: true })}
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        <div className="sw-field">
          <span>{t('sw.tempo')}</span>
          <BpmField
            value={song.bpm}
            onChange={(v) => set((s) => ({ ...s, bpm: Math.max(40, Math.min(220, Math.round(v))) }))}
            min={40}
            max={220}
            className="sw-bpm"
            labels={{ down: t('piano.metronome.tempoDown'), up: t('piano.metronome.tempoUp'), value: t('metronome.bpm'), edit: t('piano.metronome.editHint') }}
          />
        </div>
        <label className="sw-field">
          <span>{t('sw.time')}</span>
          <select value={song.time} onChange={(e) => set((s) => ({ ...s, time: e.target.value, grid: undefined }))}>
            {TIMES.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="sw-field">
          <span>{t('sw.click')}</span>
          <select value={song.click ?? 'count'} onChange={(e) => set((s) => ({ ...s, click: e.target.value }))}>
            {CLICKS.map((c) => (
              <option key={c} value={c}>
                {t('sw.click.' + c)}
              </option>
            ))}
          </select>
        </label>
        <div className="sw-field sw-transport">
          <span>&nbsp;</span>
          <button
            type="button"
            className={'sw-btn is-primary' + (audio.playing?.scope === 'song' ? ' is-on' : '')}
            onClick={() => audio.play(song, 'song')}
          >
            <Icon name={audio.playing?.scope === 'song' ? 'stop' : 'play'} />
            {audio.playing?.scope === 'song' ? t('sw.stop') : t('sw.play')}
          </button>
        </div>
      </div>

      {view === 'score' ? (
        <ScoreView xml={xml} />
      ) : (
        <div className="sw-sections">
          {song.sections.map((sec, si) => {
            kindCount[sec.kind] = (kindCount[sec.kind] ?? 0) + 1;
            const n = kindCount[sec.kind];
            const texts = sec.lines.map((l) => parseLine(l.raw).text);
            const scheme = rhymeScheme(texts);
            return (
              <section key={sec.id} className="sw-section">
                <header className="sw-section-head">
                  <select
                    className="sw-kind"
                    value={sec.kind}
                    onChange={(e) => mapSection(sec.id, (x) => ({ ...x, kind: e.target.value }))}
                    aria-label={t('sw.section')}
                  >
                    {SECTION_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {t('sw.kind.' + k)}
                      </option>
                    ))}
                  </select>
                  {song.sections.filter((x) => x.kind === sec.kind).length > 1 && <span className="sw-kind-n">{n}</span>}
                  <span className="sw-section-tools">
                    <button
                      type="button"
                      className={'sw-icon-btn' + (audio.playing?.scope === 'sec:' + sec.id ? ' is-on' : '')}
                      onClick={() => audio.play(song, 'sec:' + sec.id, { section: sec.id })}
                      aria-label={t('sw.play')}
                      title={t('sw.play')}
                    >
                      <Icon name={audio.playing?.scope === 'sec:' + sec.id ? 'stop' : 'play'} />
                    </button>
                    <button
                      type="button"
                      className="sw-icon-btn"
                      onClick={() =>
                        set((s) => {
                          const i = s.sections.findIndex((x) => x.id === sec.id);
                          const copy = { ...sec, id: uid('s'), lines: sec.lines.map((l) => ({ ...l, id: uid('l'), takes: [] })) };
                          const sections = [...s.sections];
                          sections.splice(i + 1, 0, copy);
                          return { ...s, sections };
                        })
                      }
                      aria-label={t('sw.section.copy')}
                      title={t('sw.section.copy')}
                    >
                      <Icon name="copy" />
                    </button>
                    <button
                      type="button"
                      className="sw-icon-btn"
                      disabled={si === 0}
                      onClick={() =>
                        set((s) => {
                          const sections = [...s.sections];
                          [sections[si - 1], sections[si]] = [sections[si], sections[si - 1]];
                          return { ...s, sections };
                        })
                      }
                      aria-label={t('sw.section.up')}
                      title={t('sw.section.up')}
                    >
                      <Icon name="up" />
                    </button>
                    <button
                      type="button"
                      className="sw-icon-btn"
                      disabled={si === song.sections.length - 1}
                      onClick={() =>
                        set((s) => {
                          const sections = [...s.sections];
                          [sections[si + 1], sections[si]] = [sections[si], sections[si + 1]];
                          return { ...s, sections };
                        })
                      }
                      aria-label={t('sw.section.down')}
                      title={t('sw.section.down')}
                    >
                      <Icon name="down" />
                    </button>
                    <button
                      type="button"
                      className="sw-icon-btn is-danger"
                      onClick={() => {
                        const removed = sec;
                        const idx = si;
                        set((s) => ({ ...s, sections: s.sections.filter((x) => x.id !== sec.id) }));
                        let undone = false;
                        toast({
                          text: t('sw.section.deleted'),
                          action: t('sw.undo'),
                          onAction: () => {
                            undone = true;
                            set((s) => {
                              const sections = [...s.sections];
                              sections.splice(idx, 0, removed);
                              return { ...s, sections };
                            });
                          },
                          onExpire: () => !undone && removeLineAudio(removed.lines),
                        });
                      }}
                      aria-label={t('sw.section.delete')}
                      title={t('sw.section.delete')}
                    >
                      <Icon name="trash" />
                    </button>
                  </span>
                </header>

                {sec.lines.map((line, li) => {
                  const { text } = parseLine(line.raw);
                  const syl = syllables(text, line.syl);
                  const hasMelody = !!line.melody?.notes?.length;
                  const lane = hasMelody ? laneFor(song, line) : null;
                  const isPlayingLine = activeLine?.id === line.id;
                  const playBeat = isPlayingLine ? (audio.pos - activeLine.downbeat) / spb : null;
                  const recording = audio.rec?.target?.line === line.id ? audio.rec : finding === line.id ? { phase: 'saving' } : null;
                  return (
                    <LyricLine
                      key={line.id}
                      line={line}
                      selected={selected === line.id}
                      editing={editing?.id === line.id}
                      caret={editing?.id === line.id ? editing.caret : null}
                      sylCount={syl.length}
                      rhyme={sec.lines.length > 1 ? { letter: scheme.letters[li], rhymes: scheme.rhymes[li] } : null}
                      laneProps={lane ? { ...lane, playBeat, inKey } : null}
                      hasMelody={hasMelody}
                      playing={isPlayingLine || audio.playing?.scope === 'line:' + line.id}
                      recording={recording}
                      recTick={audio.tick}
                      placeholder={li === 0 && !text ? t('sw.line.placeholder') : t('sw.line.more')}
                      onSelect={() => setSelected(line.id)}
                      onEdit={(caret) => (caret == null ? setEditing((e) => (e?.id === line.id ? null : e)) : setEditing({ id: line.id, caret }))}
                      onText={(v) => mapLine(sec.id, line.id, (l) => ({ ...l, raw: replaceText(l.raw, v) }))}
                      onEnter={(caret) => onEnter(sec.id, line, caret)}
                      onJoinUp={() => {
                        if (!text && sec.lines.length > 1 && !line.takes?.length && !hasMelody) {
                          // An empty line: remove it, back to the end of the one above.
                          const prev = sec.lines[li - 1];
                          if (!prev) return;
                          mapSection(sec.id, (s) => ({ ...s, lines: s.lines.filter((l) => l.id !== line.id) }));
                          setSelected(prev.id);
                          setEditing({ id: prev.id, caret: null });
                          return;
                        }
                        onJoinUp(sec.id, line);
                      }}
                      onMove={(d) => onMoveFocus(line.id, d)}
                      onPaste={(s, caret) => onPasteLines(sec.id, line, s, caret)}
                      onChordAt={(word, rect) => {
                        setSelected(line.id);
                        setPicker({ sec: sec.id, line: line.id, word, rect });
                      }}
                      onRecord={() => audio.startRec({ sec: sec.id, line: line.id }, { bpm: song.bpm, beatsPerBar: bpb, click: song.click ?? 'count' })}
                      onStopRec={() => (audio.rec?.phase === 'rec' ? stopRecording(sec.id, line.id) : audio.cancelRec())}
                      onPlay={() => audio.play(song, 'line:' + line.id, { line: line.id })}
                      onMelody={() => setMelodyFor({ sec: sec.id, line: line.id })}
                      onTakes={() => setTakesFor((x) => (x === line.id ? null : line.id))}
                      takesOpen={takesFor === line.id}
                      takesSlot={
                        <Takes
                          takes={line.takes ?? []}
                          melodyFrom={line.melody?.from}
                          audio={audio}
                          onNotes={(take) => notesFromTake(sec.id, line.id, take)}
                          onDelete={(take) => {
                            mapLine(sec.id, line.id, (l) => ({ ...l, takes: (l.takes ?? []).filter((x) => x.id !== take.id) }));
                            deleteAudio(take.id);
                          }}
                        />
                      }
                    />
                  );
                })}
                <button
                  type="button"
                  className="sw-add-line"
                  onClick={() => {
                    const nl = newLine();
                    mapSection(sec.id, (s) => ({ ...s, lines: [...s.lines, nl] }));
                    setSelected(nl.id);
                    setEditing({ id: nl.id, caret: 0 });
                  }}
                >
                  <Icon name="plus" size={16} />
                  {t('sw.line.add')}
                </button>
              </section>
            );
          })}

          <label className="sw-add-section">
            <Icon name="plus" size={16} />
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                const sec = newSection(e.target.value);
                set((s) => ({ ...s, sections: [...s.sections, sec] }));
                setSelected(sec.lines[0].id);
                setEditing({ id: sec.lines[0].id, caret: 0 });
              }}
              aria-label={t('sw.section.add')}
            >
              <option value="">{t('sw.section.add')}</option>
              {SECTION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {t('sw.kind.' + k)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="sw-footer">
        <button type="button" className="sw-btn" onClick={() => window.print()}>
          <Icon name="print" />
          {t('sw.print')}
        </button>
        <button type="button" className="sw-btn" onClick={exportXml}>
          <Icon name="share" />
          {t('sw.export')}
        </button>
        <span className="sw-footer-gap" />
        {confirmDelete ? (
          <span className="sw-confirm">
            <span>{t('sw.song.deleteAsk')}</span>
            <button type="button" className="sw-btn is-danger" onClick={onDelete}>
              {t('sw.delete')}
            </button>
            <button type="button" className="sw-btn" onClick={() => setConfirmDelete(false)}>
              {t('sw.cancel')}
            </button>
          </span>
        ) : (
          <button type="button" className="sw-btn is-quiet-danger" onClick={() => setConfirmDelete(true)}>
            <Icon name="trash" />
            {t('sw.delete')}
          </button>
        )}
      </div>
      <p className="sw-footnote">{t('sw.exportNote')}</p>

      <PrintSheet song={song} t={t} />

      {picker && (
        <ChordPicker
          anchor={picker.rect}
          current={chordAtWord(findLine(picker.line)?.line?.raw ?? '', picker.word)}
          diatonic={diatonic}
          used={used}
          onPick={pick}
          onClose={() => setPicker(null)}
          isValid={validChord}
        />
      )}

      {melodyTarget && (
        <MelodyEditor
          song={song}
          line={melodyTarget.line}
          inKey={inKey}
          audio={audio}
          finding={finding === melodyTarget.line.id}
          recTick={audio.tick}
          onChange={(fn) => mapLine(melodyTarget.sec, melodyTarget.line.id, fn)}
          onGrid={(g) => set((s) => ({ ...s, grid: g }))}
          onRecord={() => audio.startRec({ sec: melodyTarget.sec, line: melodyTarget.line.id }, { bpm: song.bpm, beatsPerBar: bpb, click: song.click ?? 'count' })}
          onStopRec={() => (audio.rec?.phase === 'rec' ? stopRecording(melodyTarget.sec, melodyTarget.line.id) : audio.cancelRec())}
          onClose={() => setMelodyFor(null)}
        />
      )}
    </div>
  );
}

function chordAtWord(raw, wi) {
  const { text, chords } = parseLine(raw);
  const ws = [...text.matchAll(/\S+/g)];
  const w = ws[wi];
  if (!w) return null;
  const c = chords.find((x) => x.at >= w.index && x.at < w.index + w[0].length);
  return c?.symbol ?? null;
}

/** The lead sheet for printing: title, key / tempo, sections, chords over the words. */
function PrintSheet({ song, t }) {
  return (
    <div className="sw-print" aria-hidden="true">
      <h1 dir="auto">{song.title || t('sw.untitled')}</h1>
      <p className="sw-print-meta" dir="ltr">
        {[song.key ? keyName(song.key) : null, `♩ = ${song.bpm}`, song.time].filter(Boolean).join(' · ')}
      </p>
      {song.sections.filter((sec) => sec.lines.some((l) => parseLine(l.raw).text.trim())).map((sec) => (
        <div key={sec.id} className="sw-print-sec">
          <h2>{t('sw.kind.' + sec.kind)}</h2>
          {sec.lines.map((l) => {
            const { text, chords } = parseLine(l.raw);
            if (!text.trim()) return null;
            const ws = [...text.matchAll(/\S+/g)];
            return (
              <div key={l.id} className="sw-print-line" dir="auto">
                {ws.map((w, i) => {
                  const c = chords.find((x) => x.at >= w.index && x.at < w.index + w[0].length);
                  return (
                    <span key={i} className="sw-print-word">
                      <span className="sw-print-chord" dir="ltr">
                        {c?.symbol ?? ' '}
                      </span>
                      <span>{w[0]}</span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

