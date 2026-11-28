-- DudeStar — rehearsal recordings of MY OWN songs in the cloud too (v1.0.291).
-- 009 put the takes of a BAND song in the cloud for the band. A take of a
-- song of my own (not in a band) now goes up the same way, visible only to
-- me, on every device I sign in to — nothing stays on the phone.
--   song_takes: band_id may be empty = my own take (only I read / add / delete)
--   bucket "takes": u/<my user id>/<song>/<take>.mp3 = my own folder
-- Run once in the Supabase SQL Editor (after 009). Safe to run again.

alter table public.song_takes alter column band_id drop not null;
create index if not exists song_takes_mine on public.song_takes (by_user, updated_at) where band_id is null;

drop policy if exists "song takes: mine read" on public.song_takes;
drop policy if exists "song takes: mine add" on public.song_takes;
drop policy if exists "song takes: mine change" on public.song_takes;
create policy "song takes: mine read" on public.song_takes for select to authenticated
  using (band_id is null and by_user = (select auth.uid()));
-- only on a song of my own, its file in my own folder
create policy "song takes: mine add" on public.song_takes for insert to authenticated
  with check (
    band_id is null
    and exists (select 1 from public.charts c where c.id = chart_id and c.band_id is null and c.owner = (select auth.uid()) and not c.deleted)
    and path like 'u/' || (select auth.uid())::text || '/%'
  );
create policy "song takes: mine change" on public.song_takes for update to authenticated
  using (band_id is null and by_user = (select auth.uid()))
  with check (band_id is null and by_user = (select auth.uid()));

-- ---- Storage: my own folder in "takes" ------------------------------------------------

drop policy if exists "takes files: mine read" on storage.objects;
drop policy if exists "takes files: mine add" on storage.objects;
drop policy if exists "takes files: mine delete" on storage.objects;
create policy "takes files: mine read" on storage.objects for select to authenticated
  using (bucket_id = 'takes' and split_part(name, '/', 1) = 'u' and split_part(name, '/', 2) = (select auth.uid())::text);
create policy "takes files: mine add" on storage.objects for insert to authenticated
  with check (bucket_id = 'takes' and split_part(name, '/', 1) = 'u' and split_part(name, '/', 2) = (select auth.uid())::text);
create policy "takes files: mine delete" on storage.objects for delete to authenticated
  using (bucket_id = 'takes' and split_part(name, '/', 1) = 'u' and split_part(name, '/', 2) = (select auth.uid())::text);

-- the server's version (Settings › Advanced › Server)
create or replace function public.dudestar_schema() returns integer
language sql stable as $$ select 18 $$;
revoke all on function public.dudestar_schema() from public;
grant execute on function public.dudestar_schema() to authenticated;
