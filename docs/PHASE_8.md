# Fase 8: bloques fijos y pre-pauta recurrente

La octava fase permite preparar una vez las secuencias que se repiten en días
concretos. Cada regla pertenece a un programa y define nombre, tipo, días de la
semana, hora sugerida, duración, vigencia y, opcionalmente, una persona, cargo y
nota base.

El caso inicial es **Tecnoverso** en Encendidos: miércoles y viernes a las
11:30, con diez minutos sugeridos y Arturo Goga como persona habitual.

## Regla recurrente y copia diaria

La regla no es un bloqueo del horario. Al abrir una fecha aplicable, la pauta
recibe una copia editable como cualquier otro bloque. El productor puede:

- moverla dentro de la escaleta;
- ajustar su hora o duración al minuto;
- completar o cambiar el tema y el invitado;
- reemplazarla con el contenido importado;
- quitarla solo para esa fecha.

La emisión recuerda que esa repetición ya fue aplicada. Por eso, si el
productor decide omitirla, no vuelve a aparecer al recargar la pauta.

## Cambios futuros sin reescribir el pasado

“Cambiar repetición” crea una nueva vigencia desde la fecha elegida y cierra la
regla anterior el día previo. “Retirar” detiene nuevas copias desde esa fecha.
Las pautas ya creadas y el historial previo se conservan.

## Importación y duplicados

Cuando una prepauta pegada ya incluye la secuencia recurrente, la herramienta
la reconoce por su nombre o secuencia, conserva el horario y contenido del
texto recibido, y la vincula a la regla en vez de crear un duplicado.

## Persistencia

Supabase guarda las reglas en `recurring_blocks`, la relación de cada copia en
`segments.fixed_block_id` y las reglas ya aplicadas a una emisión en
`emissions.applied_fixed_block_ids`. Las políticas RLS reutilizan los permisos
por programa: solo quien puede administrar ese programa puede cambiar sus
repeticiones.
