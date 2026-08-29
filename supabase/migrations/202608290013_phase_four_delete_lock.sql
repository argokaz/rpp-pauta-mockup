create or replace function public.delete_pauta_segment(
  p_program_id text,
  p_emission_date date,
  p_segment_id uuid,
  p_expected_version integer
)
returns table (
  delete_status text,
  current_segment jsonb,
  editor_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_emission_id uuid;
  target_segment public.segments%rowtype;
  current_editor_name text;
begin
  if not public.can_manage_program(p_program_id) then
    raise exception 'No tienes permiso para editar este programa.';
  end if;

  select id into target_emission_id
  from public.emissions
  where program_id = p_program_id and emission_date = p_emission_date;

  select * into target_segment
  from public.segments
  where id = p_segment_id and emission_id = target_emission_id
  for update;

  if not found then
    return query select 'deleted'::text, null::jsonb, null::text;
    return;
  end if;

  if target_segment.row_version <> p_expected_version then
    select full_name into current_editor_name from public.profiles where id = target_segment.last_edited_by;
    return query select 'conflict'::text, to_jsonb(target_segment), coalesce(current_editor_name, 'Otra persona');
    return;
  end if;

  insert into public.revisions (entity_type, entity_id, action, snapshot, actor_id)
  values ('segment', p_segment_id::text, 'delete', to_jsonb(target_segment), auth.uid());

  delete from public.segments where id = p_segment_id and row_version = p_expected_version;

  update public.segments
  set sort_order = -(sort_order + 1)
  where emission_id = target_emission_id;

  with ordered as (
    select id, row_number() over (order by sort_order desc) - 1 as new_order
    from public.segments
    where emission_id = target_emission_id
  )
  update public.segments as segment
  set sort_order = ordered.new_order::integer
  from ordered
  where segment.id = ordered.id;

  return query select 'deleted'::text, null::jsonb, null::text;
end;
$$;

grant execute on function public.delete_pauta_segment(text, date, uuid, integer) to authenticated;
