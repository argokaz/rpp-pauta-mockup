export type VersionEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const CURRENT_VERSION = "0.8.0";

export const versionHistory: VersionEntry[] = [
  {
    version: "0.8.0",
    date: "2026-08-28",
    title: "Rundown editorial más claro y flexible",
    changes: [
      "Vista ordenada estrena bloques con mayor jerarquía visual, colores por tipo, duración visible y controles de despliegue más claros.",
      "Los bloques pueden arrastrarse para reordenarlos sin modificar silenciosamente sus horarios.",
      "Cada bloque ofrece duraciones rápidas de 15, 30, 45 y 60 minutos, manteniendo la edición libre al minuto.",
      "La revisión generada por IA tiene una acción fija y explícita para aceptar y guardar la pauta.",
      "Después de ordenar, el texto original se compacta y la pauta estructurada ocupa el espacio principal; el original se puede reabrir cuando se necesite.",
      "El productor responsable se guarda por programa y fecha, se recupera automáticamente y reutiliza nombres anteriores como autocompletado.",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-08-28",
    title: "Mesa interactiva y primera experiencia móvil",
    changes: [
      "La navegación sigue ahora la jerarquía Agenda, Mesa, Programa y Recepción.",
      "Los programas pueden arrastrarse entre los estados de la Mesa y el cambio se guarda sin reescribir la pauta.",
      "Cada tarjeta incluye un selector de estado accesible para operar también desde teléfonos y teclado.",
      "Las pautas vacías no pueden marcarse como listas o post-pauta por accidente.",
      "Mesa, Agenda, Programa y Recepción tienen controles táctiles, desplazamiento horizontal y composición responsive desde 375 px.",
    ],
  },
  {
    version: "0.6.1",
    date: "2026-08-28",
    title: "Kanban y calendario libre",
    changes: [
      "La Mesa C se identifica claramente como un Kanban editorial organizado por estado.",
      "Recepción D permite elegir cualquier fecha desde un calendario ubicado después de Domingo.",
      "Las fechas fuera de la semana visible cargan los programas correspondientes a su día real.",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-08-28",
    title: "Directorio histórico de personas",
    changes: [
      "La sección Personas permite buscar invitados y colaboradores por nombre, tema o programa.",
      "Cada ficha reúne apariciones, cargo, programa, resumen y evidencia original del bloque.",
      "Los invitados recurrentes aparecen como autocompletado y recuperan automáticamente su cargo conocido.",
      "Las apariciones conservan una copia editorial aunque la escaleta se modifique posteriormente.",
      "Juan Carlos Ortecho quedó clasificado como colaborador deportivo y no como invitado.",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-08-28",
    title: "Luna con validación editorial",
    changes: [
      "GPT-5.6 Luna es ahora el modelo principal para ordenar pautas con menor costo por documento.",
      "Los invitados, horarios, conductores, productores y fechas se verifican contra el texto original antes de mostrarse.",
      "Una persona mencionada en una noticia ya no puede ingresar al histórico como invitada sin una etiqueta explícita de entrevista.",
      "Terra se usa como respaldo únicamente si Luna omite un invitado identificado explícitamente o no logra producir una pauta válida.",
    ],
  },
  {
    version: "0.4.1",
    date: "2026-08-28",
    title: "Terra se mantiene tras comparar con Luna",
    changes: [
      "Se compararon GPT-5.6 Luna y Terra en dos rondas con las dos pautas reales del piloto.",
      "Luna redujo el costo aproximado por pauta, pero en una ronda confundió a Keiko Fujimori y Juan Gabriel con invitados.",
      "Terra mantuvo la extracción correcta de invitados en todas las pruebas, por lo que sigue siendo el modelo del piloto.",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-08-28",
    title: "Un espacio para cada tarea editorial",
    changes: [
      "Regresaron las vistas A. Agenda, B. Programa, C. Mesa y D. Recepción del mockup original.",
      "La productora general puede elegir un bloque, pegar un mensaje y revisar una vista ordenada y editable.",
      "La sesión permanece visible al cambiar de pestaña y Ordenar pauta renueva el acceso automáticamente si el token venció.",
      "La escaleta generada ahora se lee en filas compactas y abre los campos detallados solo cuando se necesita editar.",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-08-28",
    title: "Mayor precisión editorial",
    changes: [
      "El importador de pautas usa GPT-5.6 Terra después de compararlo con dos pautas reales.",
      "Se añadió este historial de versiones, accesible desde la esquina inferior izquierda.",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-08-28",
    title: "Pautas ordenadas con IA",
    changes: [
      "La productora general puede pegar una pauta de WhatsApp, email o documento y ordenarla automáticamente.",
      "La propuesta se revisa y edita antes de aplicarse; el texto original queda guardado para auditoría.",
      "Se extraen horarios, temas, enfoques, invitados, cargos, preguntas y cues de producción.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-08-28",
    title: "Piloto editorial compartido",
    changes: [
      "Agenda semanal con programas administrados y bloques que aparecen solo como horario.",
      "Indicaciones semanales y fechas importantes editables.",
      "Acceso demo, persistencia en Supabase y despliegue en Vercel con la interfaz visual del mockup.",
    ],
  },
];
