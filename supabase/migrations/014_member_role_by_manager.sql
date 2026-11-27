-- DudeStar — the band's manager sets each member's part (vocals, guitar…)
-- (v1.0.277). A member still writes only their own row directly (011); this
-- function lets the band's owner write the `role` of any member of THEIR
-- band — nothing else in the row, no other band.
-- Run once in the Supabase SQL Editor (after 011). Safe to run again.

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
    if char_length(clean) > 120 then
      raise exception 'too long' using errcode = '22001';
    end if;
    foreach part in array string_to_array(clean, ',') loop
      if part not in ('vocals', 'guitar', 'bass', 'drums', 'keys', 'winds', 'other') then
        raise exception 'unknown part' using errcode = '22023';
      end if;
    end loop;
  end if;
  update public.band_members set role = clean where band_id = b and user_id = u;
end $$;

revoke all on function public.set_member_role(uuid, uuid, text) from anon, public;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;
