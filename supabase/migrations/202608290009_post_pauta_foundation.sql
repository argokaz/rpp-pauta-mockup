alter table public.emissions
  add column if not exists post_review_status text not null default 'capture'
    check (post_review_status in ('capture', 'review', 'verified')),
  add column if not exists post_notes text not null default '',
  add column if not exists media_source_type text not null default 'none'
    check (media_source_type in ('none', 'youtube', 'audio', 'internal')),
  add column if not exists media_source_url text not null default '',
  add column if not exists transcript_status text not null default 'none'
    check (transcript_status in ('none', 'pending', 'processing', 'ready', 'failed')),
  add column if not exists post_verified_at timestamptz,
  add column if not exists post_verified_by uuid references public.profiles(id) on delete set null;

alter table public.segments
  add column if not exists post_summary text not null default '',
  add column if not exists key_quote text not null default '',
  add column if not exists quote_verified boolean not null default false;

comment on column public.segments.disposition is
  'Resultado real del bloque: emitido, parcial, omitido o añadido durante el vivo.';

comment on column public.segments.post_summary is
  'Resumen editorial verificado de lo que ocurrió o se dijo durante el bloque.';

comment on column public.segments.key_quote is
  'Cita o idea destacada; quote_verified distingue una cita textual comprobada.';

comment on column public.emissions.media_source_url is
  'Fuente autorizada para transcripción o consulta posterior: YouTube, audio o grabación interna.';
