# Estándar propuesto para pre-pauta y post-pauta

## Decisión

La unidad base será una emisión de un programa en una fecha. Dentro de ella habrá una lista ordenada de segmentos. Se conserva siempre el texto original y, en paralelo, una versión estructurada producida por el LLM y confirmada por una persona.

Este enfoque toma conceptos habituales de un running order profesional: hora de inicio, duración objetivo, tiempo acumulado, tipo, slug, conductor, estado, instrucciones de producción y tiempo real al aire. Ross Video documenta esos campos y distingue el tiempo planificado del tiempo real. La guía de producción de BBC indica además que el running order final debe reflejar el orden realmente emitido y registrar a los participantes y sus roles.

## Encabezado de la emisión

- `program_id` y nombre visible
- `date`, `planned_start`, `planned_end`
- `state`: `pre`, `ready`, `on_air`, `post`, `archived`
- conductores y equipo de producción
- canal de origen y remitente
- texto original inmutable
- versión, autor de la última edición y fecha de modificación

## Segmento normalizado

```json
{
  "order": 2,
  "planned_start": "10:15",
  "planned_end": "10:45",
  "planned_duration_seconds": 1800,
  "timing_basis": "exact_from_source",
  "type": "interview",
  "sequence": null,
  "slug": "Uso problemático del celular",
  "topic": "Señales de alerta en niños",
  "focus": "Diferenciar uso normal y problemático",
  "people": [
    {
      "name_raw": "ERIKA ALVAREZ VELIZ",
      "person_id": null,
      "role": "guest",
      "description": "Psicóloga clínica",
      "match_status": "suggested"
    }
  ],
  "audience_question": null,
  "production_cues": [],
  "contacts": [],
  "assets": [],
  "editorial_notes": [],
  "status": "needs_review",
  "confidence": 0.98,
  "source_excerpt": "10:15 - 10:45 ..."
}
```

## Reglas para el LLM

1. Extraer antes de resumir.
2. Usar Structured Outputs con un JSON Schema estricto para que todos los mensajes produzcan el mismo contrato de datos.
3. Calcular una duración solo cuando existen inicio y fin explícitos. Marcar cualquier estimación como `estimated`, nunca como horario confirmado.
4. Mantener como vacío un bloque sin contenido y generar una alerta editorial.
5. No inventar conductor, productor, invitado, cargo, contacto ni tema.
6. Mantener separado el texto que se lee al aire, las instrucciones de producción y los cues.
7. Resolver personas contra el histórico como sugerencia. Una coincidencia no se fusiona automáticamente si el nombre o cargo es ambiguo.
8. Guardar el fragmento de origen y la confianza de cada extracción para que la revisión sea auditable.

## Post-pauta

La post-pauta reutiliza los mismos segmentos y añade:

- `actual_start`, `actual_end`, `actual_duration_seconds`
- `disposition`: `aired`, `partial`, `skipped`, `added_live`
- invitados que realmente participaron
- resumen de lo dicho
- citas textuales con persona y timestamp
- URL de audio, video o transcripción
- diferencias respecto de la pre-pauta

## YouTube

YouTube permite ver una transcripción cuando el video tiene subtítulos y saltar a un momento concreto desde cada línea. Por eso conviene almacenar `video_id`, URL, idioma, si el subtítulo es automático, texto y marcas de tiempo. Las citas deben conservar el timestamp y quedar pendientes de revisión humana cuando provengan de subtítulos automáticos.

## Fuentes consultadas

- [Ross Video Inception: Running Order](https://help.rossvideo.com/inception/help/v15.0/UserHelp/Online_Help_System/Dialogs/Running_Order/Running_Order.htm)
- [Ross Video Inception: Production Cues](https://help.rossvideo.com/inception/help/v15.7/UserHelp/Online_Help_System/Procedures/Broadcast_Stories/Production_Cues.htm)
- [BBC Proteus Production Guide](https://downloads.bbc.co.uk/academy/academyfiles/Indie_%20Proteus_production_guide.pdf)
- [OpenAI API: Structured Outputs con JSON Schema](https://platform.openai.com/docs/api-reference/responses-streaming/response/output_item?lang=node.js)
- [YouTube Help: ver transcripciones](https://support.google.com/youtube/answer/15930243?hl=es)
