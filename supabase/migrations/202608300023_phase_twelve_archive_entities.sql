create or replace function public.search_editorial_archive(
  p_query text default '',p_program_id text default null,p_date_from date default null,p_date_to date default null,
  p_disposition text default null,p_limit integer default 20,p_offset integer default 0)
returns table(emission_id uuid,segment_id uuid,program_id text,emission_date date,producer_name text,planned_start time,planned_end time,slug text,guest_text text,guest_role text,topic text,focus text,post_summary text,key_quote text,quote_verified boolean,disposition text,source_excerpt text,total_count bigint)
language sql stable set search_path=public,extensions as $$
with input as (select trim(coalesce(p_query,'')) raw_query,public.normalize_person_name(trim(coalesce(p_query,''))) normalized_query),
matches as (
  select e.id emission_id,s.id segment_id,e.program_id,e.emission_date,coalesce(e.producer_name,'') producer_name,s.planned_start,s.planned_end,s.slug,
    coalesce(nullif(s.guest_text,''),(select string_agg(item->>'name',', ') from jsonb_array_elements(s.participant_items) item),'') guest_text,
    coalesce(nullif(s.guest_role,''),(select string_agg(item->>'roleDescription',', ') from jsonb_array_elements(s.participant_items) item),'') guest_role,
    coalesce(s.topic,'') topic,coalesce(s.focus,'') focus,coalesce(s.post_summary,'') post_summary,coalesce(s.key_quote,'') key_quote,
    coalesce(s.quote_verified,false) quote_verified,s.disposition,coalesce(s.source_excerpt,'') source_excerpt,
    case when input.raw_query='' then 0::real else
      ts_rank_cd(to_tsvector('spanish'::regconfig,concat_ws(' ',s.slug,s.topic,s.focus,s.guest_text,s.guest_role,s.notes,s.post_summary,s.key_quote,s.participant_items::text,s.entity_items::text)),websearch_to_tsquery('spanish'::regconfig,input.raw_query))
      + extensions.similarity(public.normalize_person_name(coalesce(s.guest_text,'')||' '||s.participant_items::text),input.normalized_query)::real
    end search_rank
  from public.segments s join public.emissions e on e.id=s.emission_id join public.programs p on p.id=e.program_id cross join input
  where (p_program_id is null or e.program_id=p_program_id) and (p_date_from is null or e.emission_date>=p_date_from) and (p_date_to is null or e.emission_date<=p_date_to)
    and (p_disposition is null or (p_disposition='planned' and s.disposition is null) or (p_disposition='aired' and s.disposition in ('aired','added_live')) or s.disposition=p_disposition)
    and (input.raw_query='' or to_tsvector('spanish'::regconfig,concat_ws(' ',s.slug,s.topic,s.focus,s.guest_text,s.guest_role,s.notes,s.post_summary,s.key_quote,s.participant_items::text,s.entity_items::text)) @@ websearch_to_tsquery('spanish'::regconfig,input.raw_query)
      or public.normalize_person_name(concat_ws(' ',s.source_excerpt,e.raw_text,e.producer_name,p.name,s.participant_items::text,s.entity_items::text)) like '%'||input.normalized_query||'%'
      or extensions.similarity(public.normalize_person_name(coalesce(s.guest_text,'')||' '||s.participant_items::text),input.normalized_query)>=0.55)
)
select matches.emission_id,matches.segment_id,matches.program_id,matches.emission_date,matches.producer_name,matches.planned_start,matches.planned_end,matches.slug,matches.guest_text,matches.guest_role,matches.topic,matches.focus,matches.post_summary,matches.key_quote,matches.quote_verified,matches.disposition,matches.source_excerpt,count(*) over()
from matches order by matches.search_rank desc,matches.emission_date desc,matches.planned_start asc nulls last,matches.segment_id
limit greatest(1,least(coalesce(p_limit,20),100)) offset greatest(coalesce(p_offset,0),0);
$$;
