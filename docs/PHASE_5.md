# Fase 5: histórico editorial completo

La quinta fase convierte el archivo en una consulta real de la base compartida.
Ya no depende de que una pauta haya sido cargada previamente en el navegador.

## Qué se puede encontrar

La búsqueda reúne en un mismo resultado:

- programa, fecha y hora;
- invitado y cargo;
- tema y enfoque;
- qué se dijo en la emisión;
- cita destacada y estado de verificación;
- evidencia original conservada con el bloque;
- productor responsable;
- resultado planificado, emitido, parcial o no emitido.

Los filtros por programa, rango de fechas y resultado se pueden combinar. Una
búsqueda por nombre tolera errores pequeños para recuperar, por ejemplo, una
entrevista aunque el apellido haya sido escrito con una letra diferente.

## Flujo de uso

Producción puede abrir el archivo desde la Agenda o desde la base de invitados.
La consulta muestra primero los registros más recientes y carga veinte por vez.
En el dashboard general, **Abrir emisión** lleva directamente a la pauta si el
bloque todavía está planificado o a la post-pauta si ya tiene un resultado al
aire.

El productor de un programa puede consultar la misma base transversal, pero no
recibe acciones de escritura sobre emisiones de otros programas.

## Implementación

La función `search_editorial_archive` corre dentro de PostgreSQL, respeta las
políticas de lectura existentes y usa el índice de texto completo creado en la
fase anterior. `pg_trgm` añade tolerancia a errores en nombres. La función
devuelve el total y una página acotada para no descargar el histórico entero.

El modo local usa el mismo contrato y conserva filtros, búsqueda aproximada y
paginación. Los registros de prueba se agregan en memoria y se identifican por
su prefijo; nunca se escriben en Supabase.

## Migración

`202608290015_server_archive_search.sql` activa la similitud de texto y publica
la función paginada para usuarios autenticados.
