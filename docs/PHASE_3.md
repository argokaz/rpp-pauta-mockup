# Fase 3: directorio histórico de personas

## Objetivo

Convertir los nombres verificados de una pauta en un archivo reutilizable. Una
productora puede encontrar a una persona recurrente, saber en qué programas
participó, revisar qué tema trató y reutilizar su nombre y cargo sin volver a
escribirlos.

## Flujo implementado

1. Al guardar una pauta, cada invitado se normaliza para evitar duplicados por
   mayúsculas, acentos o espacios.
2. La persona se vincula a la emisión y al segmento donde participó.
3. La aparición conserva cargo, rol, resumen, tema, enfoque, título y evidencia
   original como una copia histórica.
4. La sección `Personas` permite buscar por nombre, tema o programa.
5. Los campos de invitado ofrecen autocompletado; al elegir una coincidencia se
   recupera también el cargo conocido.

## Distinciones editoriales

- `guest`: persona identificada explícitamente como invitada o entrevistada.
- `other`: colaborador o participante presentado dentro de un bloque, pero no
  como entrevista.
- Los nombres mencionados en titulares no generan apariciones.
- Conducción, producción, reporteros y especialistas ya existen como roles del
  modelo de datos, pero su sincronización automática se implementará después
  de reunir ejemplos reales de cómo llegan en las pautas.

## Persistencia

Las migraciones `202608290006_people_directory.sql` y
`202608290007_appearance_evidence_snapshot.sql` activan y completan las tablas
`people` y `appearances` existentes. También reconstruyen el histórico inicial
del piloto y corrigen la clasificación de Juan Carlos Ortecho.

La evidencia se duplica deliberadamente dentro de la aparición. Esto permite
conservar el registro histórico aunque la escaleta sea reorganizada o el
segmento original sea reemplazado durante una edición.

## Límites pendientes

- Editar alias, organización y notas de una persona desde la interfaz.
- Representar más de un invitado en el mismo segmento.
- Incorporar conductores, productores y reporteros automáticamente.
- Extraer citas y resúmenes desde post-pautas o transcripciones de YouTube.
- Crear entidades separadas para organizaciones, lugares, eventos y sucesos.
