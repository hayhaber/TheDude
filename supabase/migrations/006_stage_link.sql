-- Stage (v1.0.227): a song's listening link (YouTube / Spotify / Apple Music
-- or any https page) reaches my other devices and the band.
-- Safe to run more than once.
alter table public.charts add column if not exists link text
  check (link is null or (link ~* '^https://' and char_length(link) <= 500));
