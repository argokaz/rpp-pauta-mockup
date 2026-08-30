create table public.recurring_blocks (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references public.programs(id) on delete cascade,
  title text not null,
  sequence_name text,
  segment_type text not null default 'sequence' check (segment_type in ('opening', 'interview', 'live', 'audience', 'sequence', 'sports', 'cue', 'other')),
  guest_text text,
  guest_role text,
  notes text not null default '',
  days_of_week smallint[] not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 1 and 360),
  effective_from date not null default current_date,
  effective_to date,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(days_of_week) > 0),
  check (effective_to is null or effective_to >= effective_from)
);

create index recurring_blocks_program_idx on public.recurring_blocks(program_id, effective_from, start_time);

alter table public.recurring_blocks enable row level security;

create policy recurring_blocks_read on public.recurring_blocks
for select to authenticated using (true);

create policy recurring_blocks_write on public.recurring_blocks
for all to authenticated
using (public.can_manage_program(program_id))
with check (public.can_manage_program(program_id));

grant select, insert, update, delete on public.recurring_blocks to authenticated;

alter table public.segments
  add column if not exists fixed_block_id uuid references public.recurring_blocks(id) on delete set null;

alter table public.emissions
  add column if not exists applied_fixed_block_ids uuid[] not null default '{}'::uuid[];

create index if not exists segments_fixed_block_idx on public.segments(fixed_block_id, emission_id);

create or replace function public.version_recurring_block(
  p_block_id uuid,
  p_title text,
  p_sequence_name text,
  p_segment_type text,
  p_guest_text text,
  p_guest_role text,
  p_notes text,
  p_days_of_week smallint[],
  p_start_time time,
  p_duration_minutes integer,
  p_effective_from date,
  p_effective_to date default null
)
returns public.recurring_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  source_block public.recurring_blocks;
  created_block public.recurring_blocks;
begin
  select * into source_block
  from public.recurring_blocks
  where id = p_block_id
  for update;

  if not found then raise exception 'El bloque fijo original no existe.'; end if;
  if not public.can_manage_program(source_block.program_id) then raise exception 'No tienes permiso para editar este programa.'; end if;
  if not source_block.active then raise exception 'El bloque fijo ya fue retirado.'; end if;
  if p_effective_from <= source_block.effective_from then raise exception 'La nueva vigencia debe comenzar después del inicio actual.'; end if;
  if cardinality(p_days_of_week) = 0 or exists (select 1 from unnest(p_days_of_week) as day where day not between 0 and 6) then raise exception 'Selecciona días válidos.'; end if;
  if p_duration_minutes not between 1 and 360 then raise exception 'La duración es inválida.'; end if;
  if p_effective_to is not null and p_effective_to < p_effective_from then raise exception 'La fecha final no puede ser anterior a la inicial.'; end if;

  update public.recurring_blocks
  set effective_to = p_effective_from - 1, active = false, updated_at = now()
  where id = p_block_id;

  insert into public.recurring_blocks (
    program_id, title, sequence_name, segment_type, guest_text, guest_role, notes,
    days_of_week, start_time, duration_minutes, effective_from, effective_to,
    active, created_by
  ) values (
    source_block.program_id, trim(p_title), nullif(trim(coalesce(p_sequence_name, '')), ''), p_segment_type,
    nullif(trim(coalesce(p_guest_text, '')), ''), nullif(trim(coalesce(p_guest_role, '')), ''),
    coalesce(p_notes, ''), p_days_of_week, p_start_time, p_duration_minutes,
    p_effective_from, p_effective_to, true, auth.uid()
  ) returning * into created_block;

  return created_block;
end;
$$;

create or replace function public.retire_recurring_block(
  p_block_id uuid,
  p_stop_from date
)
returns public.recurring_blocks
language plpgsql
security definer
set search_path = public
as $$
declare
  source_block public.recurring_blocks;
  retired_block public.recurring_blocks;
begin
  select * into source_block from public.recurring_blocks where id = p_block_id for update;
  if not found then raise exception 'El bloque fijo no existe.'; end if;
  if not public.can_manage_program(source_block.program_id) then raise exception 'No tienes permiso para editar este programa.'; end if;
  if not source_block.active then raise exception 'El bloque fijo ya fue retirado.'; end if;
  if p_stop_from < source_block.effective_from then raise exception 'La fecha de retiro no puede ser anterior al inicio.'; end if;

  update public.recurring_blocks
  set effective_to = case when p_stop_from = source_block.effective_from then null else p_stop_from - 1 end,
      active = false,
      updated_at = now()
  where id = p_block_id
  returning * into retired_block;
  return retired_block;
end;
$$;

create or replace function public.save_pauta_segment_v2(
  p_program_id text,
  p_emission_date date,
  p_emission_status text,
  p_raw_text text,
  p_producer_name text,
  p_segment_id uuid,
  p_sort_order integer,
  p_expected_version integer,
  p_segment jsonb,
  p_fixed_block_id uuid,
  p_applied_fixed_block_ids uuid[]
)
returns table (
  save_status text,
  saved_segment jsonb,
  editor_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  result_status text;
  result_segment jsonb;
  result_editor text;
begin
  select source.save_status, source.saved_segment, source.editor_name
  into result_status, result_segment, result_editor
  from public.save_pauta_segment(
    p_program_id, p_emission_date, p_emission_status, p_raw_text,
    p_producer_name, p_segment_id, p_sort_order, p_expected_version, p_segment
  ) as source;

  if result_status = 'saved' then
    if p_fixed_block_id is not null and not exists (
      select 1 from public.recurring_blocks
      where id = p_fixed_block_id and program_id = p_program_id
    ) then
      raise exception 'El bloque fijo no pertenece a este programa.';
    end if;
    update public.segments set fixed_block_id = p_fixed_block_id where id = p_segment_id;
    update public.emissions
    set applied_fixed_block_ids = coalesce(p_applied_fixed_block_ids, '{}'::uuid[])
    where program_id = p_program_id and emission_date = p_emission_date;
    select to_jsonb(segment) into result_segment from public.segments as segment where id = p_segment_id;
  end if;

  return query select result_status, result_segment, result_editor;
end;
$$;

grant execute on function public.version_recurring_block(uuid, text, text, text, text, text, text, smallint[], time, integer, date, date) to authenticated;
grant execute on function public.retire_recurring_block(uuid, date) to authenticated;
grant execute on function public.save_pauta_segment_v2(text, date, text, text, text, uuid, integer, integer, jsonb, uuid, uuid[]) to authenticated;

insert into public.recurring_blocks (
  id, program_id, title, sequence_name, segment_type, guest_text, guest_role, notes,
  days_of_week, start_time, duration_minutes, effective_from, active
)
select
  '00000000-0000-4000-8000-000000000801', 'encendidos', 'Tecnoverso', 'Tecnoverso', 'sequence',
  'Arturo Goga', 'Periodista especializado en tecnología',
  'Secuencia de tecnología. El tema se completa en la pauta de cada fecha.',
  array[3, 5]::smallint[], '11:30', 10, '2026-01-01', true
where not exists (
  select 1 from public.recurring_blocks where id = '00000000-0000-4000-8000-000000000801'
);

comment on table public.recurring_blocks is
  'Plantillas recurrentes que prellenan la escaleta sin impedir excepciones por fecha.';
