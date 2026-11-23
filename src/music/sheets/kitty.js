// The band's kitty (v1.0.250) — pure. Everyone puts the same amount in
// (a top-up ROUND), every rehearsal is paid from the kitty (an EXPENSE,
// shared equally by the members who were there — everyone by default),
// until it runs low and the next round starts. Amounts are integers in
// agorot / cents.
//   entry = { id, kind: 'round'|'deposit'|'expense', amount, member,
//             round, note, who: [userId]|null, at: 'YYYY-MM-DD', by, created }

/** The kitty's state for a band's current members. */
export function kittyOf(entries, memberIds) {
  const live = entries.filter((e) => !e.deleted);
  const deposits = live.filter((e) => e.kind === 'deposit');
  const expenses = live.filter((e) => e.kind === 'expense');
  const rounds = live.filter((e) => e.kind === 'round').sort(byTime);
  const inKitty = sum(deposits) - sum(expenses);

  // each member: what they put in, their share of what was spent
  const per = Object.fromEntries(memberIds.map((id) => [id, { paid: 0, share: 0 }]));
  for (const d of deposits) if (per[d.member]) per[d.member].paid += d.amount;
  for (const x of expenses) {
    const who = (x.who?.length ? x.who : memberIds).filter((id) => per[id]);
    if (!who.length) continue;
    // split to the agora: the first members carry the remainder
    const base = Math.floor(x.amount / who.length);
    let rest = x.amount - base * who.length;
    for (const id of who) {
      per[id].share += base + (rest > 0 ? 1 : 0);
      rest -= 1;
    }
  }
  for (const id of memberIds) per[id].net = per[id].paid - per[id].share;

  // the newest round: who has put their part in
  const round = rounds[rounds.length - 1] ?? null;
  let roundState = null;
  if (round) {
    const paidBy = new Set(deposits.filter((d) => d.round === round.id).map((d) => d.member));
    roundState = { ...round, paid: memberIds.filter((id) => paidBy.has(id)), open: memberIds.filter((id) => !paidBy.has(id)) };
  }

  // how many more rehearsals the kitty pays, at the last rehearsal's cost
  const last = [...expenses].sort(byTime).pop() ?? null;
  const left = last ? Math.floor(Math.max(0, inKitty) / last.amount) : null;

  return { inKitty, per, round: roundState, lastExpense: last, rehearsalsLeft: left, low: last ? inKitty < last.amount : false };
}

const sum = (list) => list.reduce((n, e) => n + e.amount, 0);
const byTime = (a, b) => (a.at || '').localeCompare(b.at || '') || (a.created || 0) - (b.created || 0);

/** History, newest first. */
export const historyOf = (entries) => entries.filter((e) => !e.deleted).sort((a, b) => -byTime(a, b));

/** "150" / "150.50" -> 15000 / 15050; bad input -> null. */
export function parseAmount(text) {
  const s = String(text ?? '').replace(/[,\s₪$€]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const v = Math.round(parseFloat(s) * 100);
  return v > 0 && v <= 100000000 ? v : null;
}

/** 15000 -> "₪150", 15050 -> "₪150.50" (in the reading language). */
export function money(amount, lang = 'he', currency = 'ILS', sign = false) {
  const whole = amount % 100 === 0;
  try {
    return new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-IL', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
      signDisplay: sign ? 'exceptZero' : 'auto',
    }).format(amount / 100);
  } catch {
    return (amount / 100).toFixed(whole ? 0 : 2);
  }
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
