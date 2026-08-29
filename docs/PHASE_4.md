# Fase 4: edición compartida y post-pauta granular

La cuarta fase permite que más de una persona trabaje en una pauta sin que un
guardado general reemplace silenciosamente los cambios de otra.

## Guardado por bloque

Cada bloque conserva un número de versión en Supabase. El navegador envía la
versión que leyó junto con el cambio. La base solo acepta la escritura si esa
versión sigue vigente y registra una nueva revisión cuando la operación termina.

La interfaz muestra cinco estados junto a cada bloque:

- cambios pendientes;
- guardando;
- guardado;
- error de guardado;
- conflicto de edición.

Crear, reordenar y quitar bloques también se ejecuta mediante funciones
transaccionales. La restricción de orden se mantiene sin posiciones duplicadas.

## Conflictos

Si otro productor guardó antes, los cambios locales no desaparecen. La persona
puede usar la versión compartida o conservar su edición y volver a guardarla
sobre la versión más reciente.

## Historial

Los guardados atómicos producen revisiones asociadas al bloque. Desde la pauta
se pueden consultar las doce más recientes, identificar responsable y hora, y
restaurar una versión anterior como una nueva revisión.

## Post-pauta por noticia

Los bloques con una bandeja de noticias conservan el orden real, resultado y
resumen de cada noticia. Durante la emisión se puede marcar:

- emitida;
- parcial;
- no salió.

El bloque no se considera completo hasta que sus noticias tengan resultado. Las
emitidas y parciales también necesitan un resumen breve; las no emitidas pueden
cerrarse sin inventar contenido.

## Migración

La migración `202608290012_phase_four_atomic_segments.sql` agrega la versión del
bloque, responsable y hora de la última edición, y publica las operaciones
atómicas protegidas por los permisos existentes de cada programa. La migración
`202608290013_phase_four_delete_lock.sql` serializa la eliminación de un bloque
frente a una edición concurrente. La migración
`202608290014_sync_segment_appearances.sql` mantiene el directorio de personas y
sus apariciones alineados con cada guardado atómico.
