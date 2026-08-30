alter table public.bulletins
  add column if not exists pin_rank smallint
  check (pin_rank is null or pin_rank between 1 and 2);

create unique index if not exists bulletins_week_pin_rank_unique_idx
  on public.bulletins (week_start, pin_rank)
  where active and pin_rank is not null;

update public.bulletins
set pin_rank = case id
  when '00000000-0000-4000-8000-000000000001'::uuid then 1
  when '00000000-0000-4000-8000-000000000002'::uuid then 2
  else pin_rank
end
where id in (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000002'::uuid
);

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
    new.active,
    new.pin_rank
  ) is distinct from row(
    old.week_start,
    old.title,
    old.body,
    old.scope,
    old.scope_program_id,
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

drop trigger if exists bulletins_touch_updated_at on public.bulletins;
create trigger bulletins_touch_updated_at
before update on public.bulletins
for each row execute function public.touch_bulletin_updated_at();
