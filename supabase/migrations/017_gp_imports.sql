-- DudeStar — GuitarPro / lick-trainer imports in the account (v1.0.289).
-- Files you add in GuitarPro (Guitar Pro / MusicXML) follow your account to
-- every device, like the Band's charts — no separate code any more. Each
-- user sees only their own. Run once in the Supabase SQL Editor (after
-- 016). Safe to run again.

create table if not exists public.gp_imports (
  user_id    uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  grp        text        not null check (char_length(grp) between 1 and 80),
  name       text        check (name is null or char_length(name) <= 300),
  records    jsonb       not null default '[]'::jsonb,
  path       text        not null default '' check (char_length(path) <= 200),
  size       bigint,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, grp)
);

-- the owner is always the caller; the server's clock decides "newer";
-- a deleted import stays deleted
create or replace function public.gp_imports_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
  else
    new.user_id := old.user_id;
    new.grp := old.grp;
    if old.deleted then new.deleted := true; end if;
  end if;
  return new;
end $$;
drop trigger if exists gp_imports_touch on public.gp_imports;
create trigger gp_imports_touch before insert or update on public.gp_imports
  for each row execute function public.gp_imports_touch();

alter table public.gp_imports enable row level security;
drop policy if exists "gp imports: own" on public.gp_imports;
create policy "gp imports: own" on public.gp_imports for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.gp_imports from anon;
grant select, insert, update, delete on public.gp_imports to authenticated;

-- the files themselves: private, <user id>/<import>.bin, 30 MB each
insert into storage.buckets (id, name, public, file_size_limit)
values ('gp', 'gp', false, 31457280)
on conflict (id) do nothing;

drop policy if exists "gp files: read" on storage.objects;
drop policy if exists "gp files: add" on storage.objects;
drop policy if exists "gp files: change" on storage.objects;
drop policy if exists "gp files: delete" on storage.objects;
create policy "gp files: read" on storage.objects for select to authenticated
  using (bucket_id = 'gp' and split_part(name, '/', 1) = auth.uid()::text);
create policy "gp files: add" on storage.objects for insert to authenticated
  with check (bucket_id = 'gp' and split_part(name, '/', 1) = auth.uid()::text);
create policy "gp files: change" on storage.objects for update to authenticated
  using (bucket_id = 'gp' and split_part(name, '/', 1) = auth.uid()::text)
  with check (bucket_id = 'gp' and split_part(name, '/', 1) = auth.uid()::text);
create policy "gp files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'gp' and split_part(name, '/', 1) = auth.uid()::text);

create or replace function public.dudestar_schema() returns integer
language sql stable as $$ select 17 $$;
revoke all on function public.dudestar_schema() from public;
grant execute on function public.dudestar_schema() to authenticated;
