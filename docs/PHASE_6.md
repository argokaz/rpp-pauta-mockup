# Fase 6: calendario anual y parrilla versionada

La sexta fase elimina la semana fija del piloto y convierte la Agenda en una
herramienta operativa durante todo el año.

## Navegación editorial

- La semana visible se calcula desde la fecha seleccionada.
- Producción puede ir a la semana anterior, siguiente o volver a hoy.
- El calendario anual permite abrir cualquier día y destaca las fechas
  importantes ya registradas.
- Las indicaciones semanales solo aparecen en la semana que les corresponde.
- Las fechas importantes muestran la programación aplicable a ese día.

## Parrilla con vigencias

Los horarios dejan de ser una lista estática. Cada bloque tiene una fecha de
inicio y, opcionalmente, una fecha final. Al cambiar un horario, la plataforma
cierra la vigencia anterior el día previo y crea un registro nuevo. De esta
forma, una pauta histórica siempre conserva la programación que tenía en ese
momento.

Producción general y superadmin pueden:

- añadir un horario desde una fecha concreta;
- crear una nueva vigencia para cambiar programa u horas;
- retirar un bloque sin borrarlo del histórico;
- activar, desactivar o clasificar programas como administrados.

Las funciones `version_schedule_slot` y `retire_schedule_slot` ejecutan estos
cambios dentro de una transacción de PostgreSQL para evitar estados
intermedios o historias incompletas.

## Modo local

El repositorio local mantiene el mismo contrato. Esto permite probar el flujo
sin Supabase y restablecer los datos del navegador cuando termine la prueba.
