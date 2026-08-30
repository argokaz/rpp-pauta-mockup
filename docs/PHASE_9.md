# Fase 9: accesos directos por programa

La novena fase permite que el superadmin prepare el ingreso de un programa sin
depender de una invitación por correo. La vista **Accesos y equipo** compara los
programas administrados con las asignaciones existentes y muestra cuáles todavía
no tienen un productor asociado.

## Creación en un paso

Al elegir **Crear acceso**, el servidor:

1. vuelve a comprobar la sesión y el rol de superadmin;
2. confirma que el programa está activo, administrado y sin otro productor;
3. crea un usuario corto basado en el programa;
4. genera una contraseña segura;
5. asigna la cuenta únicamente a ese programa.

La interfaz muestra usuario y contraseña una sola vez. El superadmin puede
copiarlos juntos y entregarlos por el canal interno que corresponda. Si se
pierden, la contraseña anterior se invalida y se genera una nueva desde la ficha
del acceso.

## Alcance y trazabilidad

Este acceso compartido reduce la fricción del piloto y registra la actividad con
el nombre del programa. No permite saber qué integrante concreto realizó cada
cambio. Cuando la operación necesite trazabilidad individual, las cuentas
personales y sus asignaciones continúan siendo compatibles con la misma base de
datos y los mismos permisos.

## Seguridad

La clave de servicio de Supabase permanece exclusivamente en el servidor. La
ruta no devuelve el correo técnico ni datos adicionales del perfil, desactiva el
almacenamiento en caché y solo entrega la contraseña durante la creación o
renovación solicitada por un superadmin autenticado.
