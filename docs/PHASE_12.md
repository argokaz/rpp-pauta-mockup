# Fase 12: identidad y base editorial

## Objetivo

Dar a cada programa administrado una interfaz editorial reconocible sin fragmentar el producto: todos usan el mismo flujo, la misma base de personas y el mismo tablero compartido, pero el nombre y el acento visual pertenecen al programa.

## Modelo implementado

- `programs.accent_color`: color personalizable de la interfaz de producción.
- `segments.participant_items`: varias personas por bloque, cada una con rol, cargo, organización y evidencia.
- `segments.entity_items`: organizaciones, lugares, eventos y sucesos separados de las personas.
- `people.editorial_roles`: conducción, invitado, producción, reportería, especialista o colaboración.
- `people.contact_items`: teléfono, WhatsApp o email con procedencia, vigencia y contacto principal.
- `people.program_roles`: relación explícita entre una persona, un programa y su función.

Los campos antiguos `guest_text`, `guest_role` y `contact_phone` se mantienen temporalmente como compatibilidad. El primer invitado del bloque se refleja allí para que las versiones anteriores y las búsquedas existentes continúen funcionando.

## Reglas editoriales

1. Una persona solo entra automáticamente como invitada cuando existe una etiqueta explícita `INVITADO:`, `INVITADA:` o equivalente en el original.
2. Un bloque puede tener cualquier cantidad de participantes y cada uno conserva su rol propio.
3. Los conductores conocidos se crean como perfiles reutilizables y se vinculan al programa; nombres genéricos como “equipo por confirmar” no generan fichas.
4. Fusionar duplicados conserva el perfil principal, mueve apariciones y combina alias, roles y contactos. La actualización y la eliminación quedan auditadas.
5. La procedencia y vigencia de un contacto forman parte de la ficha y de su historial restaurable.

## Accesos

No se crean cuentas automáticamente. Desde `Administrar > Accesos y equipo`, el superadmin puede generar uno o varios accesos para cualquier programa administrado. Cada acceso abre directamente la identidad editorial del programa asignado.
