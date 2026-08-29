alter table public.emissions
  add column if not exists producer_name text not null default '';

comment on column public.emissions.producer_name is
  'Nombre editorial del productor responsable de la pauta; independiente del usuario autenticado que la guarda.';
