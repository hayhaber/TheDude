-- Stage (v1.0.189): a chart's tempo (for the count-in) and its stage notes
-- (capo, who counts in, how it ends) reach the band and my other devices.
-- Safe to run more than once, and after 002 whether or not 002 already had them.
alter table public.charts add column if not exists bpm integer check (bpm is null or bpm between 30 and 300);
alter table public.charts add column if not exists notes text check (notes is null or char_length(notes) <= 300);
