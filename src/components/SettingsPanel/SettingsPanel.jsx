import { useEffect, useRef, useState, useSyncExternalStore } from "react";

function useMediaQuery(q) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(q);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(q).matches,
    () => false,
  );
}
import { CloudField } from "../../cloud/CloudField";
import { useCloud } from "../../cloud/useCloud";
import { getLink } from "../../cloud/cloudState";
import { useProfiles } from "../../profile/profileStorage";
import { Avatar } from "../../profile/ProfileChip";
import { BackButton } from "../PracticeView/PracticeHome";
import { InfoSwitchRow } from "./SwitchRow";
import { getAudioInputSettings } from "../../audio/audioInputSettingsStore";
import { LibraryBar } from "../LickTrainer/LickTrainer";
import { createPortal } from "react-dom";
import { useLanguage } from "../../i18n/LanguageContext";
import { useInstrument } from "../../instruments/useInstrument";
import { InfoTooltip } from "../InfoTooltip/InfoTooltip";
import {
  GUITAR_SOUND_PROFILES,
  PIANO_SOUND_PROFILES,
  BASS_SOUND_PROFILES,
} from "../../audio/instrumentProfiles";
import { AudioInputSettings } from "../AudioInputSettings/AudioInputSettings";
import { YoutubeApiKeySettings } from "../YoutubeApiKeySettings/YoutubeApiKeySettings";
import { KeyboardShortcutsSettings } from "../KeyboardShortcutsSettings/KeyboardShortcutsSettings";
import { useLeftHanded } from "../Fretboard/handedness";
import {
  canPrompt,
  isStandalone,
  promptInstall,
  subscribeInstall,
} from "../../install/pwaInstall";
import "../ModeToggle/ModeToggle.css";
import "./SettingsPanel.css";
import { restartOnboarding } from "../../onboarding/onboardingState";

