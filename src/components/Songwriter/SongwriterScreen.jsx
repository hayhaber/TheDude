import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { HomeButton } from '../HomeButton/HomeButton';
import { deleteAudio } from '../../audio/songwriter/songAudioStore';
import { keyName, newSong, sectionsFromText } from '../../music/songwriter/song';
import { parseLine } from '../../music/songwriter/lyrics';
import { useSongs } from './useSongs';
import { useSongAudio } from './useSongAudio';
import { SongEditor } from './SongEditor';
import { Icon } from './icons';
import { RecMeter } from './RecMeter';
import { Peaks } from './Takes';
import { DictationBox } from './DictationBox';
import { fmt } from './LyricLine';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import './Songwriter.css';

/**
 * The Songwriter (its own home card): the song list with quick ideas, and a
 * song's sheet — lyrics, chords over the words, a recorded melody per line
 * turned into notes under the syllables.
 */
export function SongwriterScreen({ start = 'list', onBack }) {
  const { lang } = useLanguage();
  const store = useSongs();
  const audio = useSongAudio();
  const [openId, setOpenId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);
  const started = useRef(false);
  // The card's "Idea" shortcut records at once (catch it before it's gone)
  // — once per visit, not again on coming back from a song.
  const [autoRecord, setAutoRecord] = useState(start === 'idea');

  const toast = useCallback((msg) => {
    setToastMsg((old) => {
      old?.onExpire?.();
      return { ...msg, k: Date.now() };
    });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setToastMsg((m) => {
        m?.onExpire?.();
        return null;
      });
    }, msg.action ? 7000 : 3500);
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (start === 'new') {
      const s = store.create();
      setOpenId(s.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !openId && !e.target.closest?.('input, select, textarea')) onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, onBack]);

  // A toast belongs to the screen it was raised on.
  useEffect(() => {
    clearTimeout(toastTimer.current);
    setToastMsg((m) => {
      m?.onExpire?.();
      return null;
    });
  }, [openId]);

  const song = store.songs.find((s) => s.id === openId);
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  const leave = () => {
    audio.stopAll();
    store.flush();
    onBack();
  };

  return (
    <div className="sw-screen" dir={dir}>
      <header className="sw-top">
        <HomeButton className="sw-home" onClick={leave} />
      </header>
      <main className="sw-main">
        {song ? (
          <SongEditor
            key={song.id}
            song={song}
            update={store.update}
            audio={audio}
            toast={toast}
            onBack={() => {
              audio.stopAll();
              setOpenId(null);
            }}
            onDelete={() => {
              audio.stopAll();
              const ids = [...song.sections.flatMap((s) => s.lines.flatMap((l) => (l.takes ?? []).map((x) => x.id)))];
              store.remove(song.id);
              deleteAudio(ids);
              setOpenId(null);
            }}
          />
        ) : (
          <SongList
            store={store}
            audio={audio}
            focusIdeas={start === 'idea'}
            autoRecord={autoRecord}
            onAutoRecorded={() => setAutoRecord(false)}
            onOpen={(id) => setOpenId(id)}
            toast={toast}
          />
        )}
      </main>
      {toastMsg && (
        <div className="sw-toast" key={toastMsg.k} role="status">
          <span>{toastMsg.text}</span>
          {toastMsg.action && (
            <button
              type="button"
              onClick={() => {
                toastMsg.onAction?.();
                clearTimeout(toastTimer.current);
                setToastMsg(null);
              }}
            >
              {toastMsg.action}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function IdeaWords({ idea, onSave }) {
  const { t } = useLanguage();
  const [text, setText] = useState(idea.text ?? '');
  return (
    <div className="sw-idea-edit">
      <DictationBox text={text} onText={setText} autoFocus onBlur={() => onSave(text)} />
      <button type="button" className="sw-btn is-primary is-small sw-idea-done" onClick={() => onSave(text)}>
        {t('sw.done')}
      </button>
    </div>
  );
}

// The tempo means something once it was chosen or a melody was sung to it;
// before that it's only the default (90) and isn't shown in the list.
const tempoShown = (s) => s.bpmSet || s.sections.some((sec) => sec.lines.some((l) => l.melody?.notes?.length));

function SongList({ store, audio, focusIdeas, autoRecord, onAutoRecorded, onOpen, toast }) {
  const { t, lang } = useLanguage();
  const ideasRef = useRef(null);
  const recIdea = audio.rec?.target?.idea ? audio.rec : null;

  useEffect(() => {
    if (focusIdeas) ideasRef.current?.scrollIntoView({ block: 'start' });
  }, [focusIdeas]);
  useEffect(() => {
    if (!autoRecord) return;
    onAutoRecorded();
    if (!audio.rec) audio.startRec({ idea: true }, { bpm: 90, beatsPerBar: 4, click: 'off' });
    // once, on arriving from the card's Idea shortcut
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRecord]);

  const dateFmt = (ms) => {
    try {
      return new Date(ms).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  // An idea = a recording, words, or both. Audio is stored under the idea's
  // own id (recorded first) or `audioId` (recorded onto a words idea).
  const audioKey = (idea) => idea.audioId ?? (idea.dur != null ? idea.id : null);
  const [editingIdea, setEditingIdea] = useState(null);

  const stopIdea = async () => {
    if (audio.rec?.phase !== 'rec') {
      audio.cancelRec();
      return;
    }
    const target = audio.rec.target;
    const out = await audio.stopRec({ bpm: 90, time: '4/4' });
    if (!out) return;
    const { id: audioId, at, ...take } = out.take;
    if (target.ideaId) {
      store.setIdeas((list) => list.map((x) => (x.id === target.ideaId ? { ...x, ...take, downbeat: null, audioId } : x)));
      return;
    }
    store.setIdeas((list) => [{ ...out.take, downbeat: null }, ...list]);
  };

  const newWords = () => {
    const idea = { id: `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), text: '' };
    store.setIdeas((list) => [idea, ...list]);
    setEditingIdea(idea.id);
  };

  const saveWords = (idea, text) => {
    setEditingIdea(null);
    const clean = text.replace(/\s+$/, '');
    // An empty words idea with no recording is dropped, not kept blank.
    if (!clean.trim() && !audioKey(idea)) {
      store.setIdeas((list) => list.filter((x) => x.id !== idea.id));
      return;
    }
    store.setIdeas((list) => list.map((x) => (x.id === idea.id ? { ...x, text: clean } : x)));
  };

  const songFromIdea = (idea) => {
    const s = newSong();
    const fromText = sectionsFromText(idea.text);
    if (fromText.length) s.sections = fromText.length === 1 ? [...fromText, s.sections[1]] : fromText;
    const key = audioKey(idea);
    if (key) {
      const first = s.sections[0].lines[0];
      const { text, audioId, ...take } = idea;
      s.sections[0].lines[0] = { ...first, takes: [{ ...take, id: key }] };
    }
    store.add(s);
    store.setIdeas((list) => list.filter((x) => x.id !== idea.id));
    onOpen(s.id);
  };

  const songs = [...store.songs].sort((a, b) => b.updatedAt - a.updatedAt);

  const deleteIdea = (idea) => {
    const key = audioKey(idea);
    if (editingIdea === idea.id) setEditingIdea(null);
    store.setIdeas((list) => list.filter((x) => x.id !== idea.id));
    let undone = false;
    toast({
      text: t('sw.idea.deleted'),
      action: t('sw.undo'),
      onAction: () => {
        undone = true;
        store.setIdeas((list) => [idea, ...list].sort((a, b) => b.at - a.at));
      },
      onExpire: () => !undone && key && deleteAudio(key),
    });
  };

  const empty = songs.length === 0 && store.ideas.length === 0;

  return (
    <div className="sw-list">
      {/* One primary action (a new song), quiet idea actions, iOS lists
          (Apple-style pass 2026-11-07). */}
      <div className="sw-list-head">
        <h1>{t('sw.title')}</h1>
        <button
          type="button"
          className="sw-btn is-tint"
          onClick={() => {
            const s = store.create();
            onOpen(s.id);
          }}
        >
          <Icon name="plus" />
          {t('sw.new')}
        </button>
      </div>
      {empty && <p className="sw-subtitle">{t('sw.subtitle')}</p>}

      <section className={'sw-group-sec' + (focusIdeas ? ' is-focus' : '')} ref={ideasRef}>
        <div className="sw-group-head">
          <h2>{t('sw.ideas')}</h2>
          {recIdea && recIdea.phase !== 'error' ? (
            <div className="sw-rec-strip" dir="ltr">
              {recIdea.phase === 'rec' ? (
                <>
                  <span className="sw-rec-dot" />
                  <span className="sw-rec-time">{fmt(audio.tick.elapsed)}</span>
                  <RecMeter bands={audio.tick.bands} silent={audio.tick.silent} label={t('sw.rec.meter')} />
                  {audio.tick.silent && <span className="sw-rec-silent">{t('sw.rec.silent')}</span>}
                </>
              ) : (
                <span className="sw-muted">{recIdea.phase === 'saving' ? t('sw.rec.saving') : t('sw.rec.opening')}</span>
              )}
              {recIdea.phase !== 'saving' && (
                <button type="button" className="sw-btn is-danger is-small" onClick={stopIdea}>
                  {t('sw.stop')}
                </button>
              )}
            </div>
          ) : (
            <span className="sw-group-actions">
              <button type="button" className="sw-btn is-small is-quiet" onClick={newWords}>
                <Icon name="words" />
                {t('sw.idea.words')}
              </button>
              <button type="button" className="sw-btn is-small is-rec-tint" onClick={() => audio.startRec({ idea: true }, { bpm: 90, beatsPerBar: 4, click: 'off' })}>
                <span className="sw-rec-big-dot" />
                {t('sw.record')}
              </button>
            </span>
          )}
        </div>
        {recIdea?.phase === 'error' && <p className="sw-error">{t(recIdea.error === 'denied' ? 'sw.rec.denied' : 'sw.rec.failed')}</p>}
        {store.ideas.length === 0 ? (
          <p className="sw-group-empty">{t('sw.ideas.hint')}</p>
        ) : (
          <ul className="sw-group">
            {store.ideas.map((idea) => {
              const key = audioKey(idea);
              const playingThis = key && audio.playingTake === key;
              const editing = editingIdea === idea.id;
              const lines = (idea.text ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
              const meta = [lines.length ? dateFmt(idea.at) : null, key ? fmt(idea.dur ?? 0) : null].filter(Boolean).join(' · ');
              return (
                <li key={idea.id} className={'sw-idea' + (editing ? ' is-editing' : '')}>
                  <div className="sw-idea-row">
                    {key ? (
                      <button type="button" className={'sw-icon-btn' + (playingThis ? ' is-on' : '')} onClick={() => audio.playTake(key)} aria-label={t('sw.play')}>
                        <Icon name={playingThis ? 'stop' : 'play'} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="sw-icon-btn is-rec"
                        disabled={!!recIdea}
                        onClick={() => audio.startRec({ idea: true, ideaId: idea.id }, { bpm: 90, beatsPerBar: 4, click: 'off' })}
                        aria-label={t('sw.idea.recWords')}
                        title={t('sw.idea.recWords')}
                      >
                        <Icon name="mic" />
                      </button>
                    )}
                    <button type="button" className="sw-idea-body" onClick={() => setEditingIdea(editing ? null : idea.id)}>
                      <span className="sw-idea-title" dir="auto">
                        {lines[0] ?? dateFmt(idea.at)}
                      </span>
                      {(lines[1] || meta) && (
                        <span className="sw-idea-sub" dir="auto">
                          {lines[1] ? lines[1] + (meta ? ' · ' : '') : ''}
                          <bdi>{meta}</bdi>
                        </span>
                      )}
                    </button>
                    {key && <Peaks peaks={idea.peaks} />}
                    <button type="button" className="sw-btn is-small is-tint" onClick={() => songFromIdea(idea)}>
                      {t('sw.idea.toSong')}
                    </button>
                    <MoreMenu label={t('sw.more')}>
                      <button type="button" className="more-menu-item" onClick={() => setEditingIdea(idea.id)}>
                        <Icon name="pen" />
                        {t('sw.idea.edit')}
                      </button>
                      <button type="button" className="more-menu-item is-danger" onClick={() => deleteIdea(idea)}>
                        <Icon name="trash" />
                        {t('sw.delete')}
                      </button>
                    </MoreMenu>
                  </div>
                  {editing && <IdeaWords idea={idea} onSave={(text) => saveWords(idea, text)} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="sw-group-sec">
        <div className="sw-group-head">
          <h2>{t('sw.songs')}</h2>
        </div>
        {songs.length === 0 ? (
          <p className="sw-group-empty">{t('sw.songs.empty')}</p>
        ) : (
          <ul className="sw-group">
            {songs.map((s) => {
              const lines = s.sections.reduce((n, sec) => n + sec.lines.filter((l) => parseLine(l.raw).text.trim()).length, 0);
              const first = s.sections.flatMap((sec) => sec.lines).map((l) => parseLine(l.raw).text.trim()).find(Boolean);
              return (
                <li key={s.id}>
                  <button type="button" className="sw-song-row" onClick={() => onOpen(s.id)}>
                    <span className="sw-song-text">
                      <span className="sw-song-title" dir="auto">
                        {s.title || first || t('sw.untitled')}
                      </span>
                      <span className="sw-song-sub">
                        {[s.key ? keyName(s.key) : null, tempoShown(s) ? `${s.bpm} BPM` : null, t('sw.lines', { n: lines }), dateFmt(s.updatedAt)].filter(Boolean).map((x, k) => (
                          <bdi key={k}>{x}</bdi>
                        ))}
                      </span>
                    </span>
                    <span className="sw-chev" aria-hidden="true">
                      <svg viewBox="0 0 8 14" width="8" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1.5 1.5L6.5 7l-5 5.5" />
                      </svg>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
