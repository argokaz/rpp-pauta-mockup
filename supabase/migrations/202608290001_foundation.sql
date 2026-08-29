create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  app_role text not null default 'viewer' check (app_role in ('superadmin', 'general_producer', 'producer', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.programs (
  id text primary key,
  name text not null,
  short_name text not null,
  hosts text not null default '',
  managed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  program_id text not null references public.programs(id) on delete cascade,
  membership_role text not null default 'producer' check (membership_role in ('producer', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  unique (user_id, program_id)
);

create table public.schedule_slots (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references public.programs(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  effective_from date not null default current_date,
  effective_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create index schedule_slots_day_idx on public.schedule_slots(day_of_week, start_time);
create index schedule_slots_program_idx on public.schedule_slots(program_id, effective_from);

create table public.emissions (
  id uuid primary key default gen_random_uuid(),
  program_id text not null references public.programs(id) on delete restrict,
  emission_date date not null,
  planned_start time,
  planned_end time,
  status text not null default 'empty' check (status in ('empty', 'draft', 'ready', 'on_air', 'post', 'archived')),
  raw_text text not null default '',
  producer_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, emission_date)
);

create index emissions_date_idx on public.emissions(emission_date, planned_start);

create table public.segments (
  id uuid primary key default gen_random_uuid(),
  emission_id uuid not null references public.emissions(id) on delete cascade,
  sort_order integer not null,
  planned_start time,
  planned_end time,
  actual_start time,
  actual_end time,
  segment_type text not null default 'other',
  sequence_name text,
  slug text not null,
  topic text,
  focus text,
  guest_text text,
  audience_question text,
  production_cues jsonb not null default '[]'::jsonb,
  notes text not null default '',
  disposition text check (disposition is null or disposition in ('aired', 'partial', 'skipped', 'added_live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (emission_id, sort_order)
);

create index segments_emission_idx on public.segments(emission_id, sort_order);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  normalized_name text not null,
  primary_role text,
  organization text,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index people_normalized_name_idx on public.people(normalized_name);

create table public.appearances (
  id uuid primary key default gen_random_uuid(),
  emission_id uuid not null references public.emissions(id) on delete cascade,
  segment_id uuid references public.segments(id) on delete set null,
  person_id uuid not null references public.people(id) on delete restrict,
  appearance_role text not null check (appearance_role in ('host', 'guest', 'producer', 'reporter', 'specialist', 'other')),
  role_description text,
  summary text,
  quotes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index appearances_person_idx on public.appearances(person_id, created_at desc);

create table public.bulletins (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  title text not null,
  body text not null,
  scope text not null default 'all' check (scope in ('all', 'informative', 'program')),
  scope_program_id text references public.programs(id) on delete cascade,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope = 'program' and scope_program_id is not null) or (scope <> 'program' and scope_program_id is null))
);

create table public.important_dates (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null,
  details text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index important_dates_event_date_idx on public.important_dates(event_date);

create table public.important_date_plans (
  id uuid primary key default gen_random_uuid(),
  important_date_id uuid not null references public.important_dates(id) on delete cascade,
  program_id text not null references public.programs(id) on delete cascade,
  planned boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (important_date_id, program_id)
);

create table public.raw_imports (
  id uuid primary key default gen_random_uuid(),
  emission_id uuid references public.emissions(id) on delete cascade,
  program_id text not null references public.programs(id) on delete restrict,
  target_date date not null,
  source_channel text not null check (source_channel in ('whatsapp', 'email', 'document', 'audio', 'other')),
  sender text not null default '',
  raw_text text not null,
  processing_status text not null default 'received' check (processing_status in ('received', 'processing', 'proposed', 'confirmed', 'failed')),
  structured_output jsonb,
  model_name text,
  error_message text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create table public.revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('emission', 'segment', 'bulletin', 'important_date', 'person')),
  entity_id text not null,
  action text not null,
  snapshot jsonb not null,
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index revisions_entity_idx on public.revisions(entity_type, entity_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger programs_touch_updated_at before update on public.programs for each row execute function public.touch_updated_at();
create trigger emissions_touch_updated_at before update on public.emissions for each row execute function public.touch_updated_at();
create trigger segments_touch_updated_at before update on public.segments for each row execute function public.touch_updated_at();
create trigger people_touch_updated_at before update on public.people for each row execute function public.touch_updated_at();
create trigger bulletins_touch_updated_at before update on public.bulletins for each row execute function public.touch_updated_at();
create trigger important_dates_touch_updated_at before update on public.important_dates for each row execute function public.touch_updated_at();
create trigger important_date_plans_touch_updated_at before update on public.important_date_plans for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select app_role from public.profiles where id = auth.uid() and active = true;
$$;

create or replace function public.is_editorial_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('superadmin', 'general_producer'), false);
$$;

create or replace function public.can_manage_program(target_program_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_editorial_admin()
    or exists (
      select 1 from public.program_memberships
      where user_id = auth.uid()
        and program_id = target_program_id
        and membership_role in ('producer', 'editor')
    );
$$;

alter table public.profiles enable row level security;
alter table public.programs enable row level security;
alter table public.program_memberships enable row level security;
alter table public.schedule_slots enable row level security;
alter table public.emissions enable row level security;
alter table public.segments enable row level security;
alter table public.people enable row level security;
alter table public.appearances enable row level security;
alter table public.bulletins enable row level security;
alter table public.important_dates enable row level security;
alter table public.important_date_plans enable row level security;
alter table public.raw_imports enable row level security;
alter table public.revisions enable row level security;

create policy profiles_select_self_or_admin on public.profiles for select to authenticated using (id = auth.uid() or public.is_editorial_admin());
create policy profiles_update_self_or_admin on public.profiles for update to authenticated using (id = auth.uid() or public.is_editorial_admin()) with check (id = auth.uid() or public.is_editorial_admin());

create policy programs_read on public.programs for select to authenticated using (true);
create policy programs_admin_write on public.programs for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy memberships_read on public.program_memberships for select to authenticated using (user_id = auth.uid() or public.is_editorial_admin());
create policy memberships_admin_write on public.program_memberships for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy schedule_read on public.schedule_slots for select to authenticated using (true);
create policy schedule_admin_write on public.schedule_slots for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());

create policy emissions_read on public.emissions for select to authenticated using (true);
create policy emissions_insert on public.emissions for insert to authenticated with check (public.can_manage_program(program_id));
create policy emissions_update on public.emissions for update to authenticated using (public.can_manage_program(program_id)) with check (public.can_manage_program(program_id));
create policy emissions_delete on public.emissions for delete to authenticated using (public.can_manage_program(program_id));

create policy segments_read on public.segments for select to authenticated using (true);
create policy segments_write on public.segments for all to authenticated
using (exists (select 1 from public.emissions where id = emission_id and public.can_manage_program(program_id)))
with check (exists (select 1 from public.emissions where id = emission_id and public.can_manage_program(program_id)));

create policy people_read on public.people for select to authenticated using (true);
create policy people_write on public.people for all to authenticated using (public.current_app_role() in ('superadmin', 'general_producer', 'producer')) with check (public.current_app_role() in ('superadmin', 'general_producer', 'producer'));
create policy appearances_read on public.appearances for select to authenticated using (true);
create policy appearances_write on public.appearances for all to authenticated
using (exists (select 1 from public.emissions where id = emission_id and public.can_manage_program(program_id)))
with check (exists (select 1 from public.emissions where id = emission_id and public.can_manage_program(program_id)));

create policy bulletins_read on public.bulletins for select to authenticated using (true);
create policy bulletins_admin_write on public.bulletins for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy important_dates_read on public.important_dates for select to authenticated using (true);
create policy important_dates_admin_write on public.important_dates for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());
create policy important_date_plans_read on public.important_date_plans for select to authenticated using (true);
create policy important_date_plans_admin_write on public.important_date_plans for all to authenticated using (public.is_editorial_admin()) with check (public.is_editorial_admin());

create policy raw_imports_read on public.raw_imports for select to authenticated using (public.can_manage_program(program_id));
create policy raw_imports_write on public.raw_imports for all to authenticated using (public.can_manage_program(program_id)) with check (public.can_manage_program(program_id));
create policy revisions_read on public.revisions for select to authenticated using (true);
create policy revisions_insert on public.revisions for insert to authenticated with check (public.current_app_role() is not null);

grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.programs, public.program_memberships, public.schedule_slots, public.emissions, public.segments, public.people, public.appearances, public.bulletins, public.important_dates, public.important_date_plans, public.raw_imports to authenticated;
grant select, insert on public.revisions to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_editorial_admin() to authenticated;
grant execute on function public.can_manage_program(text) to authenticated;
