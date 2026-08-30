create or replace function public.delete_pauta_segment_v2(
  p_program_id text,
  p_emission_date date,
  p_segment_id uuid,
  p_expected_version integer,
  p_applied_fixed_block_ids uuid[]
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
  result_status text;
  result_segment jsonb;
  result_editor text;
begin
  select source.delete_status, source.current_segment, source.editor_name
  into result_status, result_segment, result_editor
  from public.delete_pauta_segment(
    p_program_id, p_emission_date, p_segment_id, p_expected_version
  ) as source;

  if result_status = 'deleted' then
    update public.emissions
    set applied_fixed_block_ids = coalesce(p_applied_fixed_block_ids, '{}'::uuid[])
    where program_id = p_program_id and emission_date = p_emission_date;
  end if;

  return query select result_status, result_segment, result_editor;
end;
$$;

grant execute on function public.delete_pauta_segment_v2(text, date, uuid, integer, uuid[]) to authenticated;

comment on function public.delete_pauta_segment_v2(text, date, uuid, integer, uuid[]) is
  'Quita un bloque y recuerda las repeticiones ya resueltas para que una excepción diaria no reaparezca.';
