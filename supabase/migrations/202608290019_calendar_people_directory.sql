alter table public.important_dates
  add column if not exists date_category text not null default 'editorial'
    check (date_category in ('holiday', 'editorial')),
  add column if not exists source_url text;

alter table public.people
  add column if not exists contact_phone text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists relationship_type text not null default 'guest'
    check (relationship_type in ('collaborator', 'guest'));

update public.people
set tags = array[primary_role]
where cardinality(tags) = 0
  and nullif(trim(primary_role), '') is not null;

update public.people as person
set relationship_type = 'collaborator'
where exists (
  select 1
  from public.appearances as appearance
  where appearance.person_id = person.id
    and appearance.appearance_role in ('other', 'specialist')
);

create or replace function public.mark_person_as_collaborator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.appearance_role in ('other', 'specialist') then
    update public.people
    set relationship_type = 'collaborator', updated_at = now()
    where id = new.person_id;
  end if;
  return new;
end;
$$;

drop trigger if exists appearances_mark_collaborator on public.appearances;
create trigger appearances_mark_collaborator
after insert or update of appearance_role on public.appearances
for each row execute function public.mark_person_as_collaborator();

with official_holidays(id, event_date, title) as (
  values
    ('26000000-0000-4000-8000-000000000001'::uuid, '2026-01-01'::date, 'Año Nuevo'),
    ('26000000-0000-4000-8000-000000000002'::uuid, '2026-04-02'::date, 'Jueves Santo'),
    ('26000000-0000-4000-8000-000000000003'::uuid, '2026-04-03'::date, 'Viernes Santo'),
    ('26000000-0000-4000-8000-000000000004'::uuid, '2026-05-01'::date, 'Día del Trabajo'),
    ('26000000-0000-4000-8000-000000000005'::uuid, '2026-06-07'::date, 'Batalla de Arica y Día de la Bandera'),
    ('26000000-0000-4000-8000-000000000006'::uuid, '2026-06-29'::date, 'Día de San Pedro y San Pablo'),
    ('26000000-0000-4000-8000-000000000007'::uuid, '2026-07-23'::date, 'Día de la Fuerza Aérea del Perú'),
    ('26000000-0000-4000-8000-000000000008'::uuid, '2026-07-28'::date, 'Fiestas Patrias'),
    ('26000000-0000-4000-8000-000000000009'::uuid, '2026-07-29'::date, 'Fiestas Patrias'),
    ('26000000-0000-4000-8000-000000000010'::uuid, '2026-08-06'::date, 'Batalla de Junín'),
    ('26000000-0000-4000-8000-000000000011'::uuid, '2026-08-30'::date, 'Santa Rosa de Lima'),
    ('26000000-0000-4000-8000-000000000012'::uuid, '2026-10-08'::date, 'Combate de Angamos'),
    ('26000000-0000-4000-8000-000000000013'::uuid, '2026-11-01'::date, 'Día de Todos los Santos'),
    ('26000000-0000-4000-8000-000000000014'::uuid, '2026-12-08'::date, 'Inmaculada Concepción'),
    ('26000000-0000-4000-8000-000000000015'::uuid, '2026-12-09'::date, 'Batalla de Ayacucho'),
    ('26000000-0000-4000-8000-000000000016'::uuid, '2026-12-25'::date, 'Navidad')
)
insert into public.important_dates (id, event_date, title, details, date_category, source_url)
select
  holiday.id,
  holiday.event_date,
  holiday.title,
  'Feriado nacional del calendario oficial peruano. Define con anticipación el enfoque y la cobertura de cada programa.',
  'holiday',
  'https://www.gob.pe/feriados'
from official_holidays as holiday
where not exists (
  select 1
  from public.important_dates as existing
  where existing.event_date = holiday.event_date
    and lower(existing.title) = lower(holiday.title)
);

with official_holidays(event_date, title) as (
  values
    ('2026-01-01'::date, 'Año Nuevo'),
    ('2026-04-02'::date, 'Jueves Santo'),
    ('2026-04-03'::date, 'Viernes Santo'),
    ('2026-05-01'::date, 'Día del Trabajo'),
    ('2026-06-07'::date, 'Batalla de Arica y Día de la Bandera'),
    ('2026-06-29'::date, 'Día de San Pedro y San Pablo'),
    ('2026-07-23'::date, 'Día de la Fuerza Aérea del Perú'),
    ('2026-07-28'::date, 'Fiestas Patrias'),
    ('2026-07-29'::date, 'Fiestas Patrias'),
    ('2026-08-06'::date, 'Batalla de Junín'),
    ('2026-08-30'::date, 'Santa Rosa de Lima'),
    ('2026-10-08'::date, 'Combate de Angamos'),
    ('2026-11-01'::date, 'Día de Todos los Santos'),
    ('2026-12-08'::date, 'Inmaculada Concepción'),
    ('2026-12-09'::date, 'Batalla de Ayacucho'),
    ('2026-12-25'::date, 'Navidad')
)
update public.important_dates as existing
set
  date_category = 'holiday',
  source_url = 'https://www.gob.pe/feriados'
from official_holidays as holiday
where existing.event_date = holiday.event_date
  and lower(existing.title) = lower(holiday.title);
