alter table public.bulletins
  add column if not exists scope_program_ids text[] not null default '{}'::text[];

update public.bulletins
set scope_program_ids = array[scope_program_id]
where scope = 'program'
  and scope_program_id is not null
  and cardinality(scope_program_ids) = 0;

comment on column public.bulletins.scope_program_ids is
  'Programas que reciben la indicacion cuando scope es program. scope_program_id conserva compatibilidad con registros anteriores.';
