alter table public.bulletins
  drop constraint if exists bulletins_pin_rank_check;

alter table public.bulletins
  add constraint bulletins_pin_rank_check
  check (pin_rank is null or pin_rank between 1 and 4);

create table if not exists public.person_revisions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_name text not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  before_snapshot jsonb,
  after_snapshot jsonb,
  changed_fields text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists person_revisions_person_created_idx
  on public.person_revisions (person_id, created_at desc);

alter table public.person_revisions enable row level security;

drop policy if exists person_revisions_read on public.person_revisions;
create policy person_revisions_read
  on public.person_revisions
  for select
  to authenticated
  using (true);

grant select on public.person_revisions to authenticated;

create or replace function public.audit_person_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_action text := lower(tg_op);
  audit_actor_id uuid := auth.uid();
  audit_actor_name text := 'Sistema';
  audit_person_id uuid;
  before_data jsonb;
  after_data jsonb;
  fields text[] := '{}'::text[];
begin
  if tg_op = 'DELETE' then
    audit_person_id := old.id;
  else
    audit_person_id := new.id;
  end if;

  if audit_actor_id is not null then
    select coalesce(nullif(trim(profile.full_name), ''), nullif(trim(profile.email), ''), 'Usuario editorial')
      into audit_actor_name
    from public.profiles as profile
    where profile.id = audit_actor_id;
    audit_actor_name := coalesce(audit_actor_name, 'Usuario editorial');
  end if;

  if tg_op <> 'INSERT' then
    before_data := jsonb_build_object(
      'displayName', old.display_name,
      'normalizedName', old.normalized_name,
      'aliases', to_jsonb(coalesce(old.aliases, '{}'::text[])),
      'primaryRole', coalesce(old.primary_role, ''),
      'organization', coalesce(old.organization, ''),
      'phone', coalesce(old.contact_phone, ''),
      'tags', to_jsonb(coalesce(old.tags, '{}'::text[])),
      'relationshipType', old.relationship_type,
      'notes', old.notes
    );
  end if;

  if tg_op <> 'DELETE' then
    after_data := jsonb_build_object(
      'displayName', new.display_name,
      'normalizedName', new.normalized_name,
      'aliases', to_jsonb(coalesce(new.aliases, '{}'::text[])),
      'primaryRole', coalesce(new.primary_role, ''),
      'organization', coalesce(new.organization, ''),
      'phone', coalesce(new.contact_phone, ''),
      'tags', to_jsonb(coalesce(new.tags, '{}'::text[])),
      'relationshipType', new.relationship_type,
      'notes', new.notes
    );
  end if;

  if tg_op = 'INSERT' then
    fields := array['displayName', 'aliases', 'primaryRole', 'organization', 'phone', 'tags', 'relationshipType', 'notes'];
  elsif tg_op = 'DELETE' then
    fields := array['displayName', 'aliases', 'primaryRole', 'organization', 'phone', 'tags', 'relationshipType', 'notes'];
  else
    if old.display_name is distinct from new.display_name then fields := array_append(fields, 'displayName'); end if;
    if old.aliases is distinct from new.aliases then fields := array_append(fields, 'aliases'); end if;
    if old.primary_role is distinct from new.primary_role then fields := array_append(fields, 'primaryRole'); end if;
    if old.organization is distinct from new.organization then fields := array_append(fields, 'organization'); end if;
    if old.contact_phone is distinct from new.contact_phone then fields := array_append(fields, 'phone'); end if;
    if old.tags is distinct from new.tags then fields := array_append(fields, 'tags'); end if;
    if old.relationship_type is distinct from new.relationship_type then fields := array_append(fields, 'relationshipType'); end if;
    if old.notes is distinct from new.notes then fields := array_append(fields, 'notes'); end if;
  end if;

  if cardinality(fields) > 0 then
    insert into public.person_revisions (
      person_id,
      actor_id,
      actor_name,
      action,
      before_snapshot,
      after_snapshot,
      changed_fields
    ) values (
      audit_person_id,
      audit_actor_id,
      audit_actor_name,
      audit_action,
      before_data,
      after_data,
      fields
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists people_audit_changes on public.people;
create trigger people_audit_changes
after insert or update or delete on public.people
for each row execute function public.audit_person_change();

insert into public.person_revisions (
  person_id,
  actor_name,
  action,
  after_snapshot,
  changed_fields,
  created_at
)
select
  person.id,
  'Importación inicial',
  'insert',
  jsonb_build_object(
    'displayName', person.display_name,
    'normalizedName', person.normalized_name,
    'aliases', to_jsonb(coalesce(person.aliases, '{}'::text[])),
    'primaryRole', coalesce(person.primary_role, ''),
    'organization', coalesce(person.organization, ''),
    'phone', coalesce(person.contact_phone, ''),
    'tags', to_jsonb(coalesce(person.tags, '{}'::text[])),
    'relationshipType', person.relationship_type,
    'notes', person.notes
  ),
  array['displayName', 'aliases', 'primaryRole', 'organization', 'phone', 'tags', 'relationshipType', 'notes'],
  person.created_at
from public.people as person
where not exists (
  select 1 from public.person_revisions as revision where revision.person_id = person.id
);

create or replace function public.restore_person_field(
  p_person_id uuid,
  p_revision_id uuid,
  p_field text
)
returns setof public.people
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_data jsonb;
begin
  if auth.uid() is null or public.current_app_role() not in ('superadmin', 'general_producer', 'producer') then
    raise exception 'No tienes permisos para restaurar datos de una persona.';
  end if;

  select revision.before_snapshot
    into previous_data
  from public.person_revisions as revision
  where revision.id = p_revision_id
    and revision.person_id = p_person_id
    and revision.action = 'update';

  if previous_data is null then
    raise exception 'La versión elegida no contiene un estado anterior restaurable.';
  end if;

  case p_field
    when 'displayName' then
      update public.people
      set
        display_name = previous_data->>'displayName',
        normalized_name = public.normalize_person_name(previous_data->>'displayName')
      where id = p_person_id;
    when 'aliases' then
      update public.people
      set aliases = array(select jsonb_array_elements_text(coalesce(previous_data->'aliases', '[]'::jsonb)))
      where id = p_person_id;
    when 'primaryRole' then
      update public.people set primary_role = nullif(previous_data->>'primaryRole', '') where id = p_person_id;
    when 'organization' then
      update public.people set organization = nullif(previous_data->>'organization', '') where id = p_person_id;
    when 'phone' then
      update public.people set contact_phone = nullif(previous_data->>'phone', '') where id = p_person_id;
    when 'tags' then
      update public.people
      set tags = array(select jsonb_array_elements_text(coalesce(previous_data->'tags', '[]'::jsonb)))
      where id = p_person_id;
    when 'relationshipType' then
      update public.people
      set relationship_type = case when previous_data->>'relationshipType' = 'collaborator' then 'collaborator' else 'guest' end
      where id = p_person_id;
    when 'notes' then
      update public.people set notes = coalesce(previous_data->>'notes', '') where id = p_person_id;
    else
      raise exception 'El campo solicitado no se puede restaurar.';
  end case;

  if not found then
    raise exception 'No se encontró la persona que se quiere restaurar.';
  end if;

  return query select * from public.people where id = p_person_id;
end;
$$;

grant execute on function public.restore_person_field(uuid, uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'people'
  ) then
    alter publication supabase_realtime add table public.people;
  end if;
end;
$$;
