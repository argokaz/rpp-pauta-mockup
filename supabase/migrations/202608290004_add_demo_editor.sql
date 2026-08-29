update public.profiles as profile
set
  full_name = 'Demo',
  app_role = 'general_producer'
from auth.users as auth_user
where profile.id = auth_user.id
  and lower(auth_user.email) = 'demo@rpp-pauta.local';
