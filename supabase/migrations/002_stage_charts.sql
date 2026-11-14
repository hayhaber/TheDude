-- DudeStar Stage, step 2 (2026-11-14): chart PDFs in the cloud — on every
-- device of their owner, and shared with a BAND (a group of users who joined
-- with the band's invite code). Run once in the Supabase SQL Editor.
--
--   bands          a band: name, owner, invite code
--   band_members   who is in it (the owner too)
--   charts         one row per chart PDF: personal (band_id null) or a band's;
--                  the file itself is in Storage, bucket "charts":
--                  u/<user id>/<chart id>.pdf   or   b/<band id>/<chart id>.pdf
--   band_setlists  a band's setlists (personal setlists sync as before)
--
-- Security (Row Level Security everywhere): a user reaches only their own
-- personal charts and the charts / setlists / members of bands they are in.
-- Bands are created / joined / left only through the functions below.
-- The anon (signed-out) role gets nothing.

-- ---- tables -----------------------------------------------------------------

create table if not exists public.bands (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 1 and 80),
  owner       uuid        not null references auth.users (id) on delete cascade,
  invite_code text        not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.band_members (
  band_id      uuid        not null references public.bands (id) on delete cascade,
  user_id      uuid        not null references auth.users (id) on delete cascade,
  display_name text        check (display_name is null or char_length(display_name) <= 60),
  joined_at    timestamptz not null default now(),
  primary key (band_id, user_id)
);
create index if not exists band_members_user on public.band_members (user_id);

create table if not exists public.charts (
  id         text        primary key check (char_length(id) between 1 and 80),
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  band_id    uuid        references public.bands (id) on delete cascade,
  name       text        not null check (char_length(name) between 1 and 200),
  size       integer,
  path       text        not null check (char_length(path) <= 300),
  dur        integer     check (dur is null or dur between 10 and 3600),
  tr         integer     check (tr is null or tr between -11 and 11),
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists charts_owner on public.charts (owner, updated_at);
create index if not exists charts_band on public.charts (band_id, updated_at);

create table if not exists public.band_setlists (
  id         text        primary key check (char_length(id) between 1 and 80),
  band_id    uuid        not null references public.bands (id) on delete cascade,
  name       text        not null check (char_length(name) between 1 and 120),
  items      jsonb       not null default '[]'::jsonb,
  deleted    boolean     not null default false,
  updated_by uuid        default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists band_setlists_band on public.band_setlists (band_id, updated_at);

-- ---- helpers (security definer: they read past RLS, return yes / no only) -----

create or replace function public.is_band_member(b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.band_members m where m.band_id = b and m.user_id = auth.uid());
$$;

create or replace function public.band_owner(b uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select owner from public.bands where id = b;
$$;

-- Storage paths: u/<my id>/…  or  b/<a band I'm in>/…
create or replace function public.can_use_chart_path(p text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  kind text := split_part(p, '/', 1);
  who  text := split_part(p, '/', 2);
begin
  if auth.uid() is null then return false; end if;
  if kind = 'u' then return who = auth.uid()::text; end if;
  if kind = 'b' then return public.is_band_member(who::uuid); end if;
  return false;
exception when others then
  return false;
end $$;

-- the server's clock decides "newer"; the owner is always the caller
create or replace function public.charts_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then new.owner := auth.uid(); else new.owner := old.owner; end if;
  return new;
end $$;
drop trigger if exists charts_touch on public.charts;
create trigger charts_touch before insert or update on public.charts
  for each row execute function public.charts_touch();

create or replace function public.band_setlists_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  if tg_op = 'UPDATE' then new.band_id := old.band_id; end if;
  return new;
end $$;
drop trigger if exists band_setlists_touch on public.band_setlists;
create trigger band_setlists_touch before insert or update on public.band_setlists
  for each row execute function public.band_setlists_touch();

-- ---- bands: create / join / leave / new code ----------------------------------

create or replace function public.create_band(band_name text, member_name text default null) returns public.bands
language plpgsql security definer set search_path = '' as $$
declare
  b public.bands;
  code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if coalesce(trim(band_name), '') = '' then raise exception 'name'; end if;
  loop
    code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
             from generate_series(1, 8));
    exit when not exists (select 1 from public.bands where invite_code = code);
  end loop;
  insert into public.bands (name, owner, invite_code) values (left(trim(band_name), 80), auth.uid(), code) returning * into b;
  insert into public.band_members (band_id, user_id, display_name) values (b.id, auth.uid(), left(member_name, 60));
  return b;
end $$;

create or replace function public.join_band(code text, member_name text default null) returns public.bands
language plpgsql security definer set search_path = '' as $$
declare
  b public.bands;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into b from public.bands where invite_code = upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then raise exception 'no band' using errcode = 'P0002'; end if;
  insert into public.band_members (band_id, user_id, display_name) values (b.id, auth.uid(), left(member_name, 60))
    on conflict (band_id, user_id) do update set display_name = coalesce(excluded.display_name, public.band_members.display_name);
  return b;
end $$;

create or replace function public.leave_band(b uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.band_owner(b) = auth.uid() then raise exception 'the owner deletes the band instead'; end if;
  delete from public.band_members where band_id = b and user_id = auth.uid();
end $$;

create or replace function public.new_invite_code(b uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  code text;
begin
  if public.band_owner(b) is distinct from auth.uid() then raise exception 'owner only'; end if;
  loop
    code := (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
             from generate_series(1, 8));
    exit when not exists (select 1 from public.bands where invite_code = code);
  end loop;
  update public.bands set invite_code = code where id = b;
  return code;
end $$;

-- ---- Row Level Security ---------------------------------------------------------

alter table public.bands enable row level security;
alter table public.band_members enable row level security;
alter table public.charts enable row level security;
alter table public.band_setlists enable row level security;

drop policy if exists "bands: members read" on public.bands;
drop policy if exists "bands: owner renames" on public.bands;
drop policy if exists "bands: owner deletes" on public.bands;
create policy "bands: members read" on public.bands for select to authenticated using (public.is_band_member(id));
create policy "bands: owner renames" on public.bands for update to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
create policy "bands: owner deletes" on public.bands for delete to authenticated using (owner = (select auth.uid()));

drop policy if exists "members: members read" on public.band_members;
drop policy if exists "members: own name" on public.band_members;
drop policy if exists "members: owner removes" on public.band_members;
create policy "members: members read" on public.band_members for select to authenticated using (public.is_band_member(band_id));
create policy "members: own name" on public.band_members for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "members: owner removes" on public.band_members for delete to authenticated
  using (public.band_owner(band_id) = (select auth.uid()) and user_id <> (select auth.uid()));

drop policy if exists "charts: read" on public.charts;
drop policy if exists "charts: add" on public.charts;
drop policy if exists "charts: change" on public.charts;
drop policy if exists "charts: delete" on public.charts;
create policy "charts: read" on public.charts for select to authenticated
  using ((band_id is null and owner = (select auth.uid())) or (band_id is not null and public.is_band_member(band_id)));
create policy "charts: add" on public.charts for insert to authenticated
  with check ((band_id is null) or public.is_band_member(band_id));
create policy "charts: change" on public.charts for update to authenticated
  using ((band_id is null and owner = (select auth.uid())) or (band_id is not null and public.is_band_member(band_id)))
  with check ((band_id is null and owner = (select auth.uid())) or (band_id is not null and public.is_band_member(band_id)));
create policy "charts: delete" on public.charts for delete to authenticated
  using ((band_id is null and owner = (select auth.uid())) or (band_id is not null and public.is_band_member(band_id)));

drop policy if exists "setlists: members" on public.band_setlists;
create policy "setlists: members" on public.band_setlists for all to authenticated
  using (public.is_band_member(band_id)) with check (public.is_band_member(band_id));

revoke all on public.bands, public.band_members, public.charts, public.band_setlists from anon, public;
grant select, update, delete on public.bands to authenticated;
grant select, update, delete on public.band_members to authenticated;
grant select, insert, update, delete on public.charts to authenticated;
grant select, insert, update, delete on public.band_setlists to authenticated;

revoke all on function public.create_band(text, text), public.join_band(text, text), public.leave_band(uuid), public.new_invite_code(uuid) from anon, public;
grant execute on function public.create_band(text, text), public.join_band(text, text), public.leave_band(uuid), public.new_invite_code(uuid) to authenticated;
revoke all on function public.is_band_member(uuid), public.band_owner(uuid), public.can_use_chart_path(text) from anon, public;
grant execute on function public.is_band_member(uuid), public.band_owner(uuid), public.can_use_chart_path(text) to authenticated;

-- ---- Storage: the PDFs ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('charts', 'charts', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "charts files: read" on storage.objects;
drop policy if exists "charts files: add" on storage.objects;
drop policy if exists "charts files: change" on storage.objects;
drop policy if exists "charts files: delete" on storage.objects;
create policy "charts files: read" on storage.objects for select to authenticated
  using (bucket_id = 'charts' and public.can_use_chart_path(name));
create policy "charts files: add" on storage.objects for insert to authenticated
  with check (bucket_id = 'charts' and public.can_use_chart_path(name));
create policy "charts files: change" on storage.objects for update to authenticated
  using (bucket_id = 'charts' and public.can_use_chart_path(name))
  with check (bucket_id = 'charts' and public.can_use_chart_path(name));
create policy "charts files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'charts' and public.can_use_chart_path(name));