// Right-side drawer, same interaction/anchor as MetronomeBar/TunerBar/
// DisplayOptionsMenu (top-anchored, capped max-height so it never covers the
// Stage, portaled to <body>) — per explicit request, replacing an earlier
// measured-position popover. That popover anchored itself against the gear
// button's own on-screen rect, which made it hard to find/inconsistent with
// every other panel in the app; a drawer is a single, predictable, always
// same-place destination like the others.
//
// This component is rendered TWICE by AppShell (once inside the off-canvas
// nav drawer, once in the mobile top bar) — portaling to document.body means
// both instances behave identically regardless of which triggered it.
export function SettingsPanel(settings) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="settings-panel">
      <button
        type="button"
        className={"settings-gear icon-circle-button" + (open ? " active" : "")}
        onClick={() => setOpen(true)}
        aria-label={t("settings.gearLabel")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        ⚙︎
      </button>

      {createPortal(
        <>
          <div
            className={"settings-drawer-scrim" + (open ? " open" : "")}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            className={"settings-drawer" + (open ? " open" : "")}
            role="dialog"
            aria-modal="true"
            aria-label={t("settings.title")}
            inert={!open}
          >
            <div className="settings-drawer-header">
              <h2 className="settings-drawer-title">{t("settings.title")}</h2>
              <button
                type="button"
                className="settings-drawer-close"
                onClick={() => setOpen(false)}
                aria-label={t("metronomeBar.hide")}
              >
                ×
              </button>
            </div>

            <SettingsBody {...settings} />
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

/**
 * The settings themselves — in the app's side drawer (SettingsPanel) and on
 * the home screen's Settings page (ToolScreen). `allSounds` shows every
 * instrument's sound picker (the home screen has no "current" instrument
 * page); otherwise only the instrument in use.
 */
// "Install the app" — hidden inside the installed app. Install = the
// browser's own dialog where it has one (Android / Chrome / Edge); Guide =
// the /install page (iPhone / iPad steps, QR code for a phone).
function InstallField() {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState(canPrompt);
  useEffect(() => subscribeInstall(() => setPrompt(canPrompt())), []);
  if (isStandalone()) return null;
  return (
    <div className="settings-field settings-install">
      <span className="settings-field-label">{t("inst.settings.title")}</span>
      <span className="settings-install-text">{t("inst.settings.text")}</span>
      <span className="settings-install-actions">
        {prompt && (
          <button
            type="button"
            className="settings-install-btn is-primary"
            onClick={() => promptInstall()}
          >
            {t("inst.install")}
          </button>
        )}
        <a className="settings-install-btn" href="/install">
          {t("inst.settings.page")}
        </a>
      </span>
    </div>
  );
}

// The settings as an iOS Settings list (user approved 2026-11-06): one page
// of grouped rows (account, sound, microphone, language, display, install,
// advanced) — each opens its own page with a "‹ Settings" back button.
// Nothing was removed; every field lives on one of the pages.

const PAGE_ICONS = {
  sound: {
    color: "#ff2d55",
    path: "M9 18V5l11-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  mic: {
    color: "#ff9500",
    path: "M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v4",
  },
  language: {
    color: "#0a84ff",
    path: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
  },
  display: {
    color: "#5856d6",
    path: "M12 4a8 8 0 1 0 0 16zM12 4a8 8 0 0 1 0 16",
  },
  install: { color: "#34c759", path: "M12 3v12M7 10l5 5 5-5M5 21h14" },
  advanced: {
    color: "#8e8e93",
    path: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  },
};

function PageIcon({ page }) {
  const ic = PAGE_ICONS[page];
  return (
    <span
      className="set-icon"
      style={{ background: ic.color }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width="17"
        height="17"
        fill="none"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={ic.path} />
      </svg>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      className="set-chev"
      viewBox="0 0 8 14"
      width="8"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 1.5L6.5 7l-5 5.5" />
    </svg>
  );
}

function NavRow({ page, label, value, onOpen, active = false }) {
  return (
    <button
      type="button"
      className={"set-row" + (active ? " is-active" : "")}
      aria-current={active ? "page" : undefined}
      onClick={() => onOpen(page)}
    >
      <PageIcon page={page} />
      <span className="set-row-label">{label}</span>
      {value && (
        <span className="set-row-value" dir="auto">
          {value}
        </span>
      )}
      <Chevron />
    </button>
  );
}

function CheckRow({ label, checked, onClick }) {
  return (
    <button
      type="button"
      className="set-row is-check"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onClick}
    >
      <span className="set-row-label" dir="auto">
        {label}
      </span>
      {checked && (
        <svg
          className="set-check"
          viewBox="0 0 16 12"
          width="16"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M1.5 6.5l4 4 9-9" />
        </svg>
      )}
    </button>
  );
}

export function SettingsBody({
  theme,
  onThemeChange,
  guitarProfile,
  onGuitarProfileChange,
  pianoProfile,
  onPianoProfileChange,
  bassProfile,
  onBassProfileChange,
  shortcuts,
  // The Lick Trainer / GuitarPro state, for "Sync between devices".
  syncTrainer = null,
  allSounds = false,
}) {
  const { t, lang, setLang } = useLanguage();
  const { instrument } = useInstrument();
  const [leftHanded, setLeftHanded] = useLeftHanded();
  const [page, setPage] = useState(null);
  // iPad / computer: the list on one side, the chosen page on the other
  // (iPad Settings' split view; user's idea 2026-11-06). Phones: drill-down.
  const wide = useMediaQuery("(min-width: 900px)");
  const shown = wide ? (page ?? "sound") : page;
  const cloud = useCloud();
  const { active } = useProfiles();
  const link = getLink();
  const email = cloud.email || link?.email;
  const profileName = active?.name?.trim() || t("profile.defaultName");
  const showHand = allSounds || instrument !== "piano";
  const showSound = (key) =>
    allSounds ||
    (key === "guitar"
      ? instrument !== "piano" && instrument !== "bass"
      : instrument === key);
  const installable = !isStandalone();
  const rootRef = useRef(null);

  // A sub-page: Escape goes back to the list (before the screen's own
  // Escape, which leaves Settings).
  useEffect(() => {
    if (!page || wide) return undefined;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      setPage(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [page, wide]);

  // A new page starts at its top (phones: it replaces the list).
  useEffect(() => {
    if (!wide) rootRef.current?.scrollIntoView?.({ block: "start" });
  }, [page, wide]);

  const labelOf = (list, key) => {
    const p = list.find((x) => x.key === key);
    return p ? t(p.labelKey) : "";
  };
  const soundValue =
    instrument === "piano" && !allSounds
      ? labelOf(PIANO_SOUND_PROFILES, pianoProfile)
      : instrument === "bass" && !allSounds
        ? labelOf(BASS_SOUND_PROFILES, bassProfile)
        : labelOf(GUITAR_SOUND_PROFILES, guitarProfile);
  const micValue = t(
    getAudioInputSettings().inputMode === "microphone"
      ? "audioInput.mode.microphone"
      : "audioInput.mode.direct",
  );
  const displayValue = [
    t(theme === "dark" ? "settings.dark" : "settings.light"),
    showHand ? t(leftHanded ? "tuning.hand.left" : "tuning.hand.right") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const title = page ? t(`settings.page.${page}`) : t("settings.title");
  const nav = (key) => ({
    page: key,
    onOpen: setPage,
    active: wide && shown === key,
  });

  return (
    <div className={"set-root" + (wide ? " is-split" : "")} ref={rootRef}>
      {!wide && page && (
        <BackButton label={t("settings.title")} onClick={() => setPage(null)} />
      )}
      {!wide && <h1 className="set-title">{title}</h1>}

      {(wide || !page) && (
        <div className="set-list">
          {wide && <h1 className="set-title">{t("settings.title")}</h1>}
          <div className="set-group">
            <button
              type="button"
              className={
                "set-row is-account" +
                (wide && shown === "account" ? " is-active" : "")
              }
              aria-current={wide && shown === "account" ? "page" : undefined}
              onClick={() => setPage("account")}
            >
              <Avatar profile={active} name={profileName} size={48} />
              <span className="set-row-text">
                <span className="set-account-name" dir="auto">
                  {profileName}
                </span>
                <span className="set-row-sub" dir="auto">
                  {email
                    ? t("settings.account.synced", { email })
                    : t("settings.account.signedOut")}
                </span>
              </span>
              <Chevron />
            </button>
          </div>

          <div className="set-group">
            <NavRow
              {...nav("sound")}
              label={t("settings.page.sound")}
              value={soundValue}
            />
            <NavRow
              {...nav("mic")}
              label={t("settings.page.mic")}
              value={micValue}
            />
          </div>

          <div className="set-group">
            <NavRow
              {...nav("language")}
              label={t("settings.page.language")}
              value={lang === "he" ? "עברית" : "English"}
            />
            <NavRow
              {...nav("display")}
              label={t("settings.page.display")}
              value={displayValue}
            />
          </div>

          <div className="set-group">
            {installable && (
              <NavRow {...nav("install")} label={t("settings.page.install")} />
            )}
            <NavRow {...nav("advanced")} label={t("settings.page.advanced")} />
          </div>

          <AppVersion t={t} />
        </div>
      )}

      {shown && (
        <div className="set-detail" key={shown}>
          {wide && <h2 className="set-title">{t(`settings.page.${shown}`)}</h2>}

          {shown === "account" && (
            <div className="set-page settings-drawer-body">
              <CloudField />
            </div>
          )}

          {shown === "sound" && (
            <div className="set-page settings-drawer-body">
              {showSound("guitar") && (
                <label className="settings-field">
                  <span className="settings-field-label">
                    {t("settings.guitarSound")}
                  </span>
                  <select
                    value={guitarProfile}
                    onChange={(e) => onGuitarProfileChange(e.target.value)}
                  >
                    {GUITAR_SOUND_PROFILES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {t(p.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {showSound("piano") && (
                <label className="settings-field">
                  <span className="settings-field-label">
                    {t("settings.pianoSound")}
                    <InfoTooltip text={t("tip.tools.pianoSound")} />
                  </span>
                  <select
                    value={pianoProfile}
                    onChange={(e) => onPianoProfileChange(e.target.value)}
                  >
                    {PIANO_SOUND_PROFILES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {t(p.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {showSound("bass") && (
                <label className="settings-field">
                  <span className="settings-field-label">
                    {t("settings.bassSound")}
                    <InfoTooltip text={t("tip.tools.bassSound")} />
                  </span>
                  <select
                    value={bassProfile}
                    onChange={(e) => onBassProfileChange(e.target.value)}
                  >
                    {BASS_SOUND_PROFILES.map((p) => (
                      <option key={p.key} value={p.key}>
                        {t(p.labelKey)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="set-footnote">
                {t("settings.audioAttribution")}{" "}
                {t("settings.pianoAudioAttribution")}
              </p>
            </div>
          )}

          {shown === "mic" && (
            <div className="set-page settings-drawer-body">
              <AudioInputSettings />
            </div>
          )}

          {shown === "language" && (
            <div
              className="set-group"
              role="menu"
              aria-label={t("settings.page.language")}
            >
              <CheckRow
                label="עברית"
                checked={lang === "he"}
                onClick={() => setLang("he")}
              />
              <CheckRow
                label="English"
                checked={lang === "en"}
                onClick={() => setLang("en")}
              />
            </div>
          )}

          {shown === "display" && (
            <>
              <p className="set-section">{t("settings.appearance")}</p>
              <div
                className="set-group"
                role="menu"
                aria-label={t("settings.appearance")}
              >
                <CheckRow
                  label={t("settings.light")}
                  checked={theme !== "dark"}
                  onClick={() => onThemeChange("light")}
                />
                <CheckRow
                  label={t("settings.dark")}
                  checked={theme === "dark"}
                  onClick={() => onThemeChange("dark")}
                />
              </div>
              {showHand && (
                <>
                  <p className="set-section">
                    {t("tuning.hand")}
                    <InfoTooltip text={t("tuning.tip.leftHanded")} />
                  </p>
                  <div
                    className="set-group"
                    role="menu"
                    aria-label={t("tuning.hand")}
                  >
                    <CheckRow
                      label={t("tuning.hand.right")}
                      checked={!leftHanded}
                      onClick={() => setLeftHanded(false)}
                    />
                    <CheckRow
                      label={t("tuning.hand.left")}
                      checked={leftHanded}
                      onClick={() => setLeftHanded(true)}
                    />
                  </div>
                </>
              )}
              <div className="set-group">
                <InfoSwitchRow />
              </div>
            </>
          )}

          {shown === "install" && (
            <div className="set-page settings-drawer-body">
              <InstallField />
            </div>
          )}

          {shown === "advanced" && (
            <div className="set-page settings-drawer-body">
              {syncTrainer && (
                <>
                  <h3 className="settings-drawer-subtitle">
                    {t("lickTrainer.libTitle")}
                  </h3>
                  <LibraryBar trainer={syncTrainer} t={t} bare />
                </>
              )}
              <h3 className="settings-drawer-subtitle">
                {t("settings.youtube")}
              </h3>
              <YoutubeApiKeySettings />
              <h3 className="settings-drawer-subtitle">
                {t("settings.shortcuts.title")}
              </h3>
              <KeyboardShortcutsSettings shortcuts={shortcuts} />
              <div className="settings-field">
                <span className="settings-field-label">
                  {t("onb.again.label")}
                </span>
                <button
                  type="button"
                  className="settings-install-btn"
                  onClick={() => {
                    restartOnboarding();
                    window.location.reload();
                  }}
                >
                  {t("onb.again.btn")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Which build this is — to confirm on a phone that the latest deploy arrived.
// The number alone (user's request 2026-11-06: no date, time or commit).
/* global __APP_VERSION__ */
function AppVersion({ t }) {
  const version = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "";
  return (
    <p className="settings-version">
      {t("settings.version")} <bdi dir="ltr">{version}</bdi>
    </p>
  );
}
