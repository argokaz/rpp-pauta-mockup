# Fase 9: accesos directos por programa

La novena fase permite que el superadmin prepare uno o varios ingresos para cada
programa sin depender de una invitación por correo. La vista **Accesos y equipo**
muestra cuántas cuentas de producción tiene cada programa administrado y mantiene
siempre disponible la opción de crear otra.

## Creación en un paso

Al elegir **Crear acceso**, el servidor:

1. vuelve a comprobar la sesión y el rol de superadmin;
2. confirma que el programa está activo y administrado;
3. crea el siguiente usuario corto disponible para el programa;
4. genera una contraseña segura;
5. asigna la cuenta únicamente a ese programa.

La interfaz muestra usuario y contraseña una sola vez. El superadmin puede
copiarlos juntos y entregarlos por el canal interno que corresponda. El primer
usuario puede ser `encendidos`; los siguientes serán `encendidos-2`,
`encendidos-3` y así sucesivamente. Si una contraseña se pierde, la anterior se
invalida y se genera una nueva desde la ficha de ese acceso.

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
