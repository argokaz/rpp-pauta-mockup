create extension if not exists pg_trgm with schema extensions;

create or replace function public.search_editorial_archive(
  p_query text default '',
  p_program_id text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_disposition text default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  emission_id uuid,
  segment_id uuid,
  program_id text,
  emission_date date,
  producer_name text,
  planned_start time,
  planned_end time,
  slug text,
  guest_text text,
  guest_role text,
  topic text,
  focus text,
  post_summary text,
  key_quote text,
  quote_verified boolean,
  disposition text,
  source_excerpt text,
  total_count bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with search_input as (
    select
      trim(coalesce(p_query, '')) as raw_query,
      public.normalize_person_name(trim(coalesce(p_query, ''))) as normalized_query
  ),
  matches as (
    select
      emission.id as emission_id,
      segment.id as segment_id,
      emission.program_id,
      emission.emission_date,
      coalesce(emission.producer_name, '') as producer_name,
      segment.planned_start,
      segment.planned_end,
      segment.slug,
      coalesce(segment.guest_text, '') as guest_text,
      coalesce(segment.guest_role, '') as guest_role,
      coalesce(segment.topic, '') as topic,
      coalesce(segment.focus, '') as focus,
      coalesce(segment.post_summary, '') as post_summary,
      coalesce(segment.key_quote, '') as key_quote,
      coalesce(segment.quote_verified, false) as quote_verified,
      segment.disposition,
      coalesce(segment.source_excerpt, '') as source_excerpt,
      case
        when search_input.raw_query = '' then 0::real
        else
          ts_rank_cd(
            to_tsvector(
              'spanish'::regconfig,
              coalesce(segment.slug, '') || ' ' ||
              coalesce(segment.topic, '') || ' ' ||
              coalesce(segment.focus, '') || ' ' ||
              coalesce(segment.guest_text, '') || ' ' ||
              coalesce(segment.guest_role, '') || ' ' ||
              coalesce(segment.notes, '') || ' ' ||
              coalesce(segment.post_summary, '') || ' ' ||
              coalesce(segment.key_quote, '')
            ),
            websearch_to_tsquery('spanish'::regconfig, search_input.raw_query)
          )
          + extensions.similarity(
              public.normalize_person_name(coalesce(segment.guest_text, '')),
              search_input.normalized_query
            )::real
          + case when public.normalize_person_name(coalesce(segment.guest_text, '')) = search_input.normalized_query then 2 else 0 end
      end as search_rank
    from public.segments as segment
    join public.emissions as emission on emission.id = segment.emission_id
    join public.programs as program on program.id = emission.program_id
    cross join search_input
    where
      (p_program_id is null or emission.program_id = p_program_id)
      and (p_date_from is null or emission.emission_date >= p_date_from)
      and (p_date_to is null or emission.emission_date <= p_date_to)
      and (
        p_disposition is null
        or (p_disposition = 'planned' and segment.disposition is null)
        or (p_disposition = 'aired' and segment.disposition in ('aired', 'added_live'))
        or segment.disposition = p_disposition
      )
      and (
        search_input.raw_query = ''
        or to_tsvector(
          'spanish'::regconfig,
          coalesce(segment.slug, '') || ' ' ||
          coalesce(segment.topic, '') || ' ' ||
          coalesce(segment.focus, '') || ' ' ||
          coalesce(segment.guest_text, '') || ' ' ||
          coalesce(segment.guest_role, '') || ' ' ||
          coalesce(segment.notes, '') || ' ' ||
          coalesce(segment.post_summary, '') || ' ' ||
          coalesce(segment.key_quote, '')
        ) @@ websearch_to_tsquery('spanish'::regconfig, search_input.raw_query)
        or public.normalize_person_name(coalesce(segment.source_excerpt, '')) like '%' || search_input.normalized_query || '%'
        or public.normalize_person_name(coalesce(emission.raw_text, '')) like '%' || search_input.normalized_query || '%'
        or public.normalize_person_name(coalesce(emission.producer_name, '')) like '%' || search_input.normalized_query || '%'
        or public.normalize_person_name(program.name) like '%' || search_input.normalized_query || '%'
        or extensions.similarity(
          public.normalize_person_name(coalesce(segment.guest_text, '')),
          search_input.normalized_query
        ) >= 0.55
      )
  )
  select
    matches.emission_id,
    matches.segment_id,
    matches.program_id,
    matches.emission_date,
    matches.producer_name,
    matches.planned_start,
    matches.planned_end,
    matches.slug,
    matches.guest_text,
    matches.guest_role,
    matches.topic,
    matches.focus,
    matches.post_summary,
    matches.key_quote,
    matches.quote_verified,
    matches.disposition,
    matches.source_excerpt,
    count(*) over () as total_count
  from matches
  order by matches.search_rank desc, matches.emission_date desc, matches.planned_start asc nulls last, matches.segment_id
  limit greatest(1, least(coalesce(p_limit, 20), 100))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

grant execute on function public.search_editorial_archive(text, text, date, date, text, integer, integer) to authenticated;

comment on function public.search_editorial_archive(text, text, date, date, text, integer, integer) is
  'Busca y pagina el histórico editorial completo, con tolerancia a pequeños errores en nombres de invitados.';
