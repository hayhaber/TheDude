-- DudeStar — a band's song suggestions (v1.0.212): building a cover band's
-- repertoire. Every member suggests songs; the band sees one shared list,
-- votes, and picks the songs to rehearse.
-- Run once in the Supabase SQL Editor (after 002). Safe to run again.

create table if not exists public.band_suggestions (
  id         text        primary key check (char_length(id) between 1 and 80),
  band_id    uuid        not null references public.bands (id) on delete cascade,
  title      text        not null check (char_length(title) between 1 and 120),
  artist     text        check (artist is null or char_length(artist) <= 120),
  link       text        check (link is null or (char_length(link) <= 500 and link ~* '^https?://')),
  note       text        check (note is null or char_length(note) <= 500),
  status     text        not null default 'open' check (status in ('open', 'picked', 'dropped')),
  song_id    text        check (song_id is null or char_length(song_id) <= 80),
  votes      uuid[]      not null default '{}',
  by_user    uuid        default auth.uid(),
  by_name    text        check (by_name is null or char_length(by_name) <= 60),
  deleted    boolean     not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists band_suggestions_band on public.band_suggestions (band_id, updated_at);

-- Who suggested it, when, which band — fixed. Votes change only through
-- toggle_suggestion_vote() (one vote per member, no lost votes when two
-- members tap at once). Only the one who suggested it or the band's owner
-- may delete it.
create or replace function public.band_suggestions_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.by_user := auth.uid();
    new.created_at := now();
    new.votes := array[auth.uid()];
    new.deleted := false;
  else
    new.band_id := old.band_id;
    new.by_user := old.by_user;
    new.by_name := old.by_name;
    new.created_at := old.created_at;
    if coalesce(current_setting('dudestar.vote', true), '') <> '1' then new.votes := old.votes; end if;
    if new.deleted and not old.deleted
       and auth.uid() is distinct from old.by_user
       and auth.uid() is distinct from public.band_owner(old.band_id) then
      raise exception 'only who suggested it or the band owner deletes it';
    end if;
    if old.deleted then new.deleted := true; end if;
  end if;
  return new;
end $$;
drop trigger if exists band_suggestions_touch on public.band_suggestions;
create trigger band_suggestions_touch before insert or update on public.band_suggestions
  for each row execute function public.band_suggestions_touch();

create or replace function public.toggle_suggestion_vote(s text) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  b uuid;
  v uuid[];
begin
  select band_id into b from public.band_suggestions where id = s and not deleted;
  if b is null or not public.is_band_member(b) then raise exception 'no suggestion' using errcode = 'P0002'; end if;
  perform set_config('dudestar.vote', '1', true);
  update public.band_suggestions
     set votes = case when auth.uid() = any(votes) then array_remove(votes, auth.uid()) else array_append(votes, auth.uid()) end
   where id = s
   returning votes into v;
  perform set_config('dudestar.vote', '', true);
  return v;
end $$;

alter table public.band_suggestions enable row level security;

drop policy if exists "suggestions: members read" on public.band_suggestions;
drop policy if exists "suggestions: members add" on public.band_suggestions;
drop policy if exists "suggestions: members change" on public.band_suggestions;
create policy "suggestions: members read" on public.band_suggestions for select to authenticated
  using (public.is_band_member(band_id));
create policy "suggestions: members add" on public.band_suggestions for insert to authenticated
  with check (public.is_band_member(band_id));
create policy "suggestions: members change" on public.band_suggestions for update to authenticated
  using (public.is_band_member(band_id)) with check (public.is_band_member(band_id));
-- no delete policy: a suggestion is removed by setting deleted (see the trigger)

revoke all on public.band_suggestions from anon;
grant select, insert, update on public.band_suggestions to authenticated;
revoke all on function public.toggle_suggestion_vote(text) from anon, public;
grant execute on function public.toggle_suggestion_vote(text) to authenticated;
