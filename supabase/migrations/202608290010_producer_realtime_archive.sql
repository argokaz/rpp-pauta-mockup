update public.profiles as profile
set
  full_name = 'Producción Encendidos',
  app_role = 'producer',
  active = true
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = 'produccion@rpp-pauta.com';

insert into public.program_memberships (user_id, program_id, membership_role)
select profile.id, 'encendidos', 'producer'
from public.profiles as profile
join auth.users as auth_user on auth_user.id = profile.id
where lower(auth_user.email) = 'produccion@rpp-pauta.com'
on conflict (user_id, program_id) do update
set membership_role = excluded.membership_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'emissions'
  ) then
    alter publication supabase_realtime add table public.emissions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'segments'
  ) then
    alter publication supabase_realtime add table public.segments;
  end if;
end;
$$;

create index if not exists segments_editorial_archive_search_idx
on public.segments using gin (
  to_tsvector(
    'spanish'::regconfig,
    coalesce(slug, '') || ' ' ||
    coalesce(topic, '') || ' ' ||
    coalesce(focus, '') || ' ' ||
    coalesce(guest_text, '') || ' ' ||
    coalesce(guest_role, '') || ' ' ||
    coalesce(notes, '') || ' ' ||
    coalesce(post_summary, '') || ' ' ||
    coalesce(key_quote, '')
  )
);

create index if not exists emissions_program_date_archive_idx
on public.emissions (program_id, emission_date desc);

comment on index public.segments_editorial_archive_search_idx is
  'Acelera búsquedas futuras por tema, invitado, resumen y cita en el archivo editorial.';
