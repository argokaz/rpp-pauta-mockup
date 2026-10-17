# Simplificación de Pauta RPP (v0.39.0)

Fecha: 17 de octubre de 2026

## Problema

Al presentar la herramienta a la productora general, la estructura resultó
difícil de explicar:

- Producción general tenía dos navegaciones a la vez: cinco pestañas (A
  Agenda, B Mesa, C Programa, D Recepción y E Post) y una barra lateral con
  seis entradas más (Agenda semanal, Indicaciones, Personas, Archivo,
  Calendario anual y Administración).
- Programa y Recepción mostraban la misma pantalla.
- La post-pauta existía dos veces: una para producción general y otra dentro
  del espacio del productor.
- Producción general y el productor no trabajaban en la misma pantalla. Una
  misma pauta se veía distinta según quién la abría.
- La información compartida ocupaba media pantalla encima de la pauta del
  productor.

## Qué hacen otros broadcasters

- **El productor maneja tres o cuatro objetos, no más:** planificación, tema,
  escaleta y asignación. Así trabajan ENPS, Octopus y Avid iNEWS.
- **Las indicaciones son objetos con estado, no chat.** Superdesk Planning y
  AAP Agenda unen lo que se encargó con lo que finalmente salió al aire.
- **Los invitados viven en una base única.** En BBC Audio Planning, una
  coordinadora central evita que el mismo invitado salga en varios programas.
  El sistema avisa, pero la decisión final la toma el productor.
- **El as-run compara lo planificado con lo emitido.** La transcripción con
  IA (Dalet, Avid, Trint) propone, y una persona valida.
- **Cada rol tiene su propia interfaz**, y lo técnico queda fuera de la vista
  del productor.

Fuentes:

- https://www.tvtechnology.com/news/ap-introduces-enps-version-7
- https://tvtechnology.com/miscellaneous/octopus-newsroom-introduces-planning-feature-for-octopus5
- https://raw.githubusercontent.com/superdesk/superdesk-planning/develop/server/planning/common.py
- https://www.sourcefabric.org/blog/setting-the-agenda-how-the-aap-helps-clients-plan
- https://publisherspublicitycircle.co.uk/ppc-meeting-bbc-radio-4-july-2026/
- https://avid.com/wolftech-news
- https://trint.com/trint-for-newsrooms

## Nueva estructura

### Producción general: tres pantallas

| Pantalla | Pregunta que responde |
| --- | --- |
| Hoy | ¿Cómo va cada programa y qué falta? |
| Indicaciones | ¿Qué debe saber o preparar producción? |
| Invitados | ¿Quién fue invitado, a dónde, y qué dijo? |

- **Hoy** resume cuántos programas siguen sin pauta, cuántos tienen la
  post-pauta pendiente y qué invitados se repiten ese día.
- Desde cualquier fila de Hoy se abre el programa con **Abrir** o
  **Preparar**.
- La administración queda en el menú **Administrar**: programas, parrilla y
  accesos, calendario anual, fichas de personas y novedades.

### Espacio del programa: el mismo para todos

- Lo usan el productor y producción general. Tiene tres pestañas: **Pauta**,
  **Post-pauta** e **Invitados**.
- Un indicador de cuatro pasos muestra en qué punto está la emisión y cuál es
  la siguiente acción: **Pauta → Lista → Post-pauta → Cerrada**.
- Las indicaciones aparecen en un panel compacto que se cierra con
  **Entendido**.

### Invitados repetidos

Se considera repetida a la misma persona (nombre normalizado) invitada a dos
programas distintos en la misma fecha. La herramienta avisa, pero no bloquea:

- en Hoy;
- en Invitados;
- en la pauta de cada productor afectado.

## Pauta y post-pauta (v0.40.0)

### Preparar la pauta

1. **El texto.** Un único compositor para pegar o escribir, con un ejemplo de
   formato a la vista.
2. **La vista previa.** Se ven bloques, horarios e invitados, cada uno con su
   estado en la base (ya existe, posible coincidencia o persona nueva). Aquí
   no se edita: solo se acepta o se quita un bloque.
3. **La escaleta.** Es el único lugar donde se edita. Cada bloque muestra lo
   esencial (horario, tipo, título, tema, invitados y notas), y lo poco usado
   queda en *Más opciones*.

Antes había dos editores con unos 14 campos por bloque: uno dentro de la
propuesta de la IA y otro en la escaleta.

### Post-pauta heredada

- La post-pauta no se escribe de nuevo: cada bloque de la pauta llega con su
  horario e invitados.
- El productor responde dos cosas por bloque: si **salió** (Salió, Parcial o
  No salió) y **qué se dijo**.
- **Todo salió según la pauta** marca de una vez los bloques pendientes con
  su horario previsto.
- Corregir lo que vino de la pauta (título, tema o invitados) queda dentro de
  un desplegable de cada bloque.
- La IA (video de YouTube, grabación o minuta) está en un panel opcional.

## Siguientes pasos sugeridos

1. **Confirmación de lectura en la base.** Hoy, "Entendido" solo queda
   guardado en el navegador del productor. Guardarlo en Supabase permitiría
   que producción general vea quién leyó cada indicación.
2. **Respuesta a una indicación en un clic:** Visto, Incorporado (vinculado a
   un bloque) o No aplica.
3. **Retirar el CSS de las vistas antiguas.** Las vistas Agenda, Mesa y
   Recepción ya no se usan, pero su CSS sigue en el código.
