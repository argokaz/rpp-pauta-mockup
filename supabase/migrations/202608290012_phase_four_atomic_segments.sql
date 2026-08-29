alter table public.segments
  add column if not exists row_version integer not null default 1,
  add column if not exists last_edited_by uuid references public.profiles(id) on delete set null,
  add column if not exists last_edited_at timestamptz not null default now();

create index if not exists segments_last_edited_idx
  on public.segments (emission_id, last_edited_at desc);

create or replace function public.save_pauta_segment(
  p_program_id text,
  p_emission_date date,
  p_emission_status text,
  p_raw_text text,
  p_producer_name text,
  p_segment_id uuid,
  p_sort_order integer,
  p_expected_version integer,
  p_segment jsonb
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
  target_emission_id uuid;
  current_segment public.segments%rowtype;
  affected_rows integer;
  current_editor_name text;
begin
  if not public.can_manage_program(p_program_id) then
    raise exception 'No tienes permiso para editar este programa.';
  end if;

  insert into public.emissions (
    program_id,
    emission_date,
    status,
    raw_text,
    producer_name,
    producer_id
  ) values (
    p_program_id,
    p_emission_date,
    p_emission_status,
    coalesce(p_raw_text, ''),
    coalesce(p_producer_name, ''),
    auth.uid()
  )
  on conflict (program_id, emission_date) do update
  set
    status = excluded.status,
    raw_text = excluded.raw_text,
    producer_name = excluded.producer_name,
    producer_id = excluded.producer_id
  returning id into target_emission_id;

  select * into current_segment
  from public.segments
  where id = p_segment_id;

  if not found then
    if p_expected_version > 0 then
      return query select 'conflict'::text, null::jsonb, null::text;
      return;
    end if;

    insert into public.segments (
      id,
      emission_id,
      sort_order,
      planned_start,
      planned_end,
      segment_type,
      sequence_name,
      slug,
      topic,
      focus,
      guest_text,
      guest_role,
      audience_question,
      production_cues,
      story_items,
      notes,
      extraction_confidence,
      source_excerpt,
      actual_start,
      actual_end,
      disposition,
      post_summary,
      key_quote,
      quote_verified,
      row_version,
      last_edited_by,
      last_edited_at
    ) values (
      p_segment_id,
      target_emission_id,
      p_sort_order,
      nullif(p_segment ->> 'startTime', '')::time,
      nullif(p_segment ->> 'endTime', '')::time,
      coalesce(nullif(p_segment ->> 'type', ''), 'other'),
      nullif(p_segment ->> 'sequence', ''),
      coalesce(nullif(p_segment ->> 'title', ''), 'Segmento'),
      nullif(p_segment ->> 'topic', ''),
      nullif(p_segment ->> 'focus', ''),
      nullif(p_segment ->> 'guest', ''),
      nullif(p_segment ->> 'guestRole', ''),
      nullif(p_segment ->> 'audienceQuestion', ''),
      coalesce(p_segment -> 'productionCues', '[]'::jsonb),
      coalesce(p_segment -> 'stories', '[]'::jsonb),
      coalesce(p_segment ->> 'notes', ''),
      nullif(p_segment ->> 'confidence', '')::numeric,
      nullif(p_segment ->> 'sourceExcerpt', ''),
      nullif(p_segment ->> 'actualStart', '')::time,
      nullif(p_segment ->> 'actualEnd', '')::time,
      nullif(p_segment ->> 'disposition', ''),
      coalesce(p_segment ->> 'postSummary', ''),
      coalesce(p_segment ->> 'keyQuote', ''),
      coalesce((p_segment ->> 'quoteVerified')::boolean, false),
      1,
      auth.uid(),
      now()
    )
    returning * into current_segment;
  else
    update public.segments
    set
      sort_order = p_sort_order,
      planned_start = nullif(p_segment ->> 'startTime', '')::time,
      planned_end = nullif(p_segment ->> 'endTime', '')::time,
      segment_type = coalesce(nullif(p_segment ->> 'type', ''), 'other'),
      sequence_name = nullif(p_segment ->> 'sequence', ''),
      slug = coalesce(nullif(p_segment ->> 'title', ''), 'Segmento'),
      topic = nullif(p_segment ->> 'topic', ''),
      focus = nullif(p_segment ->> 'focus', ''),
      guest_text = nullif(p_segment ->> 'guest', ''),
      guest_role = nullif(p_segment ->> 'guestRole', ''),
      audience_question = nullif(p_segment ->> 'audienceQuestion', ''),
      production_cues = coalesce(p_segment -> 'productionCues', '[]'::jsonb),
      story_items = coalesce(p_segment -> 'stories', '[]'::jsonb),
      notes = coalesce(p_segment ->> 'notes', ''),
      extraction_confidence = nullif(p_segment ->> 'confidence', '')::numeric,
      source_excerpt = nullif(p_segment ->> 'sourceExcerpt', ''),
      actual_start = nullif(p_segment ->> 'actualStart', '')::time,
      actual_end = nullif(p_segment ->> 'actualEnd', '')::time,
      disposition = nullif(p_segment ->> 'disposition', ''),
      post_summary = coalesce(p_segment ->> 'postSummary', ''),
      key_quote = coalesce(p_segment ->> 'keyQuote', ''),
      quote_verified = coalesce((p_segment ->> 'quoteVerified')::boolean, false),
      row_version = row_version + 1,
      last_edited_by = auth.uid(),
      last_edited_at = now()
    where id = p_segment_id
      and emission_id = target_emission_id
      and row_version = p_expected_version
    returning * into current_segment;

    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then
      select * into current_segment from public.segments where id = p_segment_id;
      select full_name into current_editor_name from public.profiles where id = current_segment.last_edited_by;
      return query select 'conflict'::text, to_jsonb(current_segment), current_editor_name;
      return;
    end if;
  end if;

  insert into public.revisions (entity_type, entity_id, action, snapshot, actor_id)
  values ('segment', p_segment_id::text, 'atomic_save', to_jsonb(current_segment), auth.uid());

  select full_name into current_editor_name from public.profiles where id = current_segment.last_edited_by;
  return query select 'saved'::text, to_jsonb(current_segment), current_editor_name;
end;
$$;

grant execute on function public.save_pauta_segment(text, date, text, text, text, uuid, integer, integer, jsonb) to authenticated;

comment on function public.save_pauta_segment(text, date, text, text, text, uuid, integer, integer, jsonb) is
  'Guarda un bloque individual con control optimista de versión y conserva una revisión recuperable.';

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

create or replace function public.reorder_pauta_segments(
  p_program_id text,
  p_emission_date date,
  p_segment_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_emission_id uuid;
  expected_count integer;
  supplied_count integer;
  result jsonb;
begin
  if not public.can_manage_program(p_program_id) then
    raise exception 'No tienes permiso para editar este programa.';
  end if;

  select id into target_emission_id
  from public.emissions
  where program_id = p_program_id and emission_date = p_emission_date;

  if target_emission_id is null then
    raise exception 'La pauta todavía no existe.';
  end if;

  select count(*) into expected_count from public.segments where emission_id = target_emission_id;
  supplied_count := coalesce(array_length(p_segment_ids, 1), 0);
  if expected_count <> supplied_count or exists (
    select 1 from unnest(p_segment_ids) as supplied(id)
    where not exists (select 1 from public.segments where emission_id = target_emission_id and id = supplied.id)
  ) then
    raise exception 'La pauta cambió mientras intentabas reordenarla. Recarga y vuelve a intentarlo.';
  end if;

  update public.segments
  set sort_order = -(sort_order + 1)
  where emission_id = target_emission_id;

  update public.segments as segment
  set
    sort_order = (ordered.position - 1)::integer,
    row_version = segment.row_version + 1,
    last_edited_by = auth.uid(),
    last_edited_at = now()
  from unnest(p_segment_ids) with ordinality as ordered(id, position)
  where segment.id = ordered.id and segment.emission_id = target_emission_id;

  insert into public.revisions (entity_type, entity_id, action, snapshot, actor_id)
  select 'segment', segment.id::text, 'reorder', to_jsonb(segment), auth.uid()
  from public.segments as segment
  where segment.emission_id = target_emission_id;

  select jsonb_agg(to_jsonb(segment) order by segment.sort_order) into result
  from public.segments as segment
  where segment.emission_id = target_emission_id;
  return coalesce(result, '[]'::jsonb);
end;
$$;

grant execute on function public.reorder_pauta_segments(text, date, uuid[]) to authenticated;

create or replace function public.get_pauta_segment_revisions(p_segment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  target_program_id text;
  result jsonb;
begin
  select emission.program_id into target_program_id
  from public.segments as segment
  join public.emissions as emission on emission.id = segment.emission_id
  where segment.id = p_segment_id;

  if target_program_id is null or not public.can_manage_program(target_program_id) then
    raise exception 'No tienes permiso para revisar este historial.';
  end if;

  select jsonb_agg(jsonb_build_object(
    'id', revision.id,
    'createdAt', revision.created_at,
    'action', revision.action,
    'actorName', coalesce(profile.full_name, 'Usuario editorial'),
    'snapshot', revision.snapshot
  ) order by revision.created_at desc) into result
  from (
    select * from public.revisions
    where entity_type = 'segment' and entity_id = p_segment_id::text
    order by created_at desc
    limit 12
  ) as revision
  left join public.profiles as profile on profile.id = revision.actor_id;

  return coalesce(result, '[]'::jsonb);
end;
$$;

grant execute on function public.get_pauta_segment_revisions(uuid) to authenticated;
