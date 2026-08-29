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
- Una segunda capa determinística contrasta invitados, horas, fecha, conducción
  y producción con evidencia literal del texto original.
- Una persona mencionada en un titular o desarrollo no entra al campo Invitado
  si no está precedida por una etiqueta explícita de entrevista.
- El modelo no escribe emisiones ni segmentos. Solo la confirmación humana
  guarda la escaleta.
- La solicitud usa `store: false`.
- Los intentos fallidos quedan registrados para poder auditarlos y reintentarlos.

## Modelo y respaldo elegidos para el piloto

El piloto usa `gpt-5.6-luna` con razonamiento bajo como modelo principal. El
modelo se puede cambiar mediante `OPENAI_MODEL` sin modificar código. Luna se
elige por su menor costo para el volumen de pautas esperado.

La precisión ya no depende solo del modelo. La aplicación retira cualquier
invitado u hora sin respaldo literal, normaliza la fecha seleccionada cuando
aparece en el original y marca la corrección para revisión. Si Luna omite una
persona identificada explícitamente como invitado o no devuelve una estructura
válida, se realiza una segunda extracción con `gpt-5.6-terra`. Este respaldo se
configura mediante `OPENAI_FALLBACK_MODEL`.

La propuesta siempre requiere confirmación humana antes de modificar la pauta.

Consulta el detalle en [Evaluación de modelos](./MODEL_EVALUATION.md).

## Referencias oficiales

- [Responses API](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create)
- [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
