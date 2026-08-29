# Fase 2: importación y estructuración con IA

## Objetivo

La productora general puede seleccionar un programa y una fecha, pegar una pauta
recibida por WhatsApp, email o documento, y convertirla en una escaleta legible.
La IA prepara una propuesta; una persona la revisa y confirma antes de modificar
la emisión.

## Flujo implementado

1. Seleccionar un bloque administrado.
2. Pegar la pauta original.
3. Elegir el canal de origen.
4. Pulsar `Ordenar pauta`.
5. Revisar horarios, tipo, tema, enfoque, invitado, cargo, pregunta al público,
   indicaciones de producción y notas.
6. Corregir o quitar bloques cuando sea necesario.
7. Pulsar `Aplicar y guardar`.

## Decisiones de seguridad y datos

- `OPENAI_API_KEY` existe solo en el servidor y no usa el prefijo
  `NEXT_PUBLIC_`.
- La ruta valida el token de Supabase y los permisos del programa antes de
  procesar texto.
- El texto pegado se conserva en `raw_imports` antes de llamar al modelo.
- OpenAI devuelve Structured Outputs validados con Zod.
- El modelo no escribe emisiones ni segmentos. Solo la confirmación humana
  guarda la escaleta.
- La solicitud usa `store: false`.
- Los intentos fallidos quedan registrados para poder auditarlos y reintentarlos.

## Modelo inicial

El piloto usa `gpt-5.4-mini` con razonamiento bajo. El modelo se puede cambiar
mediante `OPENAI_MODEL` sin modificar código. La elección prioriza menor latencia
y costo para una tarea de extracción bien definida.

## Referencias oficiales

- [Responses API](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create)
- [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
