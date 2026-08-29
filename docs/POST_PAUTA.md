# Post-pauta: flujo editorial y archivo

## Decisión de producto

La post-pauta se divide en dos momentos porque tienen cargas cognitivas distintas:

1. **Durante la emisión:** registrar sólo hechos operativos. El productor marca inicio, fin, salida parcial, omisión o un bloque añadido en vivo. Una nota breve es opcional.
2. **Después de la emisión:** revisar qué se dijo, añadir una cita o idea destacada, vincular la grabación y enviar el registro a verificación.

La pauta planificada nunca se sobrescribe. Los horarios y resultados reales forman un registro `as-run` separado, útil para comparar lo previsto con lo emitido.

## Estados

- `capture`: registro operativo en curso.
- `review`: la emisión terminó y espera revisión editorial.
- `verified`: una persona revisó el contenido y cerró la post-pauta.

Los bloques usan `aired`, `partial`, `skipped` o `added_live`. Una post-pauta sólo se puede verificar cuando cada bloque tiene un resumen o fue marcado como no emitido.

## Citas y resúmenes

- **Resumen:** paráfrasis editorial de lo que se dijo. No lleva comillas.
- **Idea destacada:** texto útil aún pendiente de comprobar.
- **Cita verificada:** transcripción literal comparada por una persona con el audio. Sólo entonces `quote_verified` puede ser verdadero.

Cuando un bloque tiene invitado, su resumen y sus citas se copian a la aparición histórica de esa persona. Esto permite buscar después por invitado, tema, programa o contenido de la intervención.

## Transcripción: siguiente integración

El registro admite como fuente YouTube de RPP, grabación interna o archivo de audio. El pipeline recomendado es:

1. Obtener la fuente autorizada.
2. Transcribir con timestamps y, cuando haga falta, separación de hablantes.
3. Alinear los intervalos de la transcripción con los bloques `as-run`.
4. Usar Luna para proponer resumen, entidades y citas candidatas.
5. Mostrar cada propuesta junto al audio y su timestamp.
6. Incorporarla al histórico sólo después de la revisión humana.

La API oficial de YouTube no permite descargar subtítulos de cualquier video público: requiere OAuth y permiso para editar el video. La transcripción nunca debe depender exclusivamente de YouTube.

## Referencias de industria

- [Avid MediaCentral Rundown](https://mediacentral.avid.com/mccux/Content/MCUX_Users_Guide/Working_with_the_Rundown_App.htm): rundown y noticias sincronizados, actualización automática y estados visibles.
- [Avid Timing Status Bar](https://mediacentral.avid.com/mccux/Content/MCUX_Users_Guide/Using_the_Timing_Status_Bar.htm): control de tiempos previstos y desvíos.
- [Octopus NRCS](https://www.octopus-news.com/octopus-nrcs/): una sola fuente editorial, colaboración en tiempo real y propuestas de IA supervisadas.
- [OpenAI GPT-4o Transcribe Diarize](https://developers.openai.com/api/docs/models/gpt-4o-transcribe-diarize): transcripción con identificación de hablantes.
- [YouTube Captions: download](https://developers.google.com/youtube/v3/docs/captions/download): autorización necesaria para descargar subtítulos mediante la API oficial.
