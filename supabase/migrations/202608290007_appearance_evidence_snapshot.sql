alter table public.appearances
  add column if not exists segment_title text,
  add column if not exists topic text,
  add column if not exists focus text,
  add column if not exists source_excerpt text;

update public.appearances as appearance
set
  segment_title = segment.slug,
  topic = segment.topic,
  focus = segment.focus,
  source_excerpt = segment.source_excerpt
from public.segments as segment
where appearance.segment_id = segment.id
  and (
    appearance.segment_title is null
    or appearance.topic is null
    or appearance.focus is null
    or appearance.source_excerpt is null
  );
