update public.profiles
set
  full_name = coalesce(nullif(full_name, ''), 'Administración general'),
  app_role = 'superadmin'
where id = (
  select id
  from auth.users
  order by created_at
  limit 1
)
and (select count(*) from auth.users) = 1;
