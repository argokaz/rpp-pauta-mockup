alter table public.programs
  add column if not exists accent_color text not null default '#596273'
  check (accent_color ~ '^#[0-9A-Fa-f]{6}$');

alter table public.segments
  add column if not exists participant_items jsonb not null default '[]'::jsonb,
  add column if not exists entity_items jsonb not null default '[]'::jsonb;

alter table public.people
  add column if not exists editorial_roles text[] not null default '{}'::text[],
  add column if not exists contact_items jsonb not null default '[]'::jsonb,
  add column if not exists program_roles jsonb not null default '[]'::jsonb;

update public.segments
set participant_items = jsonb_build_array(jsonb_build_object(
  'id', id::text || '-guest-1', 'name', guest_text, 'role', 'guest',
  'roleDescription', coalesce(guest_role, ''), 'organization', '',
  'sourceExcerpt', coalesce(source_excerpt, '')
))
where participant_items = '[]'::jsonb and nullif(trim(guest_text), '') is not null;

update public.people
set contact_items = jsonb_build_array(jsonb_build_object(
  'id', id::text || '-primary-phone', 'type', 'whatsapp', 'value', contact_phone,
  'label', 'Coordinación', 'source', 'Ficha editorial existente',
  'validFrom', created_at::date::text, 'validTo', null, 'primary', true
))
where contact_items = '[]'::jsonb and nullif(trim(contact_phone), '') is not null;

update public.programs set accent_color = case id
  when 'rotativa-am' then '#e21d2f' when 'ampliacion-lima' then '#0067b1'
  when 'ampliacion-regional' then '#00a0a8' when 'encendidos' then '#f36f21'
  when 'rotativa-tarde' then '#c32033' when 'chistosos' then '#8b3dbb'
  when 'conexion' then '#008e83' when 'rotativa-noche' then '#293a8f'
  when 'las-cosas' then '#3c4858' when 'prueba-fuego' then '#d84b20'
  when 'asi-somos' then '#7c4dff' when 'rotativa-sat-am' then '#e21d2f'
  when 'ampliacion-sat' then '#1877b7' when 'dialogo-fe' then '#9a6a24'
  when 'sencillo-bolsillo' then '#16834b' when 'en-escena' then '#c22f87'
  when 'rotativa-sat-pm' then '#293a8f' when 'rotativa-sun-am' then '#e21d2f'
  when 'ampliacion-sun' then '#1877b7' when 'domingo-fiesta' then '#9b6b2f'
  when 'siempre-casa' then '#df6b24' when 'rotativa-sun-pm' then '#293a8f'
  else accent_color end;

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

drop trigger if exists segments_sync_appearance on public.segments;
create trigger segments_sync_appearance after insert or update of participant_items, guest_text, guest_role, segment_type, slug, topic, focus, notes, source_excerpt, post_summary, key_quote, quote_verified
on public.segments for each row execute function public.sync_segment_appearance();

create or replace function public.audit_person_editorial_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare fields text[] := '{}'::text[]; actor_label text := 'Usuario editorial';
begin
  if old.editorial_roles is distinct from new.editorial_roles then fields := array_append(fields, 'editorialRoles'); end if;
  if old.contact_items is distinct from new.contact_items then fields := array_append(fields, 'contacts'); end if;
  if old.program_roles is distinct from new.program_roles then fields := array_append(fields, 'programRoles'); end if;
  if cardinality(fields) = 0 then return new; end if;
  select coalesce(nullif(trim(full_name),''), nullif(trim(email),''), actor_label) into actor_label from public.profiles where id=auth.uid();
  insert into public.person_revisions(person_id,actor_id,actor_name,action,before_snapshot,after_snapshot,changed_fields)
  values(new.id,auth.uid(),coalesce(actor_label,'Usuario editorial'),'update',
    jsonb_build_object('displayName',old.display_name,'normalizedName',old.normalized_name,'aliases',old.aliases,'primaryRole',coalesce(old.primary_role,''),'organization',coalesce(old.organization,''),'phone',coalesce(old.contact_phone,''),'tags',old.tags,'relationshipType',old.relationship_type,'editorialRoles',old.editorial_roles,'contacts',old.contact_items,'programRoles',old.program_roles,'notes',old.notes),
    jsonb_build_object('displayName',new.display_name,'normalizedName',new.normalized_name,'aliases',new.aliases,'primaryRole',coalesce(new.primary_role,''),'organization',coalesce(new.organization,''),'phone',coalesce(new.contact_phone,''),'tags',new.tags,'relationshipType',new.relationship_type,'editorialRoles',new.editorial_roles,'contacts',new.contact_items,'programRoles',new.program_roles,'notes',new.notes), fields);
  return new;
