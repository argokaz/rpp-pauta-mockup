insert into public.programs (id, name, short_name, hosts, managed) values
  ('rotativa-campo', 'La Rotativa del Campo', 'Rotativa del Campo', 'Jesús Miguel Calderón', false),
  ('rotativa-am', 'La Rotativa del Aire | Edición Mañana', 'Rotativa AM', 'Carlos Villarreal y Joanna Castro', true),
  ('ampliacion-lima', 'Ampliación de noticias Lima', 'Ampliación Lima', 'Mávila Huertas y Fernando Carvallo', true),
  ('ampliacion-regional', 'Ampliación de noticias regional', 'Ampliación regional', 'Edición regional', true),
  ('encendidos', 'Encendidos', 'Encendidos', 'Sara Abu Sabbah y Carlos Galdós', true),
  ('rotativa-tarde', 'La Rotativa del Aire | Edición Tarde', 'Rotativa Tarde', 'Carlos Villarreal y Joanna Castro', true),
  ('futbol-cancha', 'Fútbol como cancha', 'Fútbol como cancha', 'Jesús Arias y Alan Diez', false),
  ('chistosos', 'Los Chistosos', 'Los Chistosos', 'Hernán Vidaurre y Daniel Marquina', true),
  ('espacio-vital', 'Espacio Vital', 'Espacio Vital', 'Elmer Huerta', false),
  ('conexion', 'Conexión', 'Conexión', 'Martín Riepl y Fátima Chávez', true),
  ('rotativa-noche', 'La Rotativa del Aire | Edición Noche', 'Rotativa Noche', 'Jesús Miguel Calderón', true),
  ('vamos-var', 'Vamos al VAR', 'Vamos al VAR', 'Jesús Arias, Alan Diez y Pedro García', false),
  ('sabelones', 'Sabelones', 'Sabelones', 'Daniel Marquina', false),
  ('las-cosas', 'Las cosas como son', 'Las cosas como son', 'Equipo por confirmar', true),
  ('prueba-fuego', 'Prueba de fuego', 'Prueba de fuego', 'Equipo por confirmar', true),
  ('asi-somos', 'Así somos', 'Así somos', 'Equipo por confirmar', true),
  ('lo-mejor-campo', 'Lo mejor de la semana de La Rotativa del Campo', 'Lo mejor de Rotativa del Campo', 'Especial semanal', false),
  ('rotativa-sat-am', 'La Rotativa de fin de Semana | Sábado', 'Rotativa AM Sábado', 'Fátima Chávez y César Espinoza', true),
  ('ampliacion-sat', 'Ampliación de Noticias | Sábado', 'Ampliación Sábado', 'Fernando Vivas y César Espinoza', true),
  ('enfoque-sat', 'Enfoque de los sábados', 'Enfoque de los sábados', 'Fernando Carvallo', false),
  ('dialogo-fe', 'Diálogo de Fe', 'Diálogo de Fe', 'Fernando Carvallo y Carlos Castillo', true),
  ('sencillo-bolsillo', 'Sencillo y al Bolsillo', 'Sencillo y al Bolsillo', 'Equipo del programa', true),
  ('en-escena', 'En escena', 'En escena', 'Johnny Padilla', true),
  ('chistosos-best', 'Lo mejor de Los Chistosos', 'Lo mejor de Los Chistosos', 'Hernán Vidaurre y Daniel Marquina', false),
  ('letras-tiempo', 'Letras en el tiempo', 'Letras en el tiempo', 'Patricia del Río', false),
  ('ampliacion-sat-repeat', 'Ampliación de Noticias | Sábado | Repetición', 'Ampliación Sábado | Repetición', 'Repetición', false),
  ('en-escena-repeat', 'En Escena | Repetición', 'En Escena | Repetición', 'Repetición', false),
  ('rotativa-sat-pm', 'La Rotativa del Aire | Sábado Noche', 'Rotativa PM Sábado', 'Fin de semana', true),
  ('enfoque-sat-repeat', 'Enfoque de los Sábados | Repetición', 'Enfoque | Repetición', 'Repetición', false),
  ('letras-repeat', 'Letras en el tiempo | Repetición', 'Letras | Repetición', 'Repetición', false),
  ('rpp-informando', 'RPP Informando | Domingo', 'RPP Informando', 'Carlos Montalvo', false),
  ('rotativa-sun-am', 'La Rotativa de fin de Semana | Domingo', 'Rotativa AM Domingo', 'Carlos Villarreal y Noemy Mamani', true),
  ('ampliacion-sun', 'Ampliación de Noticias | Domingo', 'Ampliación Domingo', 'Fernando Vivas y Carlos Villarreal', true),
  ('domingo-fiesta', 'Domingo es fiesta', 'Domingo es fiesta', 'Jorge Rodríguez', true),
  ('siempre-casa', 'Siempre en Casa', 'Siempre en Casa', 'Jorge Rodríguez', true),
  ('rotativa-sun-pm', 'La Rotativa del Aire | Domingo Noche', 'Rotativa PM Domingo', 'Fin de semana', true),
  ('ampliacion-sun-repeat', 'Ampliación de Noticias | Domingo | Repetición', 'Ampliación Domingo | Repetición', 'Repetición', false)
on conflict (id) do update set
  name = excluded.name,
  short_name = excluded.short_name,
  hosts = excluded.hosts,
  managed = excluded.managed;

