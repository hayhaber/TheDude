-- DudeStar — rehearsal recordings of a band song, shared with the band
-- (v1.0.245). A member records the song the band is playing; the take goes
-- up so every member can listen afterwards and see what to improve. A song
-- can have many takes. Every member reads and plays them; only who recorded
-- a take or the band's owner deletes it.
--   table song_takes  — one row per take (who, when, length, waveform)
--   bucket "takes"    — the audio (MP3), path b/<band>/<song>/<take>.mp3
-- Run once in the Supabase SQL Editor (after 002). Safe to run again.

create table if not exists public.song_takes (
  id         text        primary key check (char_length(id) between 1 and 80),
  band_id    uuid        not null references public.bands (id) on delete cascade,
  chart_id   text        not null references public.charts (id) on delete cascade,
  by_user    uuid        default auth.uid(),
  by_name    text        check (by_name is null or char_length(by_name) <= 60),
  path       text        not null check (char_length(path) <= 300),
  duration   real        check (duration is null or duration between 0 and 3600),
  peaks      jsonb,
  size       integer,
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists song_takes_band on public.song_takes (band_id, updated_at);

-- Everything about a take is fixed once it is up; it can only be deleted —
-- by who recorded it or the band's owner — and stays deleted.
create or replace function public.song_takes_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.by_user := auth.uid();
    new.created_at := now();
    new.deleted := false;
  else
    new.id := old.id;
    new.band_id := old.band_id;
    new.chart_id := old.chart_id;
    new.by_user := old.by_user;
    new.by_name := old.by_name;
    new.path := old.path;
    new.duration := old.duration;
    new.peaks := old.peaks;
    new.size := old.size;
    new.created_at := old.created_at;
    if new.deleted and not old.deleted
       and auth.uid() is distinct from old.by_user
       and auth.uid() is distinct from public.band_owner(old.band_id) then
      raise exception 'only who recorded it or the band owner deletes it';
    end if;
    if old.deleted then new.deleted := true; end if;
  end if;
  return new;
end $$;
drop trigger if exists song_takes_touch on public.song_takes;
create trigger song_takes_touch before insert or update on public.song_takes
  for each row execute function public.song_takes_touch();

alter table public.song_takes enable row level security;

drop policy if exists "song takes: members read" on public.song_takes;
drop policy if exists "song takes: members add" on public.song_takes;
drop policy if exists "song takes: members change" on public.song_takes;
create policy "song takes: members read" on public.song_takes for select to authenticated
  using (public.is_band_member(band_id));
-- a take only on a song of that band, its file in that band's folder
create policy "song takes: members add" on public.song_takes for insert to authenticated
  with check (
    public.is_band_member(band_id)
    and exists (select 1 from public.charts c where c.id = chart_id and c.band_id = song_takes.band_id and not c.deleted)
    and path like 'b/' || band_id::text || '/%'
  );
create policy "song takes: members change" on public.song_takes for update to authenticated
  using (public.is_band_member(band_id)) with check (public.is_band_member(band_id));
-- no delete policy: a take is removed by setting deleted (see the trigger)

revoke all on public.song_takes from anon;
grant select, insert, update on public.song_takes to authenticated;

-- ---- Storage: the audio ------------------------------------------------------------

-- b/<band uuid>/<song>/<take>.mp3 — the band's members only
create or replace function public.take_band(p text) returns uuid
language plpgsql immutable set search_path = '' as $$
declare
  b text := split_part(p, '/', 2);
begin
  if split_part(p, '/', 1) <> 'b' or b !~ '^[0-9a-fA-F-]{36}$' then return null; end if;
  return b::uuid;
end $$;
revoke all on function public.take_band(text) from anon, public;
grant execute on function public.take_band(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('takes', 'takes', false, 62914560, array['audio/mpeg', 'audio/wav'])
on conflict (id) do nothing;

drop policy if exists "takes files: read" on storage.objects;
drop policy if exists "takes files: add" on storage.objects;
drop policy if exists "takes files: delete" on storage.objects;
create policy "takes files: read" on storage.objects for select to authenticated
  using (bucket_id = 'takes' and public.is_band_member(public.take_band(name)));
create policy "takes files: add" on storage.objects for insert to authenticated
  with check (bucket_id = 'takes' and public.is_band_member(public.take_band(name)));
-- the one who uploaded it, or the band's owner
create policy "takes files: delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'takes'
    and public.is_band_member(public.take_band(name))
    and (owner = (select auth.uid()) or public.band_owner(public.take_band(name)) = (select auth.uid()))
  );
