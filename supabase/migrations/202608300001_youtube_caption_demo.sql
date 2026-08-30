create table if not exists public.media_transcripts (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references public.programs(id) on delete cascade,
  target_date date not null,
  source_type text not null default 'youtube_unofficial'
    check (source_type in ('youtube_unofficial', 'youtube_official', 'uploaded', 'internal')),
  source_url text not null,
  source_id text not null,
  media_title text not null default '',
  language_code text not null default 'es',
  provider text not null,
  caption_items jsonb not null default '[]'::jsonb
    check (jsonb_typeof(caption_items) = 'array'),
  caption_count integer not null default 0 check (caption_count >= 0),
  extracted_at timestamptz not null default now(),
  extracted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, target_date, source_id, language_code)
);

create index if not exists media_transcripts_program_date_idx
  on public.media_transcripts(program_id, target_date desc);

alter table public.media_transcripts enable row level security;

create policy media_transcripts_read on public.media_transcripts
  for select to authenticated using (true);

create policy media_transcripts_write on public.media_transcripts
  for all to authenticated
  using (public.can_manage_program(program_id))
  with check (public.can_manage_program(program_id));

grant select, insert, update, delete on public.media_transcripts to authenticated;

comment on table public.media_transcripts is
  'Caché reemplazable de captions por programa y fecha. El proveedor no oficial se usa solo durante el piloto.';

comment on column public.media_transcripts.caption_items is
  'Segmentos con startMs, endMs y text. Se consultan bajo demanda y no forman parte de la carga inicial del workspace.';
