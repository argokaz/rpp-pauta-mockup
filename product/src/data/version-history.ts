export type VersionEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const CURRENT_VERSION = "0.3.0";

export const versionHistory: VersionEntry[] = [
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
