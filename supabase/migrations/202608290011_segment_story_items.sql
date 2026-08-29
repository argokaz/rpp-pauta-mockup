alter table public.segments
  add column if not exists story_items jsonb not null default '[]'::jsonb;

create index if not exists segments_story_items_search_idx
on public.segments using gin (story_items);

comment on column public.segments.story_items is
  'Noticias o contenidos individuales que pertenecen a un bloque de emisión. Permite distribuir una pauta informativa sin convertir cada noticia en un bloque.';
