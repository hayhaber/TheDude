import { useState } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { TabViewer } from '../TabViewer/TabViewer';
import { TabPdfImporter } from '../TabPdfImporter/TabPdfImporter';
import './TabUploadPanel.css';

// Songs -> "Tab" mode: ONE upload point for both a Guitar Pro file
// (.gp3/.gp4/.gp5/.gpx/.gp, rendered+played via TabViewer/alphaTab) and a
// scanned/text TAB PDF (rendered+played via TabPdfImporter's own
// extraction/OCR pipeline) — the two were previously separate dropdown
// options requiring the player to already know which engine their file
// needs; the extension alone tells us that, so the player shouldn't have
// to pick it manually. Each underlying component is untouched internally
// — this just picks which one mounts and feeds it the chosen File via its
// `externalFile` prop instead of that component's own (now hidden) input.
const GP_EXTENSIONS = ['.gp3', '.gp4', '.gp5', '.gpx', '.gp'];

function detectKind(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (GP_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'gp';
  return null;
}

export function TabUploadPanel({ onActiveChordChange, onLickChange, onPlayingOrderChange, instrument }) {
  const { t } = useLanguage();
  const [file, setFile] = useState(null);
  const [kind, setKind] = useState(null);
  const [pickError, setPickError] = useState(null);

  function handleFile(e) {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    const detected = detectKind(picked.name);
    if (!detected) {
      setPickError(t('songs.tabUpload.unsupportedType'));
      return;
    }
    // The PDF path plays notes back on fret positions — a guitar-only
    // concept (same reasoning as this mode's own guitar-only gating
    // before the merge); a GP file still works either way since alphaTab
    // just renders the tab, so only PDF needs the check.
    if (detected === 'pdf' && instrument !== 'guitar') {
      setPickError(t('songs.tabUpload.pdfNeedsGuitar'));
      return;
    }
    setPickError(null);
    setKind(detected);
    setFile(picked);
  }

  return (
    <div className="tab-upload-panel">
      <label className="tab-upload-panel-upload">
        {t('songs.tabUpload.upload')}
        <input type="file" accept=".gp3,.gp4,.gp5,.gpx,.gp,.pdf" onChange={handleFile} />
      </label>

      {pickError && (
        <p className="tab-upload-panel-error" dir="auto">
          {pickError}
        </p>
      )}

      {kind === 'gp' && <TabViewer onActiveChordChange={onActiveChordChange} externalFile={file} hideUpload />}
      {kind === 'pdf' && (
        <TabPdfImporter onLickChange={onLickChange} onPlayingOrderChange={onPlayingOrderChange} externalFile={file} hideUpload />
      )}
    </div>
  );
}
