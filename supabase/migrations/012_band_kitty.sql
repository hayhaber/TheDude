-- DudeStar — the band's kitty (v1.0.250). Members put money in (a top-up
-- round: "everyone puts in 150"), each rehearsal is paid from it, until it
-- runs low and the next round starts. A record book only — no money moves
-- through the app. Every member reads it; only the band's manager or its
-- treasurer writes it.
--   band_kitty   one row per band: who the treasurer is
--   band_ledger  the entries: round (amount each) / deposit / expense
-- Amounts are whole agorot / cents (integer).
-- Run once in the Supabase SQL Editor (after 002). Safe to run again.

create table if not exists public.band_kitty (
  band_id    uuid        primary key references public.bands (id) on delete cascade,
  treasurer  uuid        references auth.users (id) on delete set null,
  currency   text        not null default 'ILS' check (currency ~ '^[A-Z]{3}$'),
  updated_at timestamptz not null default now()
);

create table if not exists public.band_ledger (
  id         text        primary key check (char_length(id) between 1 and 80),
  band_id    uuid        not null references public.bands (id) on delete cascade,
  kind       text        not null check (kind in ('round', 'deposit', 'expense')),
  amount     integer     not null check (amount > 0 and amount <= 100000000),
  member     uuid,                       -- deposit: who put the money in
  round_id   text        check (round_id is null or char_length(round_id) <= 80),
  note       text        check (note is null or char_length(note) <= 200),
  who        uuid[],                     -- expense: who shares it (null = everyone)
  at         date        not null default current_date,
  by_user    uuid        default auth.uid(),
  by_name    text        check (by_name is null or char_length(by_name) <= 60),
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists band_ledger_band on public.band_ledger (band_id, updated_at);

-- may write the kitty: the band's manager or its treasurer
create or replace function public.band_cashier(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.bands x where x.id = b and x.owner = auth.uid())
      or exists (select 1 from public.band_kitty k where k.band_id = b and k.treasurer = auth.uid()
                   and exists (select 1 from public.band_members m where m.band_id = b and m.user_id = auth.uid()));
$$;
revoke all on function public.band_cashier(uuid) from anon, public;
grant execute on function public.band_cashier(uuid) to authenticated;

-- the manager names the treasurer (a member of the band, or nobody)
create or replace function public.set_treasurer(b uuid, u uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.bands x where x.id = b and x.owner = auth.uid()) then
    raise exception 'only the band''s manager names the treasurer' using errcode = '42501';
  end if;
  if u is not null and not exists (select 1 from public.band_members m where m.band_id = b and m.user_id = u) then
    raise exception 'not a member' using errcode = 'P0002';
  end if;
  insert into public.band_kitty (band_id, treasurer) values (b, u)
    on conflict (band_id) do update set treasurer = excluded.treasurer, updated_at = now();
end $$;
revoke all on function public.set_treasurer(uuid, uuid) from anon, public;
grant execute on function public.set_treasurer(uuid, uuid) to authenticated;

-- an entry keeps its band, author and time; a deleted entry stays deleted
create or replace function public.band_ledger_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.by_user := auth.uid();
    new.created_at := now();
    new.deleted := false;
  else
    new.band_id := old.band_id;
    new.by_user := old.by_user;
    new.by_name := old.by_name;
    new.created_at := old.created_at;
    if old.deleted then new.deleted := true; end if;
  end if;
  return new;
end $$;
drop trigger if exists band_ledger_touch on public.band_ledger;
create trigger band_ledger_touch before insert or update on public.band_ledger
  for each row execute function public.band_ledger_touch();

alter table public.band_kitty enable row level security;
alter table public.band_ledger enable row level security;

drop policy if exists "kitty: members read" on public.band_kitty;
create policy "kitty: members read" on public.band_kitty for select to authenticated
  using (public.is_band_member(band_id));
-- (written only through set_treasurer)

drop policy if exists "ledger: members read" on public.band_ledger;
drop policy if exists "ledger: cashier adds" on public.band_ledger;
drop policy if exists "ledger: cashier changes" on public.band_ledger;
create policy "ledger: members read" on public.band_ledger for select to authenticated
  using (public.is_band_member(band_id));
create policy "ledger: cashier adds" on public.band_ledger for insert to authenticated
  with check (public.is_band_member(band_id) and public.band_cashier(band_id));
create policy "ledger: cashier changes" on public.band_ledger for update to authenticated
  using (public.band_cashier(band_id)) with check (public.band_cashier(band_id));
-- no delete policy: an entry is removed by setting deleted

revoke all on public.band_kitty, public.band_ledger from anon;
grant select on public.band_kitty to authenticated;
grant select, insert, update on public.band_ledger to authenticated;
