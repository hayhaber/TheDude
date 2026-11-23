-- DudeStar — each member's part in the band (vocals, guitar, bass…), seen
-- by the whole band (v1.0.249). A member writes only their own row (the
-- "own name" policy + the 010 trigger keep everything else fixed).
-- Run once in the Supabase SQL Editor (after 002). Safe to run again.

alter table public.band_members
  add column if not exists role text check (role is null or char_length(role) <= 120);
