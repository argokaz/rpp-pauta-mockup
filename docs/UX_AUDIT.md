# Auditoría UX de Pauta RPP

Fecha: 28 de agosto de 2026

## Decisión general

El mockup original definía mejor el modelo mental del producto que la primera
implementación funcional. La versión 0.4.0 recupera sus cuatro espacios y les
asigna una pregunta operativa:

| Vista | Pregunta que resuelve | Acción principal |
| --- | --- | --- |
| A. Agenda | ¿Qué programa va y a qué hora? | Abrir un bloque |
| B. Programa | ¿Qué estoy preparando? | Editar y guardar una pauta |
| C. Mesa | ¿Qué necesita atención hoy? | Resolver pendientes por estado |
| D. Recepción | ¿Dónde ubico este texto recibido? | Pegar, ordenar y confirmar |

## Problemas encontrados

1. La navegación funcional había reducido el producto a una sola agenda y
   ocultaba los flujos específicos del productor y de la productora general.
2. El resultado de IA aparecía como un formulario modal extenso. Esto hacía
   difícil leer primero la escaleta y editar solo las excepciones.
3. El cliente enviaba a la API una copia del token de sesión. Si Supabase
   renovaba la sesión, esa copia podía quedar vencida y la API respondía
   “La sesión ya no es válida”.
4. Cualquier evento de autenticación borraba temporalmente el perfil. Por eso
   cambiar de pestaña podía mostrar la pantalla de verificación aunque la
   sesión siguiera guardada.

## Criterios aplicados

- Campos con etiquetas visibles, controles nativos y foco perceptible.
- Objetivos táctiles de al menos 44 por 44 píxeles en navegación principal.
- Botones para acciones y navegación de vista; no se simulan controles con
  elementos no interactivos.
- La escaleta prioriza tiempo, título, tipo, invitado y estado. Los campos
  largos permanecen editables dentro de cada fila expandible.
- Los cues de producción se mantienen visualmente separados del contenido
  editorial.
- La mesa agrupa por estado operativo, mientras la agenda mantiene el orden
  cronológico. Son tareas distintas y no deben competir en una sola pantalla.

## Referencias

- [BBC Global Experience Language](https://bbc.github.io/gel/)
- [BBC GEL: Form fields](https://bbc.github.io/gel/components/form-fields/)
- [BBC GEL: Focus](https://bbc.github.io/gel/foundations/focus/)
- [BBC GEL: Global navigation](https://bbc.github.io/gel/components/global-navigation/)
- [BBC Academy: Proteus production guide](https://downloads.bbc.co.uk/academy/academyfiles/Indie_%20Proteus_production_guide.pdf)
- [Ross Inception: Running Order](https://help.rossvideo.com/inception/help/v15.0/UserHelp/Online_Help_System/Dialogs/Running_Order/Running_Order.htm)
- [Ross Inception: Production Cues](https://help.rossvideo.com/inception/help/v15.7/UserHelp/Online_Help_System/Procedures/Broadcast_Stories/Production_Cues.htm)

## Simplificación del recorrido diario — 8 de septiembre de 2026

Implementado en la versión 0.39.0:

- Producción muestra programa y fecha antes de las indicaciones. Las novedades se
  basan en indicaciones nuevas o actualizadas; los feriados futuros no generan
  una alerta genérica. Las próximas fechas permanecen consultables en un panel
  plegable.
- La pauta vacía ofrece dos entradas: Pegar prepauta y Crear por bloques. El
  editor abre antes de la escaleta, con foco en el texto también en teléfonos.
- Guardar y marcar lista guarda la emisión seleccionada y solo muestra Lista
  después de recibir confirmación. Espera a que terminen los guardados por
  bloque y no permite cerrar sobre errores o conflictos pendientes.
- El estado global distingue cambios por guardar, guardado en curso, error,
  conflicto y guardado confirmado. Reintentar conserva la intención de marcar
  lista cuando esa acción falló. La salida del navegador avisa si hay cambios
  pendientes.
- Invitados en pauta describe inclusión editorial, sin afirmar confirmación de
  asistencia.
- Post-pauta separa Durante el programa y Después del programa sobre los mismos
  datos. Los controles operativos son directos; los documentos y fuentes quedan
  plegados en revisión. Los campos de cada bloque se guardan automáticamente.
- Revisar pendientes abre y enfoca el primer bloque incompleto. La lista de
  pendientes y el cierre usan la misma regla: resultado y resumen, u omisión;
  las noticias se evalúan individualmente. Una emisión vacía ofrece cómo empezar.
- La fecha permanece accesible en Post-pauta y la ayuda describe el recorrido
  actualizado.

Validación local: creación y edición de un bloque; marcar lista y recargar;
registro de inicio y fin; salto al pendiente; resumen y cierre editorial.
Revisión móvil a 390 × 844: editor enfocado y sin desborde horizontal.

## 10 de septiembre de 2026 · v0.40.0

La entrada de coordinación es **Hoy**: programas en emisión, pendientes,
recepción de pautas e indicaciones. Agenda conserva la planificación semanal y
Mesa la revisión por estado. Las herramientas secundarias se agrupan en
Coordinar, Consultar y Configurar; la guía explica tareas en lugar de letras.

Se aumentó la tipografía de toda la interfaz: cuerpo y campos de 16 px,
etiquetas secundarias de al menos 14 px, títulos de bloque de 19 px en
Producción. La navegación y las acciones se adaptan al ancho disponible.

**Activar demo** está en la franja superior tanto de coordinación como de
Producción. Usa un repositorio local independiente, sin credenciales ni
contenido editorial de la base real. Solo copia la estructura de programas y
horarios; crea ejemplos ficticios para la semana actual en Lima. Los estados
reflejan la hora de activación. Se reservan pautas vacías y resúmenes pendientes.

La bienvenida enumera qué está lleno y abre ejercicios concretos. La lectura
local de prepautas funciona con un texto de ejemplo; IA, video y creación de
accesos reales requieren Trabajo real. Los ejercicios se conservan por cuenta
y semana en el navegador. Al reabrir se actualizan ejemplos intactos y se
mantienen los modificados; Reiniciar demo descarta solo las pruebas del demo.

Validación: pruebas de calendario Lima y cambio de semana, antes/durante/después
de emisión, separación del contenido real, persistencia y reinicio, cambios de
bloques e indicaciones sin red y revisión local de prepautas. Recorrido manual
con texto de ejemplo, aceptación y guardado, vuelta al trabajo real y revisión
a 390 px de ancho.
