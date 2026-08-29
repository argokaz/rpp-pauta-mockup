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
aproximadamente USD 2.23 con Luna o USD 20.48 con Terra. La diferencia de costo
no compensa todavía el riesgo editorial, por lo que el piloto mantiene Terra.

Antes de reconsiderar Luna conviene reforzar la regla que solo permite llenar
guestName cuando el texto identifica explícitamente a una persona como invitado
o invitada, y repetir la evaluación con 30 a 50 pautas revisadas.

## Fuentes oficiales

- [GPT-5.4 Mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini)
- [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- [Comparación oficial de modelos](https://developers.openai.com/api/docs/models/compare)
- [Guía de selección y migración GPT-5.6](https://developers.openai.com/api/docs/guides/latest-model)