end; $$;

drop trigger if exists people_audit_editorial_fields on public.people;
create trigger people_audit_editorial_fields after update of editorial_roles,contact_items,program_roles on public.people
for each row execute function public.audit_person_editorial_fields();

create or replace function public.merge_people(p_primary_id uuid, p_duplicate_id uuid)
returns setof public.people language plpgsql security definer set search_path=public as $$
declare primary_person public.people; duplicate_person public.people;
begin
  if auth.uid() is null or public.current_app_role() not in ('superadmin','general_producer','producer') then raise exception 'No tienes permisos para fusionar contactos.'; end if;
  if p_primary_id = p_duplicate_id then raise exception 'Elige dos fichas diferentes.'; end if;
  select * into primary_person from public.people where id=p_primary_id for update;
  select * into duplicate_person from public.people where id=p_duplicate_id for update;
  if primary_person.id is null or duplicate_person.id is null then raise exception 'No se encontraron ambas fichas.'; end if;
  delete from public.appearances a using public.appearances existing
    where a.person_id=p_duplicate_id and existing.person_id=p_primary_id
      and existing.emission_id=a.emission_id and existing.segment_id is not distinct from a.segment_id and existing.appearance_role=a.appearance_role;
  update public.appearances set person_id=p_primary_id where person_id=p_duplicate_id;
  update public.people set
    aliases=(select array_agg(distinct alias) from unnest(aliases || array[duplicate_person.display_name] || duplicate_person.aliases) alias where nullif(trim(alias),'') is not null),
    primary_role=coalesce(nullif(primary_role,''),duplicate_person.primary_role), organization=coalesce(nullif(organization,''),duplicate_person.organization),
    contact_phone=coalesce(nullif(contact_phone,''),duplicate_person.contact_phone), tags=(select array_agg(distinct tag) from unnest(tags || duplicate_person.tags) tag),
    relationship_type=case when relationship_type='collaborator' or duplicate_person.relationship_type='collaborator' then 'collaborator' else 'guest' end,
    editorial_roles=(select array_agg(distinct role) from unnest(editorial_roles || duplicate_person.editorial_roles) role),
    contact_items=contact_items || duplicate_person.contact_items, program_roles=program_roles || duplicate_person.program_roles,
    notes=trim(concat_ws(E'\n',nullif(notes,''),nullif(duplicate_person.notes,''))), updated_at=now()
  where id=p_primary_id;
  delete from public.people where id=p_duplicate_id;
  return query select * from public.people where id=p_primary_id;
end; $$;
grant execute on function public.merge_people(uuid,uuid) to authenticated;

create or replace function public.restore_person_field(p_person_id uuid,p_revision_id uuid,p_field text)
returns setof public.people language plpgsql security definer set search_path=public as $$
declare previous_data jsonb;
begin
  if auth.uid() is null or public.current_app_role() not in ('superadmin','general_producer','producer') then raise exception 'No tienes permisos para restaurar datos de una persona.'; end if;
  select before_snapshot into previous_data from public.person_revisions where id=p_revision_id and person_id=p_person_id and action='update';
  if previous_data is null then raise exception 'La versión elegida no contiene un estado anterior restaurable.'; end if;
  case p_field
    when 'displayName' then update public.people set display_name=previous_data->>'displayName',normalized_name=public.normalize_person_name(previous_data->>'displayName') where id=p_person_id;
    when 'aliases' then update public.people set aliases=array(select jsonb_array_elements_text(coalesce(previous_data->'aliases','[]'::jsonb))) where id=p_person_id;
    when 'primaryRole' then update public.people set primary_role=nullif(previous_data->>'primaryRole','') where id=p_person_id;
    when 'organization' then update public.people set organization=nullif(previous_data->>'organization','') where id=p_person_id;
    when 'phone' then update public.people set contact_phone=nullif(previous_data->>'phone','') where id=p_person_id;
    when 'tags' then update public.people set tags=array(select jsonb_array_elements_text(coalesce(previous_data->'tags','[]'::jsonb))) where id=p_person_id;
    when 'relationshipType' then update public.people set relationship_type=case when previous_data->>'relationshipType'='collaborator' then 'collaborator' else 'guest' end where id=p_person_id;
    when 'editorialRoles' then update public.people set editorial_roles=array(select jsonb_array_elements_text(coalesce(previous_data->'editorialRoles','[]'::jsonb))) where id=p_person_id;
    when 'contacts' then update public.people set contact_items=coalesce(previous_data->'contacts','[]'::jsonb) where id=p_person_id;
    when 'programRoles' then update public.people set program_roles=coalesce(previous_data->'programRoles','[]'::jsonb) where id=p_person_id;
    when 'notes' then update public.people set notes=coalesce(previous_data->>'notes','') where id=p_person_id;
    else raise exception 'El campo solicitado no se puede restaurar.';
  end case;
  if not found then raise exception 'No se encontró la persona que se quiere restaurar.'; end if;
  return query select * from public.people where id=p_person_id;
