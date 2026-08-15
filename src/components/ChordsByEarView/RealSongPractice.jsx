import { SongVideoPlayer } from '../SongVideoPlayer/SongVideoPlayer';
import { useLanguage } from '../../i18n/LanguageContext';

// The course's capstone lesson — reuses Songs -> Video's existing
// SongVideoPlayer wholesale rather than building a second YouTube/chord-
// timeline pipeline: it already does exactly what this lesson needs (load
// a real song, listen live via a chroma-based "here's what this sounds
// like" suggestion — useTabAudioChordGuesser — and mark down chords by ear
// with correct timestamps), just introduced here with framing that ties it
// back to this course's own step-by-step listening process instead of
// Songs' more general "build a chord timeline for a video" framing.
export function RealSongPractice({ onActiveChordChange }) {
  const { t } = useLanguage();
  return (
    <div className="cbe-demo">
      <p className="cbe-hint" dir="auto">
        {t('chordsByEar.realSong.hint')}
      </p>
      <SongVideoPlayer onActiveChordChange={onActiveChordChange} />
    </div>
  );
}
