# Evaluación del modelo para ordenar pautas

Fecha: 28 de agosto de 2026

## Decisión

Usar `gpt-5.6-luna` con `reasoning.effort: low` como modelo principal, protegido
por validaciones determinísticas de evidencia literal. Usar `gpt-5.6-terra`
solo como respaldo si Luna omite un invitado marcado explícitamente o no logra
producir una salida estructurada válida.

## Prueba realizada

Se ejecutó la misma ruta, instrucciones y esquema estructurado con ambos modelos
sobre dos documentos reales:

- Pre-pauta de Encendidos, con ocho intervalos horarios y un pase final.
- Pauta de Las Noticias, sin horarios explícitos, con cinco titulares, cuatro
  informes, apertura y despedida.

Los resultados temporales de la prueba se eliminaron de `raw_imports`; se
conservaron únicamente las dos importaciones originales del piloto.

## Resultado observado

| Criterio | GPT-5.4 Mini | GPT-5.6 Terra |
| --- | --- | --- |
| Esquema válido | 2 de 2 | 2 de 2 |
| Horarios explícitos respetados | Sí | Sí |
| Bloques sin hora dejados vacíos | Sí | Sí |
| Invitados vs. personas mencionadas | Marcó erróneamente a Keiko Fujimori y Juan Gabriel como invitados | No creó esos falsos invitados |
| Pase final de Encendidos | Lo omitió como bloque | Lo conservó como cue sin hora |
| Normalización de fecha y programa | Conservó texto en mayúsculas y fecha textual | Devolvió nombres legibles y fecha ISO |
| Latencia observada | 7.8 s y 8.7 s | 9.8 s y 11.9 s |

Terra tardó aproximadamente 2.6 segundos más por pauta en esta muestra pequeña,
pero evitó errores que afectarían directamente el histórico de personas y la
búsqueda editorial. La diferencia justificó el cambio para esta etapa de bajo
volumen y revisión humana obligatoria.

## Costo oficial

- GPT-5.4 Mini: USD 0.75 por millón de tokens de entrada y USD 4.50 por millón
  de tokens de salida.
- GPT-5.6 Terra: USD 2.00 por millón de tokens de entrada y USD 12.00 por millón
  de tokens de salida.

Terra cuesta 2.67 veces más por token. Debemos medir tokens, tiempo de revisión
y correcciones humanas durante el piloto; el costo por documento aislado no es
suficiente para decidir si un modelo es más económico en operación.

## Próxima evaluación

Repetir la comparación al llegar a 30–50 pautas revisadas. Medir:

1. Correcciones de invitados y cargos.
2. Correcciones de horario y cantidad de bloques.
3. Omisiones y entidades inventadas.
4. Latencia y tokens por documento.
5. Minutos de revisión humana antes de aplicar.

## Comparación adicional: GPT-5.6 Luna

El 28 de agosto de 2026 se repitió la evaluación con GPT-5.6 Luna y GPT-5.6
Terra. Se hicieron dos rondas independientes sobre cada una de las dos pautas
reales, con el mismo prompt, esquema estructurado y razonamiento bajo.

| Criterio | GPT-5.6 Luna | GPT-5.6 Terra |
| --- | --- | --- |
| Esquema válido | 4 de 4 | 4 de 4 |
| Encendidos: horarios, cinco invitados, bloque vacío y pase final | Correcto en 2 de 2 rondas | Correcto en 2 de 2 rondas |
| Las Noticias: personas mencionadas no tratadas como invitados | Correcto en 1 de 2 rondas | Correcto en 2 de 2 rondas |
| Fecha normalizada a ISO | 2 de 4 respuestas | 4 de 4 respuestas |
| Latencia promedio observada | 12.0 s | 11.0 s |
| Costo promedio estimado por pauta | USD 0.00223 | USD 0.02048 |

En la segunda ronda de Las Noticias, Luna asignó a Keiko Fujimori y Juan
Gabriel como invitados aunque solo eran protagonistas de titulares. Es el
error que más daño produciría en el futuro histórico de personas y entrevistas.
Terra no cometió ese error en ninguna ronda.

Luna fue aproximadamente 9.2 veces más barata en estas llamadas, pero no fue
más rápida. Con la muestra observada, 1,000 pautas similares costarían
aproximadamente USD 2.23 con Luna o USD 20.48 con Terra. En ese momento el
piloto mantuvo Terra; la decisión quedó reemplazada por la reevaluación con
guardrails que se describe a continuación.

## Reevaluación con guardrails

Se añadieron cuatro defensas que no dependen de que el modelo «recuerde» una
instrucción:

1. `guestName` solo se acepta si el original contiene una etiqueta explícita
   como `INVITADA:` o `ENTREVISTA A:` con ese mismo nombre.
2. Personas de titulares, fuentes, conductores, productores y colaboradores
   presentados con «con» se conservan en el contenido, pero no como invitados.
3. Las horas se eliminan si no aparecen literalmente en el original y las
   fechas españolas inequívocas se normalizan a ISO.
4. Si falta un invitado marcado explícitamente, la ruta repite la extracción
   con Terra y muestra la intervención como advertencia revisable.

Después del cambio se hicieron tres rondas adicionales con Encendidos y tres
con Las Noticias. Las seis terminaron con Luna, sin activar el respaldo:

- Encendidos conservó en 3 de 3 rondas a sus cuatro invitados etiquetados,
  nueve bloques, el intervalo vacío y el pase final.
- Las Noticias mantuvo en 3 de 3 rondas a Keiko Fujimori y Juan Gabriel fuera
  del campo Invitado.
- Las seis respuestas entregaron la fecha `2026-08-28` y una estructura válida.
- La latencia media observada fue aproximadamente 11.9 segundos.

Esta muestra valida la migración inicial, no una garantía estadística. Debe
mantenerse la revisión humana y repetirse la medición con 30 a 50 pautas reales,
incluyendo formatos nuevos y casos con más de un invitado por bloque.

## Fuentes oficiales

- [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Comparación oficial de modelos](https://developers.openai.com/api/docs/models/compare)
- [Guía de selección y migración GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)
