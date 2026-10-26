import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { HomeButton } from '../HomeButton/HomeButton';
import { deleteAudio } from '../../audio/songwriter/songAudioStore';
import { keyName, newSong } from '../../music/songwriter/song';
import { parseLine } from '../../music/songwriter/lyrics';
import { useSongs } from './useSongs';
import { useSongAudio } from './useSongAudio';
import { SongEditor } from './SongEditor';
import { Icon } from './icons';
import { Peaks } from './Takes';
import { fmt } from './LyricLine';
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
          <SongList store={store} audio={audio} focusIdeas={start === 'idea'} onOpen={(id) => setOpenId(id)} toast={toast} />
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

function SongList({ store, audio, focusIdeas, onOpen, toast }) {
  const { t, lang } = useLanguage();
  const ideasRef = useRef(null);
  const recIdea = audio.rec?.target?.idea ? audio.rec : null;

  useEffect(() => {
    if (focusIdeas) ideasRef.current?.scrollIntoView({ block: 'start' });
  }, [focusIdeas]);

  const dateFmt = (ms) => {
    try {
      return new Date(ms).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const stopIdea = async () => {
    if (audio.rec?.phase !== 'rec') {
      audio.cancelRec();
      return;
    }
    const out = await audio.stopRec({ bpm: 90, time: '4/4' });
    if (!out) return;
    store.setIdeas((list) => [{ ...out.take, downbeat: null }, ...list]);
  };

  const songFromIdea = (idea) => {
    const s = newSong();
    const first = s.sections[0].lines[0];
    s.sections[0].lines[0] = { ...first, takes: [{ ...idea }] };
    store.add(s);
    store.setIdeas((list) => list.filter((x) => x.id !== idea.id));
    onOpen(s.id);
  };

  const songs = [...store.songs].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="sw-list">
      <div className="sw-list-head">
        <div>
          <h1>{t('sw.title')}</h1>
          <p className="sw-subtitle">{t('sw.subtitle')}</p>
        </div>
        <button
          type="button"
          className="sw-btn is-primary is-big"
          onClick={() => {
            const s = store.create();
            onOpen(s.id);
          }}
        >
          <Icon name="plus" />
          {t('sw.new')}
        </button>
      </div>

      <section className={'sw-ideas' + (focusIdeas ? ' is-focus' : '')} ref={ideasRef}>
        <div className="sw-ideas-head">
          <div>
            <h2>{t('sw.ideas')}</h2>
            <p className="sw-muted">{t('sw.ideas.hint')}</p>
          </div>
          {recIdea && recIdea.phase !== 'error' ? (
            <div className="sw-rec-strip" dir="ltr">
              {recIdea.phase === 'rec' ? (
                <>
                  <span className="sw-rec-dot" />
                  <span className="sw-rec-time">{fmt(audio.tick.elapsed)}</span>
                  <span className="sw-level">
                    <span style={{ width: `${Math.min(100, Math.round(Math.sqrt(audio.tick.level) * 100))}%` }} />
                  </span>
                </>
              ) : (
                <span className="sw-muted">{recIdea.phase === 'saving' ? t('sw.rec.saving') : t('sw.rec.opening')}</span>
              )}
              {recIdea.phase !== 'saving' && (
                <button type="button" className="sw-btn is-danger" onClick={stopIdea}>
                  {t('sw.stop')}
                </button>
              )}
            </div>
          ) : (
            <button type="button" className="sw-rec-big" onClick={() => audio.startRec({ idea: true }, { bpm: 90, beatsPerBar: 4, click: 'off' })}>
              <span className="sw-rec-big-dot" />
              {t('sw.record')}
            </button>
          )}
        </div>
        {recIdea?.phase === 'error' && <p className="sw-error">{t(recIdea.error === 'denied' ? 'sw.rec.denied' : 'sw.rec.failed')}</p>}
        {store.ideas.length > 0 && (
          <ul className="sw-takes">
            {store.ideas.map((idea) => {
              const playingThis = audio.playingTake === idea.id;
              return (
                <li key={idea.id} className="sw-take">
                  <button type="button" className={'sw-icon-btn' + (playingThis ? ' is-on' : '')} onClick={() => audio.playTake(idea.id)} aria-label={t('sw.play')}>
                    <Icon name={playingThis ? 'stop' : 'play'} />
                  </button>
                  <span className="sw-take-name">
                    {dateFmt(idea.at)}
                    <span className="sw-muted" dir="ltr">
                      {' '}
                      · {fmt(idea.dur ?? 0)}
                    </span>
                  </span>
                  <Peaks peaks={idea.peaks} />
                  <button type="button" className="sw-btn is-small" onClick={() => songFromIdea(idea)}>
                    {t('sw.idea.toSong')}
                  </button>
                  <button
                    type="button"
                    className="sw-icon-btn is-danger"
                    onClick={() => {
                      store.setIdeas((list) => list.filter((x) => x.id !== idea.id));
                      let undone = false;
                      toast({
                        text: t('sw.idea.deleted'),
                        action: t('sw.undo'),
                        onAction: () => {
                          undone = true;
                          store.setIdeas((list) => [idea, ...list].sort((a, b) => b.at - a.at));
                        },
                        onExpire: () => !undone && deleteAudio(idea.id),
                      });
                    }}
                    aria-label={t('sw.delete')}
                    title={t('sw.delete')}
                  >
                    <Icon name="trash" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="sw-songs">
        <h2>{t('sw.songs')}</h2>
        {songs.length === 0 ? (
          <p className="sw-muted">{t('sw.songs.empty')}</p>
        ) : (
          <ul className="sw-song-list">
            {songs.map((s) => {
              const lines = s.sections.reduce((n, sec) => n + sec.lines.filter((l) => parseLine(l.raw).text.trim()).length, 0);
              const first = s.sections.flatMap((sec) => sec.lines).map((l) => parseLine(l.raw).text.trim()).find(Boolean);
              return (
                <li key={s.id}>
                  <button type="button" className="sw-song-row" onClick={() => onOpen(s.id)}>
                    <span className="sw-song-title" dir="auto">
                      {s.title || first || t('sw.untitled')}
                    </span>
                    <span className="sw-song-sub">
                      {[s.key ? keyName(s.key) : null, `${s.bpm} BPM`, t('sw.lines', { n: lines }), dateFmt(s.updatedAt)].filter(Boolean).map((x, k) => (
                        <bdi key={k}>{x}</bdi>
                      ))}
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
