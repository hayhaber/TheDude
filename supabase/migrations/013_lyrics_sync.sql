-- DudeStar v1.0.260 — lyrics timing per song (shared with the band).
-- A song's sung lines get the second each one starts in its recording
-- (from LRCLIB or tapped by a member), stored as JSON text:
--   {"v":1,"src":"lrclib"|"tap","off":0.2,"lines":[[12.3,"yesterday"], …]}
-- The charts table's existing row-level security decides who may read /
-- change it (the owner, or the band's members for a band song).
-- Safe to run more than once.

alter table public.charts add column if not exists sync text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'charts_sync_len') then
    alter table public.charts add constraint charts_sync_len check (sync is null or length(sync) <= 20000);
  end if;
end $$;

notify pgrst, 'reload schema';
