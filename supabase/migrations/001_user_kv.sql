-- DudeStar cloud sync, step 1 (2026-10-23): one row per personal setting /
-- progress key of a signed-in user. The app mirrors its per-profile
-- localStorage keys here; the value is the exact localStorage string.
-- Security: Row Level Security — a user can read and write ONLY rows whose
-- user_id is their own auth id. The anon (signed-out) role gets nothing.

create table if not exists public.user_kv (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  key        text        not null check (char_length(key) between 1 and 200),
  value      text        check (value is null or char_length(value) <= 2000000),
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists user_kv_user_updated on public.user_kv (user_id, updated_at);

-- the server's clock decides "newer", never the device's
create or replace function public.user_kv_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.user_id := auth.uid();
  return new;
end $$;

drop trigger if exists user_kv_touch on public.user_kv;
create trigger user_kv_touch before insert or update on public.user_kv
  for each row execute function public.user_kv_touch();

alter table public.user_kv enable row level security;

drop policy if exists "own rows: select" on public.user_kv;
drop policy if exists "own rows: insert" on public.user_kv;
drop policy if exists "own rows: update" on public.user_kv;
drop policy if exists "own rows: delete" on public.user_kv;
create policy "own rows: select" on public.user_kv for select to authenticated using ((select auth.uid()) = user_id);
create policy "own rows: insert" on public.user_kv for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "own rows: update" on public.user_kv for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows: delete" on public.user_kv for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_kv from anon, public;
grant select, insert, update, delete on public.user_kv to authenticated;

-- "Delete my account": removes the user and (cascade) all their rows
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from anon, public;
grant execute on function public.delete_my_account() to authenticated;
