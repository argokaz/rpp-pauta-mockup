create or replace function public.sync_segment_appearance()
returns trigger language plpgsql security definer set search_path = public as $$
declare participant jsonb; target_person_id uuid; participant_role text;
begin
  delete from public.appearances where segment_id = new.id
    and appearance_role in ('host','guest','producer','reporter','specialist','other');
  for participant in select value from jsonb_array_elements(
    case when jsonb_array_length(new.participant_items) > 0 then new.participant_items
    when nullif(trim(new.guest_text), '') is not null then jsonb_build_array(jsonb_build_object(
      'name', new.guest_text, 'role', 'guest', 'roleDescription', coalesce(new.guest_role, ''),
      'organization', '', 'sourceExcerpt', coalesce(new.source_excerpt, '')))
    else '[]'::jsonb end
  ) loop
    if nullif(trim(participant->>'name'), '') is null then continue; end if;
    if nullif(trim(participant->>'personId'), '') is null
      and participant ? 'matchStatus'
      and participant->>'matchStatus' in ('new', 'review') then
      continue;
    end if;
    participant_role := case when participant->>'role' in ('host','guest','producer','reporter','specialist','other') then participant->>'role' else 'guest' end;
    insert into public.people (display_name, normalized_name, primary_role, organization, relationship_type, editorial_roles)
    values (trim(participant->>'name'), public.normalize_person_name(participant->>'name'), nullif(trim(participant->>'roleDescription'), ''),
      nullif(trim(participant->>'organization'), ''), case when participant_role = 'guest' then 'guest' else 'collaborator' end, array[participant_role])
    on conflict (normalized_name) do update set
      display_name = excluded.display_name,
      primary_role = coalesce(excluded.primary_role, public.people.primary_role),
      organization = coalesce(excluded.organization, public.people.organization),
      editorial_roles = (select array_agg(distinct role) from unnest(public.people.editorial_roles || excluded.editorial_roles) role),
      relationship_type = case when excluded.relationship_type = 'collaborator' then 'collaborator' else public.people.relationship_type end,
      updated_at = now()
    returning id into target_person_id;
    insert into public.appearances (emission_id, segment_id, person_id, appearance_role, role_description, summary, segment_title, topic, focus, source_excerpt, quotes)
    values (new.emission_id, new.id, target_person_id, participant_role, nullif(trim(participant->>'roleDescription'), ''),
      coalesce(nullif(trim(new.post_summary), ''), nullif(trim(new.focus), ''), nullif(trim(new.topic), ''), nullif(trim(new.notes), '')),
      nullif(trim(new.slug), ''), nullif(trim(new.topic), ''), nullif(trim(new.focus), ''),
      coalesce(nullif(trim(participant->>'sourceExcerpt'), ''), nullif(trim(new.source_excerpt), '')),
      case when nullif(trim(new.key_quote), '') is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object('text', trim(new.key_quote), 'verified', new.quote_verified)) end)
    on conflict (emission_id, segment_id, person_id, appearance_role) do update set
      role_description=excluded.role_description, summary=excluded.summary, segment_title=excluded.segment_title,
      topic=excluded.topic, focus=excluded.focus, source_excerpt=excluded.source_excerpt, quotes=excluded.quotes;
  end loop;
  return new;
end; $$;

comment on function public.sync_segment_appearance() is
  'Omite candidatos explícitos de IA, pero conserva la creación normal de fichas escritas manualmente por producción.';
