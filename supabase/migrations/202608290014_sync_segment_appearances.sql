create or replace function public.sync_segment_appearance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_person_id uuid;
  target_appearance_role text;
begin
  delete from public.appearances
  where segment_id = new.id
    and appearance_role in ('guest', 'other');

  if nullif(trim(new.guest_text), '') is null then
    return new;
  end if;

  insert into public.people (
    display_name,
    normalized_name,
    primary_role
  ) values (
    trim(new.guest_text),
    public.normalize_person_name(new.guest_text),
    nullif(trim(new.guest_role), '')
  )
  on conflict (normalized_name) do update
  set
    display_name = excluded.display_name,
    primary_role = coalesce(excluded.primary_role, public.people.primary_role),
    updated_at = now()
  returning id into target_person_id;

  target_appearance_role := case
    when new.segment_type = 'sports'
      and nullif(trim(new.guest_role), '') is null
      and new.slug ilike '% con %'
      then 'other'
    else 'guest'
  end;

  insert into public.appearances (
    emission_id,
    segment_id,
    person_id,
    appearance_role,
    role_description,
    summary,
    segment_title,
    topic,
    focus,
    source_excerpt,
    quotes
  ) values (
    new.emission_id,
    new.id,
    target_person_id,
    target_appearance_role,
    nullif(trim(new.guest_role), ''),
    coalesce(
      nullif(trim(new.post_summary), ''),
      nullif(trim(new.focus), ''),
      nullif(trim(new.topic), ''),
      nullif(trim(new.notes), '')
    ),
    nullif(trim(new.slug), ''),
    nullif(trim(new.topic), ''),
    nullif(trim(new.focus), ''),
    nullif(trim(new.source_excerpt), ''),
    case
      when nullif(trim(new.key_quote), '') is null then '[]'::jsonb
      else jsonb_build_array(jsonb_build_object('text', trim(new.key_quote), 'verified', new.quote_verified))
    end
  )
  on conflict (emission_id, segment_id, person_id, appearance_role) do update
  set
    role_description = excluded.role_description,
    summary = excluded.summary,
    segment_title = excluded.segment_title,
    topic = excluded.topic,
    focus = excluded.focus,
    source_excerpt = excluded.source_excerpt,
    quotes = excluded.quotes;

  return new;
end;
$$;

drop trigger if exists segments_sync_appearance on public.segments;
create trigger segments_sync_appearance
after insert or update of
  guest_text,
  guest_role,
  segment_type,
  slug,
  topic,
  focus,
  notes,
  source_excerpt,
  post_summary,
  key_quote,
  quote_verified
on public.segments
for each row
execute function public.sync_segment_appearance();

comment on function public.sync_segment_appearance() is
  'Mantiene la ficha de la persona y la evidencia de su aparición alineadas con cada guardado de bloque.';
