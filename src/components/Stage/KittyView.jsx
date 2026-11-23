// The band's kitty (v1.0.250): a top-up round ("everyone puts in 150"),
// each rehearsal paid from the kitty, until it runs low. A record book only
// — no money moves through the app. Everyone in the band reads it; the
// manager or the treasurer writes it (migration 012).
import { useMemo, useState } from 'react';
import { Button } from '../ui/controls';
import { Select } from '../ui/Select';
import { MoreMenu } from '../MoreMenu/MoreMenu';
import { addLedger, removeLedger, setTreasurer } from '../../music/sheets/chartCloud';
import { historyOf, kittyOf, money, parseAmount, today } from '../../music/sheets/kitty';

const toText = (amount) => (amount ? String(amount % 100 ? (amount / 100).toFixed(2) : amount / 100) : '');
const shortDate = (iso, lang) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'numeric' });
};

function Check() {
  return (
    <svg className="stg-check" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3.2 3.2L13 4.5" />
    </svg>
  );
}

export function KittyView({ band, uid, ledger, kitty, ready, Sheet, Avatar, say, dir, t, lang }) {
  const [form, setForm] = useState(null); // {kind:'expense'|'round'|'deposit'|'treasurer'} | {kind:'entry', e}
  const ids = band.members.map((m) => m.id);
  const nameOf = (id) => band.members.find((m) => m.id === id)?.name || t('stage.band.someone');
  const entries = useMemo(() => ledger.filter((e) => e.band === band.id), [ledger, band.id]);
  const k = useMemo(() => kittyOf(entries, ids), [entries, ids.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const treasurer = kitty?.treasurer && ids.includes(kitty.treasurer) ? kitty.treasurer : null;
  const cashier = band.owner === uid || treasurer === uid;
  const keeper = treasurer ?? band.owner;
  const m$ = (a, sign = false) => money(a, lang, 'ILS', sign);
  const fail = (e) => say?.(t('stage.kt.failed') + (e?.message ? ` (${e.message})` : ''));

  if (!ready) {
    return (
      <section className="ph-section">
        <p className="stg-fine">{t('stage.kt.setup')}</p>
      </section>
    );
  }

  const markPaid = (id) => addLedger(band.id, { kind: 'deposit', amount: k.round.amount, member: id, round: k.round.id, at: today() }).catch(fail);
  const anyMoney = entries.some((e) => !e.deleted && e.kind !== 'round');
  const history = historyOf(entries);

  return (
    <div className="stg-kitty">
      {/* the balance, like Apple Cash's card */}
      <section className={'stg-kitty-hero' + (k.low || k.inKitty <= 0 ? ' is-low' : '')}>
        <div className="stg-kitty-top">
          <span className="stg-kitty-label">{t('stage.kt.inKitty')}</span>
          {(cashier || band.owner === uid) && (
            <MoreMenu label={t('stage.more')}>
              {cashier && (
                <button type="button" className="more-menu-item" onClick={() => setForm({ kind: 'deposit' })}>
                  {t('stage.kt.addDeposit')}
                </button>
              )}
              {band.owner === uid && (
                <button type="button" className="more-menu-item" onClick={() => setForm({ kind: 'treasurer' })}>
                  {t('stage.kt.treasurer')}
                </button>
              )}
            </MoreMenu>
          )}
        </div>
        <strong className="stg-kitty-amount">
          {m$(k.inKitty)}
        </strong>
        <span className="stg-kitty-caption">
          {!anyMoney
            ? t('stage.kt.empty')
            : k.inKitty <= 0
              ? t('stage.kt.out')
              : k.low
                ? t('stage.kt.low')
                : k.rehearsalsLeft != null
                  ? t(k.rehearsalsLeft === 1 ? 'stage.kt.left1' : 'stage.kt.leftN', { n: k.rehearsalsLeft })
                  : ''}
        </span>
        <span className="stg-kitty-keeper">{t('stage.kt.keeper', { name: nameOf(keeper) })}</span>
        {cashier && (
          <div className="stg-kitty-actions">
            <Button variant="filled" onClick={() => setForm({ kind: 'expense' })}>
              {t('stage.kt.rehearsal')}
            </Button>
            <Button variant="tinted" onClick={() => setForm({ kind: 'round' })}>
              {t('stage.kt.collect')}
            </Button>
          </div>
        )}
      </section>

      {/* the current top-up round: who put their part in */}
      {k.round && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.kt.roundTitle', { amount: m$(k.round.amount) })}</h2>
          <p className="stg-fine stg-ready-sum">
            {k.round.open.length ? t('stage.kt.roundPaid', { k: k.round.paid.length, n: ids.length }) : t('stage.kt.roundDone')}
            {k.round.note ? ' · ' + k.round.note : ''}
          </p>
          <div className="ph-group stg-group">
            {band.members.map((m) => {
              const paid = k.round.paid.includes(m.id);
              return (
                <div key={m.id} className="stg-row">
                  <span className="ph-row stg-row-main">
                    <Avatar m={m} small />
                    <span className="ph-text">
                      <span className="ph-title" dir="auto">
                        {m.name || t('stage.band.someone')}
                      </span>
                    </span>
                    {paid ? (
                      <span className="stg-ready is-know">{t('stage.kt.paid')}</span>
                    ) : cashier ? (
                      <Button size="sm" variant="tinted" onClick={() => markPaid(m.id)}>
                        {t('stage.kt.markPaid')}
                      </Button>
                    ) : (
                      <span className="stg-ready is-none">{t('stage.kt.notYet')}</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* each member: put in vs. their share of what was spent */}
      {anyMoney && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.kt.members')}</h2>
          <div className="ph-group stg-group">
            {band.members.map((m) => {
              const p = k.per[m.id];
              return (
                <div key={m.id} className="stg-row">
                  <span className="ph-row stg-row-main">
                    <Avatar m={m} small />
                    <span className="ph-text">
                      <span className="ph-title" dir="auto">
                        {m.name || t('stage.band.someone')}
                      </span>
                      <span className="ph-desc">{t('stage.kt.perLine', { paid: m$(p.paid), share: m$(p.share) })}</span>
                    </span>
                    <span className={'stg-kitty-net' + (p.net < 0 ? ' is-neg' : p.net > 0 ? ' is-pos' : '')}>
                      {m$(p.net, true)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="stg-fine is-under">{t('stage.kt.netNote')}</p>
        </section>
      )}

      {history.length > 0 && (
        <section className="ph-section">
          <h2 className="ph-section-title">{t('stage.kt.history')}</h2>
          <div className="ph-group stg-group">
            {history.map((e) => (
              <button key={e.id} type="button" className="ph-row stg-member-row" onClick={() => setForm({ kind: 'entry', e })}>
                <span className={'stg-act-icon is-' + e.kind} aria-hidden="true">
                  {e.kind === 'expense' ? '−' : e.kind === 'deposit' ? '+' : '↻'}
                </span>
                <span className="ph-text">
                  <span className="ph-title" dir="auto">
                    {e.kind === 'deposit' ? nameOf(e.member) : e.note || t(e.kind === 'round' ? 'stage.kt.round' : 'stage.kt.rehearsalItem')}
                  </span>
                  <span className="ph-desc">
                    {shortDate(e.at, lang) +
                      (e.kind === 'expense' && e.who ? ' · ' + t('stage.kt.whoN', { n: e.who.length }) : '') +
                      (e.kind === 'round' ? ' · ' + t('stage.kt.each') : '') +
                      (e.kind === 'deposit' ? ' · ' + t('stage.kt.deposit') : '')}
                  </span>
                </span>
                <span className={'stg-kitty-net' + (e.kind === 'expense' ? ' is-neg' : e.kind === 'deposit' ? ' is-pos' : '')}>
                  {e.kind === 'round' ? m$(e.amount) : m$(e.kind === 'expense' ? -e.amount : e.amount, true)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!cashier && <p className="stg-fine is-under">{t('stage.kt.onlyKeeper', { name: nameOf(keeper) })}</p>}

      {form?.kind === 'expense' && <ExpenseSheet band={band} last={k.lastExpense} onClose={() => setForm(null)} fail={fail} Sheet={Sheet} Avatar={Avatar} dir={dir} t={t} />}
      {form?.kind === 'round' && <RoundSheet band={band} last={k.round} onClose={() => setForm(null)} fail={fail} Sheet={Sheet} dir={dir} t={t} />}
      {form?.kind === 'deposit' && <DepositSheet band={band} round={k.round} onClose={() => setForm(null)} fail={fail} Sheet={Sheet} dir={dir} t={t} />}
      {form?.kind === 'treasurer' && <TreasurerSheet band={band} current={treasurer} onClose={() => setForm(null)} fail={fail} Sheet={Sheet} Avatar={Avatar} dir={dir} t={t} />}
      {form?.kind === 'entry' && <EntrySheet e={form.e} canDelete={cashier} nameOf={nameOf} m$={m$} onClose={() => setForm(null)} fail={fail} Sheet={Sheet} dir={dir} t={t} lang={lang} />}
    </div>
  );
}

function AmountField({ label, value, onChange, autoFocus }) {
  return (
    <label className="stg-field">
      <span>{label}</span>
      <input className="stg-amount" inputMode="decimal" dir="ltr" autoFocus={autoFocus} value={value} placeholder="0" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function ExpenseSheet({ band, last, onClose, fail, Sheet, Avatar, dir, t }) {
  const [amount, setAmount] = useState(toText(last?.amount));
  const [note, setNote] = useState('');
  const [at, setAt] = useState(today());
  const [who, setWho] = useState(band.members.map((m) => m.id));
  const value = parseAmount(amount);
  const ok = value && who.length > 0;
  const save = () => {
    const all = who.length === band.members.length;
    addLedger(band.id, { kind: 'expense', amount: value, note: note.trim(), at, who: all ? null : who }).catch(fail);
    onClose();
  };
  return (
    <Sheet title={t('stage.kt.rehearsalTitle')} onClose={onClose} dir={dir} t={t} action={{ label: t('stage.kt.add'), onClick: save, disabled: !ok }}>
      <div className="stg-sheet-body">
        <AmountField label={t('stage.kt.amount')} value={amount} onChange={setAmount} autoFocus />
        <label className="stg-field">
          <span>{t('stage.kt.what')}</span>
          <input dir="auto" value={note} maxLength={200} placeholder={t('stage.kt.rehearsalItem')} onChange={(e) => setNote(e.target.value)} />
        </label>
        <label className="stg-field">
          <span>{t('stage.kt.date')}</span>
          <input type="date" value={at} onChange={(e) => setAt(e.target.value || today())} />
        </label>
        <h3 className="stg-sheet-sec">{t('stage.kt.whoWas')}</h3>
        <div className="ph-group stg-group">
          {band.members.map((m) => {
            const on = who.includes(m.id);
            return (
              <button key={m.id} type="button" className="ph-row stg-check-row" aria-pressed={on} onClick={() => setWho(on ? who.filter((x) => x !== m.id) : [...who, m.id])}>
                <Avatar m={m} small />
                <span className="ph-text">
                  <span className="ph-title" dir="auto">
                    {m.name || t('stage.band.someone')}
                  </span>
                </span>
                {on && <Check />}
              </button>
            );
          })}
        </div>
        <p className="stg-fine is-under">{value && who.length ? t('stage.kt.splitNote', { share: money(Math.round(value / who.length), document.documentElement.lang) }) : ''}</p>
      </div>
    </Sheet>
  );
}

function RoundSheet({ band, last, onClose, fail, Sheet, dir, t }) {
  const [amount, setAmount] = useState(toText(last?.amount));
  const [note, setNote] = useState('');
  const value = parseAmount(amount);
  const save = () => {
    addLedger(band.id, { kind: 'round', amount: value, note: note.trim(), at: today() }).catch(fail);
    onClose();
  };
  return (
    <Sheet title={t('stage.kt.roundSheet')} onClose={onClose} dir={dir} t={t} action={{ label: t('stage.kt.start'), onClick: save, disabled: !value }}>
      <div className="stg-sheet-body">
        <AmountField label={t('stage.kt.amountEach')} value={amount} onChange={setAmount} autoFocus />
        <label className="stg-field">
          <span>{t('stage.kt.roundNote')}</span>
          <input dir="auto" value={note} maxLength={200} placeholder={t('stage.kt.roundNotePh')} onChange={(e) => setNote(e.target.value)} />
        </label>
        <p className="stg-fine is-under">{value ? t('stage.kt.roundHint', { total: money(value * band.members.length, document.documentElement.lang), n: band.members.length }) : ''}</p>
      </div>
    </Sheet>
  );
}

function DepositSheet({ band, round, onClose, fail, Sheet, dir, t }) {
  const first = round?.open?.[0] ?? band.members[0]?.id;
  const [member, setMember] = useState(first);
  const [amount, setAmount] = useState(toText(round?.amount));
  const [at, setAt] = useState(today());
  const value = parseAmount(amount);
  const save = () => {
    const inRound = round && round.open.includes(member) && value === round.amount;
    addLedger(band.id, { kind: 'deposit', amount: value, member, round: inRound ? round.id : null, at }).catch(fail);
    onClose();
  };
  return (
    <Sheet title={t('stage.kt.depositTitle')} onClose={onClose} dir={dir} t={t} action={{ label: t('stage.kt.add'), onClick: save, disabled: !value || !member }}>
      <div className="stg-sheet-body">
        <label className="stg-field">
          <span>{t('stage.kt.who')}</span>
          <Select value={member} onChange={(e) => setMember(e.target.value)}>
            {band.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name || t('stage.band.someone')}
              </option>
            ))}
          </Select>
        </label>
        <AmountField label={t('stage.kt.amount')} value={amount} onChange={setAmount} />
        <label className="stg-field">
          <span>{t('stage.kt.date')}</span>
          <input type="date" value={at} onChange={(e) => setAt(e.target.value || today())} />
        </label>
      </div>
    </Sheet>
  );
}

function TreasurerSheet({ band, current, onClose, fail, Sheet, Avatar, dir, t }) {
  const pick = (id) => {
    setTreasurer(band.id, id).catch(fail);
    onClose();
  };
  return (
    <Sheet title={t('stage.kt.treasurer')} onClose={onClose} dir={dir} t={t}>
      <div className="stg-sheet-body">
        <div className="ph-group stg-group">
          {band.members.map((m) => (
            <button key={m.id} type="button" className="ph-row stg-check-row" aria-pressed={current === m.id || (!current && m.id === band.owner)} onClick={() => pick(m.id === band.owner ? null : m.id)}>
              <Avatar m={m} small />
              <span className="ph-text">
                <span className="ph-title" dir="auto">
                  {m.name || t('stage.band.someone')}
                </span>
              </span>
              {(current === m.id || (!current && m.id === band.owner)) && <Check />}
            </button>
          ))}
        </div>
        <p className="stg-fine is-under">{t('stage.kt.treasurerNote')}</p>
      </div>
    </Sheet>
  );
}

function EntrySheet({ e, canDelete, nameOf, m$, onClose, fail, Sheet, dir, t, lang }) {
  const [sure, setSure] = useState(false);
  const title = e.kind === 'deposit' ? t('stage.kt.deposit') : e.kind === 'round' ? t('stage.kt.round') : e.note || t('stage.kt.rehearsalItem');
  return (
    <Sheet title={title} onClose={onClose} dir={dir} t={t}>
      <div className="stg-sheet-body">
        <p className="stg-kitty-entry-amount">
          {m$(e.amount)}
          {e.kind === 'round' ? ' ' + t('stage.kt.each') : ''}
        </p>
        <div className="ph-group stg-group">
          {e.kind === 'deposit' && <Line k={t('stage.kt.who')} v={nameOf(e.member)} />}
          {e.kind === 'expense' && <Line k={t('stage.kt.whoWas')} v={e.who ? e.who.map(nameOf).join(', ') : t('stage.kt.everyone')} />}
          {e.note && e.kind !== 'expense' && <Line k={t('stage.kt.roundNote')} v={e.note} />}
          <Line k={t('stage.kt.date')} v={shortDate(e.at, lang)} />
          <Line k={t('stage.kt.by')} v={e.byName || '—'} />
        </div>
        {canDelete && (
          <div className="ph-group stg-group stg-actions">
            <button
              type="button"
              className="ph-row stg-action is-danger"
              onClick={() => {
                if (!sure) return setSure(true);
                removeLedger(e.id).catch(fail);
                onClose();
              }}
            >
              {sure ? t('stage.deleteSure') : t('stage.kt.delete')}
            </button>
          </div>
        )}
      </div>
    </Sheet>
  );
}

function Line({ k, v }) {
  return (
    <div className="stg-row">
      <span className="ph-row stg-row-main">
        <span className="ph-text">
          <span className="ph-title">{k}</span>
        </span>
        <span className="stg-detail" dir="auto">
          {v}
        </span>
      </span>
    </div>
  );
}
