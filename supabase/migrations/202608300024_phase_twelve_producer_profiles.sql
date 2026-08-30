create or replace function public.sync_emission_producer_profile()
returns trigger language plpgsql security definer set search_path=public as $$
declare target_person_id uuid; role_item jsonb;
begin
  if nullif(trim(new.producer_name),'') is null then return new; end if;
  insert into public.people(display_name,normalized_name,primary_role,organization,relationship_type,editorial_roles)
  values(trim(new.producer_name),public.normalize_person_name(new.producer_name),'Productor/a','RPP','collaborator',array['producer'])
  on conflict(normalized_name) do update set
    primary_role=coalesce(public.people.primary_role,excluded.primary_role),
    organization=coalesce(public.people.organization,excluded.organization),
    relationship_type='collaborator',
    editorial_roles=(select array_agg(distinct role) from unnest(public.people.editorial_roles || array['producer']) role),
    updated_at=now()
  returning id into target_person_id;
  role_item := jsonb_build_object('id',target_person_id::text||'-'||new.program_id||'-producer','programId',new.program_id,'role','producer','roleDescription','Producción');
  update public.people set program_roles=program_roles||jsonb_build_array(role_item)
  where id=target_person_id and not exists(select 1 from jsonb_array_elements(program_roles) item where item->>'programId'=new.program_id and item->>'role'='producer');
  return new;
end; $$;

drop trigger if exists emissions_sync_producer_profile on public.emissions;
create trigger emissions_sync_producer_profile after insert or update of producer_name,program_id on public.emissions
for each row execute function public.sync_emission_producer_profile();

with producer_links as (
  select distinct program_id,trim(producer_name) display_name from public.emissions where nullif(trim(producer_name),'') is not null
), inserted as (
  insert into public.people(display_name,normalized_name,primary_role,organization,relationship_type,editorial_roles)
  select distinct display_name,public.normalize_person_name(display_name),'Productor/a','RPP','collaborator',array['producer'] from producer_links
  on conflict(normalized_name) do update set
    relationship_type='collaborator',
    editorial_roles=(select array_agg(distinct role) from unnest(public.people.editorial_roles || array['producer']) role)
  returning id,normalized_name
)
update public.people person set program_roles=person.program_roles||coalesce((
  select jsonb_agg(jsonb_build_object('id',person.id::text||'-'||link.program_id||'-producer','programId',link.program_id,'role','producer','roleDescription','Producción'))
  from producer_links link where public.normalize_person_name(link.display_name)=person.normalized_name
    and not exists(select 1 from jsonb_array_elements(person.program_roles) item where item->>'programId'=link.program_id and item->>'role'='producer')
),'[]'::jsonb)
where exists(select 1 from producer_links link where public.normalize_person_name(link.display_name)=person.normalized_name);

comment on function public.sync_emission_producer_profile() is 'Convierte el nombre de producción de cada pauta en un perfil editorial reutilizable y vinculado al programa.';
