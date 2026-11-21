-- Band (v1.0.233): who is READY for each band song, and the pause between
-- songs in a band setlist (for the show's total length).
--   band_ready: one row per member per song — know | learning | not.
--   Every member of the band reads them; a member writes only their own.
-- Needs 002 (charts, bands, is_band_member). Safe to run more than once.

create table if not exists public.band_ready (
  chart_id   text        not null references public.charts (id) on delete cascade,
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  band_id    uuid        not null references public.bands (id) on delete cascade,
  state      text        not null check (state in ('know', 'learning', 'not')),
  updated_at timestamptz not null default now(),
  primary key (chart_id, user_id)
);
create index if not exists band_ready_band on public.band_ready (band_id);

-- the row always belongs to whoever writes it; the time is the server's
create or replace function public.band_ready_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.chart_id := old.chart_id;
    new.band_id := old.band_id;
  end if;
  return new;
end $$;
drop trigger if exists band_ready_stamp on public.band_ready;
create trigger band_ready_stamp before insert or update on public.band_ready
  for each row execute function public.band_ready_stamp();

alter table public.band_ready enable row level security;

drop policy if exists "band ready: members read" on public.band_ready;
drop policy if exists "band ready: mark mine" on public.band_ready;
drop policy if exists "band ready: change mine" on public.band_ready;
drop policy if exists "band ready: clear mine" on public.band_ready;

create policy "band ready: members read" on public.band_ready for select to authenticated
  using (public.is_band_member(band_id));
-- only my own row, only in my band, only for a song of that band
create policy "band ready: mark mine" on public.band_ready for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_band_member(band_id)
    and exists (select 1 from public.charts c where c.id = chart_id and c.band_id = band_ready.band_id and not c.deleted)
  );
create policy "band ready: change mine" on public.band_ready for update to authenticated
  using (user_id = (select auth.uid()) and public.is_band_member(band_id))
  with check (user_id = (select auth.uid()) and public.is_band_member(band_id));
create policy "band ready: clear mine" on public.band_ready for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.band_ready from anon, public;
grant select, insert, update, delete on public.band_ready to authenticated;
revoke all on function public.band_ready_stamp() from anon, public;

-- the pause between songs of a band setlist (seconds), for its total length
alter table public.band_setlists add column if not exists gap integer
  check (gap is null or gap between 0 and 600);
