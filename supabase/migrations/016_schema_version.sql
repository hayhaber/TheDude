-- DudeStar — schema version (v1.0.288). The app's Settings › Advanced ›
-- Server check reads it to know which setup scripts ran. It also repeats
-- 015 (more band parts), which the app cannot test on its own, so running
-- this file makes sure 015 is in. Run once in the Supabase SQL Editor,
-- after 001–015. Safe to run again. Every later migration bumps the number.

alter table public.band_members drop constraint if exists band_members_role_check;
alter table public.band_members add constraint band_members_role_check
  check (role is null or char_length(role) <= 300);

create or replace function public.set_member_role(b uuid, u uuid, r text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  clean text := nullif(btrim(coalesce(r, '')), '');
  part text;
begin
  if auth.uid() is null or public.band_owner(b) is distinct from auth.uid() then
    raise exception 'only the band''s manager' using errcode = '42501';
  end if;
  if not exists (select 1 from public.band_members m where m.band_id = b and m.user_id = u) then
    raise exception 'not a member' using errcode = 'P0002';
  end if;
  if clean is not null then
    if char_length(clean) > 300 then
      raise exception 'too long' using errcode = '22001';
    end if;
    foreach part in array string_to_array(clean, ',') loop
      if not (
        part in ('vocals', 'guitar', 'bass', 'drums', 'keys', 'backing', 'lead', 'acoustic',
                 'percussion', 'sax', 'trumpet', 'trombone', 'winds', 'violin', 'cello', 'flute',
                 'harmonica', 'accordion', 'ukulele', 'mandolin', 'dj', 'sound', 'other')
        or (left(part, 1) = '~' and char_length(part) between 2 and 31 and btrim(substr(part, 2)) <> '')
      ) then
        raise exception 'unknown part' using errcode = '22023';
      end if;
    end loop;
  end if;
  update public.band_members set role = clean where band_id = b and user_id = u;
end $$;

revoke all on function public.set_member_role(uuid, uuid, text) from anon, public;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

create or replace function public.dudestar_schema() returns integer
language sql stable as $$ select 16 $$;
revoke all on function public.dudestar_schema() from public;
grant execute on function public.dudestar_schema() to authenticated;
