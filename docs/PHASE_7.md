# Fase 7: equipo, roles y permisos

La séptima fase lleva la administración cotidiana de accesos a RPP Pauta. El
equipo editorial ya no necesita entrar al panel técnico de Supabase para cada
cambio.

## Roles

- **Superadmin:** administra parrilla, programas, usuarios y asignaciones.
- **Producción general:** administra parrilla y programas y mantiene la vista
  transversal de la operación.
- **Productor:** trabaja solo con los programas que tiene asignados.
- **Solo lectura:** consulta los programas asignados sin permisos editoriales.

Solo un superadmin puede cambiar roles o suspender accesos. La base impide
retirar al último superadmin activo para evitar dejar la plataforma sin una
cuenta administradora. Si un productor participa en más de un programa, puede
cambiar de espacio desde su cabecera sin salir de la herramienta.

## Invitaciones

El superadmin escribe nombre, correo, rol y programas. Una ruta privada del
servidor crea la invitación con Supabase Auth y después guarda el perfil y las
asignaciones. La clave de servicio permanece en el servidor y nunca se expone
en JavaScript del navegador.

La variable necesaria es:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
```

Debe configurarse en `.env.local` para desarrollo y como secreto de Vercel para
producción y preview. No debe llevar el prefijo `NEXT_PUBLIC_`.

## Seguridad de datos

Las políticas RLS continúan siendo la autoridad final. Ocultar un botón mejora
la interfaz, pero no concede ni revoca permisos: Supabase valida cada escritura
y las funciones administrativas vuelven a comprobar el rol en el servidor.
