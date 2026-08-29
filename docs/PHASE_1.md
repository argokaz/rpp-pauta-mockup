# Fase 1: base funcional

## Decisión de infraestructura

GitHub conserva todo el código y el historial. GitHub Pages continúa alojando
el mockup estático, pero no se usará como servidor de la aplicación funcional.

La aplicación funcional está desplegada en producción en
`https://rpp-pauta.vercel.app`. El proyecto `rpp-pauta` de Vercel está conectado al
repositorio de GitHub, usa `product/` como Root Directory y publica desde
`main`.

La aplicación vive en `product/`. En producción usa Supabase para autenticación
y datos compartidos. En desarrollo también puede ejecutarse en modo local, sin
cuentas ni servicios externos, mediante el mismo contrato de repositorio.

## Cuándo activar cada servicio

### Supabase Cloud

Activo desde la Fase 1 para el primer piloto remoto. Permite:

- entrar desde más de una computadora;
- conservar un histórico compartido;
- iniciar sesión;
- asignar permisos por programa;
- recuperar cambios o auditar ediciones.

El proyecto remoto se llama `rpp-pauta` y su referencia es
`ecywwvlijuvspdngbqhh`. El esquema, los datos editoriales iniciales y las
políticas RLS están versionados en `supabase/`. La aplicación utiliza solamente
la URL y la clave pública de Supabase; no expone una clave administrativa en el
navegador.

### Vercel

Activo desde la Fase 1 para que la productora general pueda abrir la aplicación
desde fuera de esta Mac. Vercel ejecuta Next.js y sus rutas de servidor usando
`product/` como Root Directory.

### OpenAI

Activar en la Fase 2, después de validar que una pre-pauta se puede crear,
editar y guardar manualmente. La clave vivirá en una variable privada del
servidor. El navegador nunca recibirá la clave y el modelo nunca escribirá
directamente en la base.

## Alcance implementado

- Agenda de lunes a domingo.
- Los 22 programas administrados y los bloques de solo horario.
- Programa al aire con tratamiento amarillo.
- Indicaciones semanales editables.
- Fechas importantes con planificación por programa.
- Edición manual de pauta y segmentos.
- Estados de emisión.
- Persistencia compartida en Supabase y alternativa local validada con Zod.
- Inicio de sesión por enlace seguro para usuarios previamente invitados.
- Roles editoriales iniciales: superadmin, productora general, productor y
  lector. El piloto habilita edición completa solo para los dos primeros.
- Esquema PostgreSQL con perfiles, roles, RLS, emisiones, segmentos, personas,
  apariciones, importaciones crudas y revisiones.

## Límites actuales

- La administración de usuarios y asignaciones por programa todavía se hace
  desde Supabase.
- El piloto inicial tiene un solo superadmin; aún falta probar la experiencia
  completa con productores y lectores.
- No se procesan textos con un LLM.
- El guardado compartido es deliberadamente simple y todavía no resuelve
  edición simultánea ni conflictos entre usuarios.
