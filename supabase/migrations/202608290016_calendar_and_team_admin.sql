alter table public.profiles
  add column if not exists email text not null default '';

update public.profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where auth_user.id = profile.id
  and coalesce(profile.email, '') = '';

create index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(coalesce(new.email, '')), coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

update public.schedule_slots
set effective_from = least(effective_from, date '2026-01-01')
where effective_from > date '2026-01-01';

create or replace function public.version_schedule_slot(
  p_slot_id uuid,
  p_program_id text,
  p_day_of_week smallint,
  p_start_time time,
  p_end_time time,
  p_effective_from date,
  p_effective_to date default null
)
returns public.schedule_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  source_slot public.schedule_slots;
  created_slot public.schedule_slots;
begin
  if not public.is_editorial_admin() then
    raise exception 'No tienes permiso para administrar la parrilla.';
  end if;

  select * into source_slot
  from public.schedule_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception 'El horario original no existe.';
  end if;
  if not source_slot.active then
    raise exception 'El horario original ya fue retirado.';
  end if;
  if p_effective_from <= source_slot.effective_from then
    raise exception 'La nueva vigencia debe comenzar después del inicio del horario actual.';
  end if;
  if p_day_of_week not between 0 and 6 then
    raise exception 'El día de la semana es inválido.';
  end if;
  if p_effective_to is not null and p_effective_to < p_effective_from then
    raise exception 'La fecha final no puede ser anterior a la fecha inicial.';
  end if;

  update public.schedule_slots
  set effective_to = p_effective_from - 1, active = false
  where id = p_slot_id;

  insert into public.schedule_slots (
    program_id,
    day_of_week,
    start_time,
    end_time,
    effective_from,
    effective_to,
    active
  ) values (
    p_program_id,
    p_day_of_week,
    p_start_time,
    p_end_time,
    p_effective_from,
    p_effective_to,
    true
  )
  returning * into created_slot;

  return created_slot;
end;
$$;

create or replace function public.retire_schedule_slot(
  p_slot_id uuid,
  p_effective_to date
)
returns public.schedule_slots
language plpgsql
security definer
set search_path = public
as $$
declare
  source_slot public.schedule_slots;
  retired_slot public.schedule_slots;
begin
  if not public.is_editorial_admin() then
    raise exception 'No tienes permiso para administrar la parrilla.';
  end if;

  select * into source_slot
  from public.schedule_slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception 'El horario no existe.';
  end if;
  if not source_slot.active then
    raise exception 'El horario ya fue retirado.';
  end if;
  if p_effective_to < source_slot.effective_from then
    raise exception 'La fecha de retiro no puede ser anterior al inicio del horario.';
  end if;

  update public.schedule_slots
  set effective_to = p_effective_to, active = false
  where id = p_slot_id
  returning * into retired_slot;

  return retired_slot;
end;
$$;

grant execute on function public.version_schedule_slot(uuid, text, smallint, time, time, date, date) to authenticated;
grant execute on function public.retire_schedule_slot(uuid, date) to authenticated;

comment on function public.version_schedule_slot(uuid, text, smallint, time, time, date, date) is
  'Cierra la vigencia anterior y crea una nueva versión del horario en una sola transacción.';

comment on function public.retire_schedule_slot(uuid, date) is
  'Retira un horario conservándolo para consultas históricas.';

create or replace function public.admin_save_editorial_user(
  p_user_id uuid,
  p_full_name text,
  p_app_role text,
  p_active boolean,
  p_program_ids text[] default '{}'::text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_is_last_superadmin boolean;
begin
  if public.current_app_role() <> 'superadmin' then
    raise exception 'No tienes permiso para administrar usuarios.';
  end if;
  if p_app_role not in ('superadmin', 'general_producer', 'producer', 'viewer') then
    raise exception 'Rol editorial inválido.';
  end if;

  select
    profile.app_role = 'superadmin'
    and (not p_active or p_app_role <> 'superadmin')
    and (select count(*) from public.profiles where app_role = 'superadmin' and active = true) <= 1
  into target_is_last_superadmin
  from public.profiles as profile
  where profile.id = p_user_id;

  if coalesce(target_is_last_superadmin, false) then
    raise exception 'No puedes retirar al último superadmin activo.';
  end if;

  update public.profiles
  set full_name = trim(coalesce(p_full_name, '')), app_role = p_app_role, active = p_active
  where id = p_user_id;
  if not found then raise exception 'El usuario no existe.'; end if;

  delete from public.program_memberships where user_id = p_user_id;
  if p_app_role in ('producer', 'viewer') and cardinality(coalesce(p_program_ids, '{}'::text[])) > 0 then
    insert into public.program_memberships (user_id, program_id, membership_role)
    select p_user_id, program.id, case when p_app_role = 'viewer' then 'viewer' else 'producer' end
    from public.programs as program
    where program.id = any(p_program_ids)
    on conflict (user_id, program_id) do update set membership_role = excluded.membership_role;
  end if;
end;
$$;

grant execute on function public.admin_save_editorial_user(uuid, text, text, boolean, text[]) to authenticated;

comment on function public.admin_save_editorial_user(uuid, text, text, boolean, text[]) is
  'Actualiza perfil y asignaciones sin permitir retirar al último superadmin.';
