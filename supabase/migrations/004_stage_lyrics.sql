-- Stage (v1.0.206): a song's WORDS (for the singer) and its first sung note
-- reach my other devices and the band. A song may now be words only, with
-- no PDF: its `path` is then '' (no file in Storage).
-- Safe to run more than once.
alter table public.charts add column if not exists lyrics text check (lyrics is null or char_length(lyrics) <= 20000);
alter table public.charts add column if not exists start_note smallint check (start_note is null or start_note between 24 and 96);