insert into public.schedule_slots (program_id, day_of_week, start_time, end_time, effective_from)
select program_id, day_of_week, start_time::time, end_time::time, '2026-01-01'::date
from (values
  ('rotativa-campo', 1, '03:30', '05:00'), ('rotativa-am', 1, '05:00', '08:00'), ('ampliacion-lima', 1, '08:00', '10:00'), ('ampliacion-regional', 1, '08:00', '10:00'), ('encendidos', 1, '10:00', '12:30'), ('rotativa-tarde', 1, '12:30', '14:30'), ('futbol-cancha', 1, '14:30', '16:00'), ('chistosos', 1, '16:00', '17:00'), ('espacio-vital', 1, '17:00', '18:00'), ('conexion', 1, '18:00', '20:00'), ('rotativa-noche', 1, '20:00', '22:00'), ('vamos-var', 1, '22:00', '23:00'), ('sabelones', 1, '23:00', '00:00'),
  ('rotativa-campo', 2, '03:30', '05:00'), ('rotativa-am', 2, '05:00', '08:00'), ('ampliacion-lima', 2, '08:00', '10:00'), ('ampliacion-regional', 2, '08:00', '10:00'), ('encendidos', 2, '10:00', '12:30'), ('rotativa-tarde', 2, '12:30', '14:30'), ('futbol-cancha', 2, '14:30', '16:00'), ('chistosos', 2, '16:00', '17:00'), ('espacio-vital', 2, '17:00', '18:00'), ('conexion', 2, '18:00', '20:00'), ('rotativa-noche', 2, '20:00', '22:00'), ('vamos-var', 2, '22:00', '23:00'), ('sabelones', 2, '23:00', '00:00'),
  ('rotativa-campo', 3, '03:30', '05:00'), ('rotativa-am', 3, '05:00', '08:00'), ('ampliacion-lima', 3, '08:00', '10:00'), ('ampliacion-regional', 3, '08:00', '10:00'), ('encendidos', 3, '10:00', '12:30'), ('rotativa-tarde', 3, '12:30', '14:30'), ('futbol-cancha', 3, '14:30', '16:00'), ('chistosos', 3, '16:00', '17:00'), ('espacio-vital', 3, '17:00', '18:00'), ('conexion', 3, '18:00', '20:00'), ('rotativa-noche', 3, '20:00', '22:00'), ('vamos-var', 3, '22:00', '23:00'), ('sabelones', 3, '23:00', '00:00'),
  ('rotativa-campo', 4, '03:30', '05:00'), ('rotativa-am', 4, '05:00', '08:00'), ('ampliacion-lima', 4, '08:00', '10:00'), ('ampliacion-regional', 4, '08:00', '10:00'), ('encendidos', 4, '10:00', '12:30'), ('rotativa-tarde', 4, '12:30', '14:30'), ('futbol-cancha', 4, '14:30', '16:00'), ('chistosos', 4, '16:00', '17:00'), ('espacio-vital', 4, '17:00', '18:00'), ('conexion', 4, '18:00', '20:00'), ('rotativa-noche', 4, '20:00', '22:00'), ('vamos-var', 4, '22:00', '23:00'), ('sabelones', 4, '23:00', '00:00'),
  ('rotativa-campo', 5, '03:30', '05:00'), ('rotativa-am', 5, '05:00', '08:00'), ('ampliacion-lima', 5, '08:00', '10:00'), ('ampliacion-regional', 5, '08:00', '10:00'), ('encendidos', 5, '10:00', '12:30'), ('rotativa-tarde', 5, '12:30', '14:30'), ('futbol-cancha', 5, '14:30', '16:00'), ('chistosos', 5, '16:00', '17:00'), ('espacio-vital', 5, '17:00', '18:00'), ('conexion', 5, '18:00', '20:00'), ('rotativa-noche', 5, '20:00', '22:00'), ('vamos-var', 5, '22:00', '23:00'), ('sabelones', 5, '23:00', '00:00'),
  ('lo-mejor-campo', 6, '04:00', '05:00'), ('rotativa-sat-am', 6, '05:00', '08:00'), ('ampliacion-sat', 6, '08:00', '09:00'), ('enfoque-sat', 6, '09:00', '10:00'), ('dialogo-fe', 6, '10:00', '10:30'), ('sencillo-bolsillo', 6, '10:30', '12:00'), ('en-escena', 6, '12:00', '14:00'), ('chistosos-best', 6, '14:00', '16:00'), ('letras-tiempo', 6, '16:00', '17:00'), ('ampliacion-sat-repeat', 6, '17:00', '18:00'), ('en-escena-repeat', 6, '18:00', '20:00'), ('rotativa-sat-pm', 6, '20:00', '22:00'), ('enfoque-sat-repeat', 6, '22:00', '23:00'), ('letras-repeat', 6, '23:00', '00:00'),
  ('rpp-informando', 0, '00:00', '05:00'), ('rotativa-sun-am', 0, '05:00', '08:00'), ('ampliacion-sun', 0, '08:00', '10:00'), ('domingo-fiesta', 0, '10:00', '10:30'), ('siempre-casa', 0, '10:30', '14:00'), ('en-escena-repeat', 0, '14:00', '16:00'), ('chistosos-best', 0, '16:00', '17:00'), ('letras-repeat', 0, '17:00', '18:00'), ('chistosos-best', 0, '19:00', '20:00'), ('rotativa-sun-pm', 0, '20:00', '22:00'), ('ampliacion-sun-repeat', 0, '22:00', '00:00')
) as slots(program_id, day_of_week, start_time, end_time)
where not exists (
  select 1 from public.schedule_slots existing
  where existing.program_id = slots.program_id
    and existing.day_of_week = slots.day_of_week
    and existing.start_time = slots.start_time::time
    and existing.effective_from = '2026-01-01'::date
);
