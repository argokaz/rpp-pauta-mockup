# Fase 1: base funcional

## Decisión de infraestructura

GitHub conserva todo el código y el historial. GitHub Pages continúa alojando
el mockup estático, pero no se usará como servidor de la aplicación funcional.

La aplicación vive en `product/` y puede ejecutarse localmente sin cuentas ni
servicios externos. Su repositorio local guarda datos en el navegador y cumple
el mismo contrato que usará la futura implementación de Supabase.

## Cuándo activar cada servicio

### Supabase Cloud

Activar antes del primer piloto remoto, cuando la productora general necesite:

- entrar desde más de una computadora;
- conservar un histórico compartido;
- iniciar sesión;
- asignar permisos por programa;
- recuperar cambios o auditar ediciones.

El esquema y las políticas RLS ya están versionados en `supabase/`. El paso a
la nube será aplicar migraciones y reemplazar el repositorio local, no rediseñar
la aplicación.

### Vercel

Activar cuando otra persona necesite abrir la aplicación desde fuera de esta
Mac. Vercel ejecutará Next.js y sus rutas de servidor. Al configurar el proyecto
se deberá seleccionar `product/` como Root Directory.

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
- Persistencia local validada con Zod.
- Esquema PostgreSQL con perfiles, roles, RLS, emisiones, segmentos, personas,
  apariciones, importaciones crudas y revisiones.

## Límites actuales

- Los datos locales pertenecen a un solo navegador.
- No existe autenticación real.
- No se procesan textos con un LLM.
- No hay sincronización ni colaboración entre usuarios.
