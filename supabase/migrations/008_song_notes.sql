-- DudeStar — rehearsal notes on a band song (v1.0.244).
-- After a rehearsal every member can leave a note on a song ("the bridge
-- drags", "shorter intro"); a change to the song's key / tempo / length is
-- written there too, by itself, with who made it. Every member reads them,
-- marks them done; only the writer edits a note's text; only the writer or
-- the band's owner deletes one.
-- Run once in the Supabase SQL Editor (after 002). Safe to run again.

create table if not exists public.song_notes (
  id         text        primary key check (char_length(id) between 1 and 80),
  band_id    uuid        not null references public.bands (id) on delete cascade,
  chart_id   text        not null references public.charts (id) on delete cascade,
  by_user    uuid        default auth.uid(),
  by_name    text        check (by_name is null or char_length(by_name) <= 60),
  kind       text        not null default 'note' check (kind in ('note', 'change')),
  body       text        check (body is null or char_length(body) <= 1000),
  data       jsonb,
  done       boolean     not null default false,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists song_notes_band on public.song_notes (band_id, updated_at);

-- Who wrote it, when, on which song — fixed. The text only by its writer;
-- delete (deleted = true) only by the writer or the band's owner; a deleted
-- note stays deleted.
create or replace function public.song_notes_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.by_user := auth.uid();
    new.created_at := now();
    new.deleted := false;
  else
    new.band_id := old.band_id;
    new.chart_id := old.chart_id;
    new.by_user := old.by_user;
    new.by_name := old.by_name;
    new.kind := old.kind;
    new.data := old.data;
    new.created_at := old.created_at;
    if auth.uid() is distinct from old.by_user then new.body := old.body; end if;
    if new.deleted and not old.deleted
       and auth.uid() is distinct from old.by_user
       and auth.uid() is distinct from public.band_owner(old.band_id) then
      raise exception 'only who wrote it or the band owner deletes it';
    end if;
    if old.deleted then new.deleted := true; end if;
  end if;
  return new;
end $$;
drop trigger if exists song_notes_touch on public.song_notes;
create trigger song_notes_touch before insert or update on public.song_notes
  for each row execute function public.song_notes_touch();

alter table public.song_notes enable row level security;

drop policy if exists "song notes: members read" on public.song_notes;
drop policy if exists "song notes: members add" on public.song_notes;
drop policy if exists "song notes: members change" on public.song_notes;
create policy "song notes: members read" on public.song_notes for select to authenticated
  using (public.is_band_member(band_id));
-- a note only on a song of that band
create policy "song notes: members add" on public.song_notes for insert to authenticated
  with check (
    public.is_band_member(band_id)
    and exists (select 1 from public.charts c where c.id = chart_id and c.band_id = song_notes.band_id and not c.deleted)
  );
create policy "song notes: members change" on public.song_notes for update to authenticated
  using (public.is_band_member(band_id)) with check (public.is_band_member(band_id));
-- no delete policy: a note is removed by setting deleted (see the trigger)

revoke all on public.song_notes from anon;
grant select, insert, update on public.song_notes to authenticated;
