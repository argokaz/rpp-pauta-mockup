create or replace function public.touch_bulletin_updated_at()
returns trigger
language plpgsql
as $$
begin
  if row(
    new.week_start,
    new.title,
    new.body,
    new.scope,
    new.scope_program_id,
    new.scope_program_ids,
    new.active,
    new.pin_rank
  ) is distinct from row(
    old.week_start,
    old.title,
    old.body,
    old.scope,
    old.scope_program_id,
    old.scope_program_ids,
    old.active,
    old.pin_rank
  ) then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;
