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
