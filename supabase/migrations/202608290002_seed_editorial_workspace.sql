insert into public.programs (id, name, short_name, hosts, managed) values
  (
    'encendidos',
    'Encendidos',
    'Encendidos',
    'Sara Abu Sabbah y Carlos Galdós',
    true
  ),
  (
    'rotativa-noche',
    'La Rotativa del Aire | Edición Noche',
    'Rotativa Noche',
    'Jesús Miguel Calderón',
    true
  )
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  hosts = excluded.hosts,
  managed = excluded.managed;

insert into public.bulletins (
  id, week_start, title, body, scope, active
) values
  (
    '00000000-0000-4000-8000-000000000001',
    '2026-08-24',
    'Elecciones 2026: confirmar voceros antes de las 15:00',
    'Registrar nombre, cargo y teléfono de coordinación de cada invitado.',
    'all',
    true
  ),
  (
    '00000000-0000-4000-8000-000000000002',
    '2026-08-24',
    'Nombrar los audios antes de subirlos',
    'Usar fecha, programa e invitado para facilitar el archivo y la búsqueda.',
    'informative',
    true
  )
on conflict (id) do update set
  week_start = excluded.week_start,
  title = excluded.title,
  body = excluded.body,
  scope = excluded.scope,
  active = excluded.active;

insert into public.important_dates (
  id, event_date, title, details
) values
  (
    '00000000-0000-4000-8000-000000000101',
    '2026-08-28',
    'Cierre de encuestas',
    'Preparar un bloque explicativo y confirmar voceros.'
  ),
  (
    '00000000-0000-4000-8000-000000000102',
    '2026-08-30',
    'Santa Rosa de Lima',
    'Cobertura de seguridad, tránsito y actividades religiosas.'
  )
on conflict (id) do update set
  event_date = excluded.event_date,
  title = excluded.title,
  details = excluded.details;

insert into public.important_date_plans (
  important_date_id, program_id, planned, notes
) values
  (
    '00000000-0000-4000-8000-000000000101',
    'encendidos',
    true,
    'Explicar el cierre y preparar preguntas para especialistas.'
  ),
  (
    '00000000-0000-4000-8000-000000000101',
    'rotativa-noche',
    true,
    'Resumen de la jornada y reacciones.'
  )
on conflict (important_date_id, program_id) do update set
  planned = excluded.planned,
  notes = excluded.notes;

with saved_emission as (
  insert into public.emissions (
    id, program_id, emission_date, planned_start, planned_end, status, raw_text
  ) values (
    '00000000-0000-4000-8000-000000000201',
    'encendidos',
    '2026-08-28',
    '10:00',
    '12:30',
    'draft',
    E'PREPAUTA ENCENDIDOS VIERNES 28 DE AGOSTO 2026\n\n10:00 - 10:15\nVIVOS\n\n10:15 - 10:45\nTEMA: ¿TU HIJO NO SUELTA EL CELULAR?\nINVITADA: ERIKA ALVAREZ VELIZ'
  )
  on conflict (program_id, emission_date) do update set
    planned_start = excluded.planned_start,
    planned_end = excluded.planned_end,
    status = excluded.status,
    raw_text = excluded.raw_text
  returning id
)
insert into public.segments (
  id, emission_id, sort_order, planned_start, planned_end, segment_type, slug, guest_text, notes
)
select
  seed.id,
  saved_emission.id,
  seed.sort_order,
  seed.planned_start::time,
  seed.planned_end::time,
  seed.segment_type,
  seed.slug,
  seed.guest_text,
  seed.notes
from saved_emission
cross join (values
  (
    '00000000-0000-4000-8000-000000000301'::uuid,
    0,
    '10:00',
    '10:15',
    'live',
    'Vivos',
    null,
    'Apertura y enlaces.'
  ),
  (
    '00000000-0000-4000-8000-000000000302'::uuid,
    1,
    '10:15',
    '10:45',
    'interview',
    'Uso problemático del celular',
    'Erika Alvarez Veliz',
    'Señales de alerta en niños.'
  )
) as seed(id, sort_order, planned_start, planned_end, segment_type, slug, guest_text, notes)
on conflict (id) do update set
  emission_id = excluded.emission_id,
  sort_order = excluded.sort_order,
  planned_start = excluded.planned_start,
  planned_end = excluded.planned_end,
  segment_type = excluded.segment_type,
  slug = excluded.slug,
  guest_text = excluded.guest_text,
  notes = excluded.notes;