end; $$;

-- Keep the atomic save contract and add the Phase 12 payload after the legacy-safe write.
create or replace function public.save_pauta_segment_v2(
  p_program_id text,p_emission_date date,p_emission_status text,p_raw_text text,p_producer_name text,
  p_segment_id uuid,p_sort_order integer,p_expected_version integer,p_segment jsonb,p_fixed_block_id uuid,p_applied_fixed_block_ids uuid[])
returns table(save_status text,saved_segment jsonb,editor_name text)
language plpgsql security definer set search_path=public as $$
declare result_status text; result_segment jsonb; result_editor text;
begin
  select source.save_status,source.saved_segment,source.editor_name into result_status,result_segment,result_editor
  from public.save_pauta_segment(p_program_id,p_emission_date,p_emission_status,p_raw_text,p_producer_name,p_segment_id,p_sort_order,p_expected_version,p_segment) source;
  if result_status='saved' then
    update public.segments set fixed_block_id=p_fixed_block_id,
      participant_items=coalesce(p_segment->'participants','[]'::jsonb), entity_items=coalesce(p_segment->'entities','[]'::jsonb)
    where id=p_segment_id;
    update public.emissions set applied_fixed_block_ids=coalesce(p_applied_fixed_block_ids,'{}'::uuid[]) where program_id=p_program_id and emission_date=p_emission_date;
    select to_jsonb(segment) into result_segment from public.segments segment where id=p_segment_id;
  end if;
  return query select result_status,result_segment,result_editor;
end; $$;

-- Create reusable host profiles only from named, currently managed programme hosts.
with host_links(program_id,display_name) as (values
  ('rotativa-am','Carlos Villarreal'),('rotativa-am','Joanna Castro'),('ampliacion-lima','Mávila Huertas'),('ampliacion-lima','Fernando Carvallo'),
  ('encendidos','Sara Abu Sabbah'),('encendidos','Carlos Galdós'),('rotativa-tarde','Carlos Villarreal'),('rotativa-tarde','Joanna Castro'),
  ('chistosos','Hernán Vidaurre'),('chistosos','Daniel Marquina'),('conexion','Martín Riepl'),('conexion','Fátima Chávez'),
  ('rotativa-noche','Jesús Miguel Calderón'),('rotativa-sat-am','Fátima Chávez'),('rotativa-sat-am','César Espinoza'),
  ('ampliacion-sat','Fernando Vivas'),('ampliacion-sat','César Espinoza'),('dialogo-fe','Fernando Carvallo'),('dialogo-fe','Carlos Castillo'),
  ('en-escena','Johnny Padilla'),('rotativa-sun-am','Carlos Villarreal'),('rotativa-sun-am','Noemy Mamani'),
  ('ampliacion-sun','Fernando Vivas'),('ampliacion-sun','Carlos Villarreal'),('domingo-fiesta','Jorge Rodríguez'),('siempre-casa','Jorge Rodríguez')
), inserted as (
  insert into public.people(display_name,normalized_name,primary_role,organization,relationship_type,editorial_roles)
  select distinct display_name,public.normalize_person_name(display_name),'Conductor/a','RPP','collaborator',array['host'] from host_links
  on conflict(normalized_name) do update set editorial_roles=(select array_agg(distinct role) from unnest(public.people.editorial_roles || array['host']) role), relationship_type='collaborator'
  returning id,normalized_name
)
update public.people person set program_roles=coalesce((select jsonb_agg(jsonb_build_object('id',person.id::text||'-'||link.program_id||'-host','programId',link.program_id,'role','host','roleDescription','Conducción')) from host_links link where public.normalize_person_name(link.display_name)=person.normalized_name),'[]'::jsonb)
where exists(select 1 from host_links link where public.normalize_person_name(link.display_name)=person.normalized_name);

comment on column public.programs.accent_color is 'Acento visual personalizable de la interfaz editorial del programa.';
comment on column public.segments.participant_items is 'Personas editoriales múltiples vinculadas al bloque, con rol y evidencia.';
comment on column public.segments.entity_items is 'Organizaciones, lugares, eventos y sucesos citados en el bloque.';
