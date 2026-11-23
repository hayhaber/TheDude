-- DudeStar — every member's avatar (colour / emoji) seen by the whole band
-- (v1.0.247). Each member writes their own row's name + avatar; the rest of
-- a membership row (which band, which user, when joined) is fixed.
-- Run once in the Supabase SQL Editor (after 002). Safe to run again.

alter table public.band_members
  add column if not exists avatar text check (avatar is null or char_length(avatar) <= 300);

-- A member may change only their name and avatar: the band, the user and the
-- join date stay as they were (before this, the "own name" update policy let a
-- member move their own row to another band's id).
create or replace function public.band_members_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.band_id := old.band_id;
  new.user_id := old.user_id;
  new.joined_at := old.joined_at;
  return new;
end $$;
drop trigger if exists band_members_touch on public.band_members;
create trigger band_members_touch before update on public.band_members
  for each row execute function public.band_members_touch();
