alter table public.people
  add column if not exists aliases text[] not null default '{}'::text[];

create or replace function public.normalize_person_name(value text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select lower(
    regexp_replace(
      translate(trim(value), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun'),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

create unique index if not exists people_normalized_name_unique_idx
  on public.people(normalized_name);

create unique index if not exists appearances_unique_context_idx
  on public.appearances(emission_id, segment_id, person_id, appearance_role);

insert into public.people (display_name, normalized_name, primary_role)
select distinct on (public.normalize_person_name(segment.guest_text))
  trim(segment.guest_text),
  public.normalize_person_name(segment.guest_text),
  nullif(trim(segment.guest_role), '')
from public.segments as segment
where nullif(trim(segment.guest_text), '') is not null
order by
  public.normalize_person_name(segment.guest_text),
  (segment.guest_role is null),
  segment.updated_at desc
on conflict (normalized_name) do update
set
  display_name = excluded.display_name,
  primary_role = coalesce(excluded.primary_role, public.people.primary_role);

insert into public.appearances (
  emission_id,
  segment_id,
  person_id,
  appearance_role,
  role_description,
  summary
)
select
  segment.emission_id,
  segment.id,
  person.id,
  case
    when segment.segment_type = 'sports'
      and segment.guest_role is null
      and segment.slug ilike '% con %'
      then 'other'
    else 'guest'
  end,
  nullif(trim(segment.guest_role), ''),
  coalesce(
    nullif(trim(segment.focus), ''),
    nullif(trim(segment.topic), ''),
    nullif(trim(segment.notes), '')
  )
from public.segments as segment
join public.people as person
  on person.normalized_name = public.normalize_person_name(segment.guest_text)
where nullif(trim(segment.guest_text), '') is not null
on conflict (emission_id, segment_id, person_id, appearance_role) do update
set
  role_description = excluded.role_description,
  summary = excluded.summary;

-- Corrección editorial del dato heredado del primer piloto: el texto lo presenta
-- como colaborador del bloque, no con una etiqueta explícita de invitación.
update public.segments
set guest_text = null
where public.normalize_person_name(guest_text) = 'juan carlos ortecho'
  and segment_type = 'sports'
  and guest_role is null
  and slug ilike '% con %';

grant execute on function public.normalize_person_name(text) to authenticated;
