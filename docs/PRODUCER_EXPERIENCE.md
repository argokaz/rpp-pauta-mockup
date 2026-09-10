# Experiencia por programa

## Principio

Todos los perfiles usan la misma base editorial, pero no la misma interfaz.

- La producción general necesita Agenda, Mesa, Recepción, Post-pauta y una visión transversal.
- El productor de un programa entra directamente a su pauta del día, sus invitados y su post-pauta.
- Bulletin, fechas importantes, Personas y el histórico son recursos compartidos.
- Los permisos de escritura siguen la membresía del programa en Supabase; ocultar una pantalla no sustituye la autorización en base de datos.

## Mockup de Encendidos

El acceso `produccion` abre únicamente Encendidos y prioriza:

1. Indicaciones y fechas compartidas.
2. Estado, bloques e invitados de la pauta del día.
3. Escaleta editable construida desde la prepauta recibida.
4. Pauta original dentro de un panel secundario plegable.
5. Base de invitados por especialidad y temas anteriores.
6. La misma escaleta transformada en registro de post-pauta.

La producción general puede entrar al mismo espacio con **Ver como producción** y regresar sin cambiar de cuenta.

## De pre-pauta a post-pauta

El productor no crea una segunda pauta. Cada bloque planificado recibe datos reales:

- hora de entrada y salida;
- resultado emitido, parcial, omitido o añadido en vivo;
- resumen de lo dicho;
- cita o idea destacada y su estado de verificación.

Los botones operativos se guardan por bloque. Los textos se persisten al salir del campo y el cierre editorial actualiza el histórico del invitado. Supabase Realtime notifica cambios de emisiones y segmentos a otras sesiones abiertas.

## Histórico

El buscador transversal consulta título, invitado, cargo, tema, enfoque, notas,
resumen, cita, programa, productor y fecha directamente en PostgreSQL. La
consulta devuelve veinte resultados por vez, combina filtros y tolera pequeños
errores en nombres de invitados. La vista general también puede abrir la pauta
o post-pauta correspondiente desde cada hallazgo.

## Demo actual y legibilidad · v0.40.0

Pulsa **Activar demo** en la franja superior. El popup muestra pautas ya llenas y
ofrece una pauta vacía o una post-pauta para completar. **Qué puedo probar**
reabre la guía. En una pauta vacía, Pegar prepauta ofrece **Cargar texto de ejemplo**:
puedes modificarlo, convertirlo en escaleta, aceptar y marcar la pauta lista.

El demo se prepara con la semana y hora de Lima al activarlo. Las pruebas se
guardan solo en ese navegador, separadas de las emisiones reales. **Volver al
trabajo real** devuelve la vista anterior. **Reiniciar demo** recrea los ejemplos
actuales y elimina los ejercicios locales de esa semana, previa confirmación.
La lectura de prepautas es local; IA, video y accesos reales no se ejecutan allí.

Campos de 16 px, textos secundarios de al menos 14 px y títulos de bloque más
grandes facilitan la operación. Los botones se redistribuyen en móvil para
mantener la lectura sin desplazamiento horizontal de la página.
