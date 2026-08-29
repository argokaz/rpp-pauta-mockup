# Evaluación del modelo para ordenar pautas

Fecha: 28 de agosto de 2026

## Decisión

Usar `gpt-5.6-terra` con `reasoning.effort: low` para el piloto. Mantener
`gpt-5.4-mini` como alternativa de menor costo si el volumen crece y una
evaluación más amplia demuestra que su tasa de corrección humana es aceptable.

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

## Fuentes oficiales

- [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [Guía de selección y migración GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)
