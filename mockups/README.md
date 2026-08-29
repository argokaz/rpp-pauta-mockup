# Mockups Pauta RPP

Prototipo HTML navegable previo al desarrollo del producto. No incluye backend, autenticación ni llamadas reales a un LLM.

## Cómo abrirlo

Desde esta carpeta:

```bash
python3 -m http.server 4173
```

Luego abre `http://127.0.0.1:4173`.

## Opciones incluidas

- **A. Agenda semanal:** vista transversal por semana, día y horario. Incluye editor lateral de pre-pauta y post-pauta. Es la recomendada como pantalla principal.
- **B. Mi programa:** acceso directo por programa para productores que casi siempre trabajan en una sola emisión.
- **C. Mesa editorial:** coordinación por estado de avance. Funciona mejor para jefatura de producción y cierre de post-pautas.
- **D. Recepción general:** piloto operado solo por la productora general. Permite elegir un bloque, pegar mensajes recibidos por WhatsApp o correo, revisar el formato propuesto y crear la pre-pauta.

La programación está modelada como datos en `app.js`, separada de la estructura visual, para que añadir, mover o retirar programas no obligue a rediseñar la interfaz.

Los programas definidos para el piloto aparecen con la etiqueta **En herramienta**. Los demás siguen visibles para conservar la continuidad real de la señal, pero se muestran como **Solo horario**. El programa que está al aire se calcula usando la hora local y recibe un tratamiento amarillo distintivo.

El catálogo administrado incluye 22 programas:

- Rotativa AM de lunes a viernes, Rotativa Tarde y Rotativa del Aire Noche.
- Ampliación de noticias Lima y regional.
- Encendidos, Los Chistosos, Conexión, Las cosas como son, Prueba de fuego y Así somos.
- Rotativa AM y PM de sábado y domingo.
- Ampliación de noticias de sábado y domingo.
- Sencillo y al Bolsillo, En escena, Siempre en Casa, Diálogo de Fe y Domingo es fiesta.

## Recomendación de producto

La mejor solución no requiere escoger una sola pantalla para todos:

| Superficie | Usuario principal | Función |
| --- | --- | --- |
| Agenda semanal | Coordinación y jefatura | Ver toda la semana, detectar huecos y abrir cualquier bloque |
| Mi programa | Productor | Pegar, ordenar, editar y cerrar su propia emisión con menos distracciones |
| Mesa editorial | Jefatura de producción | Seguir estados, pendientes y post-pautas del día |
| Recepción general | Productora general | Probar el sistema sin pedir cuentas ni cambiar el trabajo de los demás equipos |

El piloto puede empezar únicamente con **Recepción general** y la **Agenda semanal**. La productora general centraliza lo que recibe por los canales actuales. Si el sistema demuestra valor, cada productor puede incorporarse después mediante **Mi programa**, sin cambiar el modelo de datos.

## Límites del prototipo

- El botón de IA simula una propuesta estructurada y no llama a un modelo real.
- La ficha de persona y las apariciones son datos de ejemplo.
- No hay cuentas, permisos, persistencia ni transcripciones reales.
- El logo se carga desde el activo público de RPP. La paleta toma el amarillo `#FFE000`, el carbón `#232323` y los neutros actuales de la marca.
