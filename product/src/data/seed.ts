import type { FixedBlock, Program, ScheduleSlot, WorkspaceState } from "@/domain/schemas";
import { peruNationalHolidays2026 } from "./peru-holidays";

const programCatalog: Array<Omit<Program, "accentColor">> = [
  { id: "rotativa-campo", name: "La Rotativa del Campo", shortName: "Rotativa del Campo", hosts: "Jesús Miguel Calderón", managed: false, active: true },
  { id: "rotativa-am", name: "La Rotativa del Aire | Edición Mañana", shortName: "Rotativa AM", hosts: "Carlos Villarreal y Joanna Castro", managed: true, active: true },
  { id: "ampliacion-lima", name: "Ampliación de noticias Lima", shortName: "Ampliación Lima", hosts: "Mávila Huertas y Fernando Carvallo", managed: true, active: true },
  { id: "ampliacion-regional", name: "Ampliación de noticias regional", shortName: "Ampliación regional", hosts: "Edición regional", managed: true, active: true },
  { id: "encendidos", name: "Encendidos", shortName: "Encendidos", hosts: "Sara Abu Sabbah y Carlos Galdós", managed: true, active: true },
  { id: "rotativa-tarde", name: "La Rotativa del Aire | Edición Tarde", shortName: "Rotativa Tarde", hosts: "Carlos Villarreal y Joanna Castro", managed: true, active: true },
  { id: "futbol-cancha", name: "Fútbol como cancha", shortName: "Fútbol como cancha", hosts: "Jesús Arias y Alan Diez", managed: false, active: true },
  { id: "chistosos", name: "Los Chistosos", shortName: "Los Chistosos", hosts: "Hernán Vidaurre y Daniel Marquina", managed: true, active: true },
  { id: "espacio-vital", name: "Espacio Vital", shortName: "Espacio Vital", hosts: "Elmer Huerta", managed: false, active: true },
  { id: "conexion", name: "Conexión", shortName: "Conexión", hosts: "Martín Riepl y Fátima Chávez", managed: true, active: true },
  { id: "rotativa-noche", name: "La Rotativa del Aire | Edición Noche", shortName: "Rotativa Noche", hosts: "Jesús Miguel Calderón", managed: true, active: true },
  { id: "vamos-var", name: "Vamos al VAR", shortName: "Vamos al VAR", hosts: "Jesús Arias, Alan Diez y Pedro García", managed: false, active: true },
  { id: "sabelones", name: "Sabelones", shortName: "Sabelones", hosts: "Daniel Marquina", managed: false, active: true },
  { id: "las-cosas", name: "Las cosas como son", shortName: "Las cosas como son", hosts: "Equipo por confirmar", managed: true, active: true },
  { id: "prueba-fuego", name: "Prueba de fuego", shortName: "Prueba de fuego", hosts: "Equipo por confirmar", managed: true, active: true },
  { id: "asi-somos", name: "Así somos", shortName: "Así somos", hosts: "Equipo por confirmar", managed: true, active: true },
  { id: "lo-mejor-campo", name: "Lo mejor de la semana de La Rotativa del Campo", shortName: "Lo mejor de Rotativa del Campo", hosts: "Especial semanal", managed: false, active: true },
  { id: "rotativa-sat-am", name: "La Rotativa de fin de Semana | Sábado", shortName: "Rotativa AM Sábado", hosts: "Fátima Chávez y César Espinoza", managed: true, active: true },
  { id: "ampliacion-sat", name: "Ampliación de Noticias | Sábado", shortName: "Ampliación Sábado", hosts: "Fernando Vivas y César Espinoza", managed: true, active: true },
  { id: "enfoque-sat", name: "Enfoque de los sábados", shortName: "Enfoque de los sábados", hosts: "Fernando Carvallo", managed: false, active: true },
  { id: "dialogo-fe", name: "Diálogo de Fe", shortName: "Diálogo de Fe", hosts: "Fernando Carvallo y Carlos Castillo", managed: true, active: true },
  { id: "sencillo-bolsillo", name: "Sencillo y al Bolsillo", shortName: "Sencillo y al Bolsillo", hosts: "Equipo del programa", managed: true, active: true },
  { id: "en-escena", name: "En escena", shortName: "En escena", hosts: "Johnny Padilla", managed: true, active: true },
  { id: "chistosos-best", name: "Lo mejor de Los Chistosos", shortName: "Lo mejor de Los Chistosos", hosts: "Hernán Vidaurre y Daniel Marquina", managed: false, active: true },
  { id: "letras-tiempo", name: "Letras en el tiempo", shortName: "Letras en el tiempo", hosts: "Patricia del Río", managed: false, active: true },
  { id: "ampliacion-sat-repeat", name: "Ampliación de Noticias | Sábado | Repetición", shortName: "Ampliación Sábado | Repetición", hosts: "Repetición", managed: false, active: true },
  { id: "en-escena-repeat", name: "En Escena | Repetición", shortName: "En Escena | Repetición", hosts: "Repetición", managed: false, active: true },
  { id: "rotativa-sat-pm", name: "La Rotativa del Aire | Sábado Noche", shortName: "Rotativa PM Sábado", hosts: "Fin de semana", managed: true, active: true },
  { id: "enfoque-sat-repeat", name: "Enfoque de los Sábados | Repetición", shortName: "Enfoque | Repetición", hosts: "Repetición", managed: false, active: true },
  { id: "letras-repeat", name: "Letras en el tiempo | Repetición", shortName: "Letras | Repetición", hosts: "Repetición", managed: false, active: true },
  { id: "rpp-informando", name: "RPP Informando | Domingo", shortName: "RPP Informando", hosts: "Carlos Montalvo", managed: false, active: true },
  { id: "rotativa-sun-am", name: "La Rotativa de fin de Semana | Domingo", shortName: "Rotativa AM Domingo", hosts: "Carlos Villarreal y Noemy Mamani", managed: true, active: true },
  { id: "ampliacion-sun", name: "Ampliación de Noticias | Domingo", shortName: "Ampliación Domingo", hosts: "Fernando Vivas y Carlos Villarreal", managed: true, active: true },
  { id: "domingo-fiesta", name: "Domingo es fiesta", shortName: "Domingo es fiesta", hosts: "Jorge Rodríguez", managed: true, active: true },
  { id: "siempre-casa", name: "Siempre en Casa", shortName: "Siempre en Casa", hosts: "Jorge Rodríguez", managed: true, active: true },
  { id: "rotativa-sun-pm", name: "La Rotativa del Aire | Domingo Noche", shortName: "Rotativa PM Domingo", hosts: "Fin de semana", managed: true, active: true },
  { id: "ampliacion-sun-repeat", name: "Ampliación de Noticias | Domingo | Repetición", shortName: "Ampliación Domingo | Repetición", hosts: "Repetición", managed: false, active: true },
];

const programAccentColors: Record<string, string> = {
  "rotativa-am": "#e21d2f",
  "ampliacion-lima": "#0067b1",
  "ampliacion-regional": "#00a0a8",
  encendidos: "#f36f21",
  "rotativa-tarde": "#c32033",
  chistosos: "#8b3dbb",
  conexion: "#008e83",
  "rotativa-noche": "#293a8f",
  "las-cosas": "#3c4858",
  "prueba-fuego": "#d84b20",
  "asi-somos": "#7c4dff",
  "rotativa-sat-am": "#e21d2f",
  "ampliacion-sat": "#1877b7",
  "dialogo-fe": "#9a6a24",
  "sencillo-bolsillo": "#16834b",
  "en-escena": "#c22f87",
  "rotativa-sat-pm": "#293a8f",
  "rotativa-sun-am": "#e21d2f",
  "ampliacion-sun": "#1877b7",
  "domingo-fiesta": "#9b6b2f",
  "siempre-casa": "#df6b24",
  "rotativa-sun-pm": "#293a8f",
};

export const programs: Program[] = programCatalog.map((program) => ({
  ...program,
  accentColor: programAccentColors[program.id] ?? "#596273",
}));

const weekdaySlots: Array<[string, string, string]> = [
  ["03:30", "05:00", "rotativa-campo"],
  ["05:00", "08:00", "rotativa-am"],
  ["08:00", "10:00", "ampliacion-lima"],
  ["08:00", "10:00", "ampliacion-regional"],
  ["10:00", "12:30", "encendidos"],
  ["12:30", "14:30", "rotativa-tarde"],
  ["14:30", "16:00", "futbol-cancha"],
  ["16:00", "17:00", "chistosos"],
  ["17:00", "18:00", "espacio-vital"],
  ["18:00", "20:00", "conexion"],
  ["20:00", "22:00", "rotativa-noche"],
  ["22:00", "23:00", "vamos-var"],
  ["23:00", "00:00", "sabelones"],
];

const saturdaySlots: Array<[string, string, string]> = [
  ["04:00", "05:00", "lo-mejor-campo"],
  ["05:00", "08:00", "rotativa-sat-am"],
  ["08:00", "09:00", "ampliacion-sat"],
  ["09:00", "10:00", "enfoque-sat"],
  ["10:00", "10:30", "dialogo-fe"],
  ["10:30", "12:00", "sencillo-bolsillo"],
  ["12:00", "14:00", "en-escena"],
  ["14:00", "16:00", "chistosos-best"],
  ["16:00", "17:00", "letras-tiempo"],
  ["17:00", "18:00", "ampliacion-sat-repeat"],
  ["18:00", "20:00", "en-escena-repeat"],
  ["20:00", "22:00", "rotativa-sat-pm"],
  ["22:00", "23:00", "enfoque-sat-repeat"],
  ["23:00", "00:00", "letras-repeat"],
];

const sundaySlots: Array<[string, string, string]> = [
  ["00:00", "05:00", "rpp-informando"],
  ["05:00", "08:00", "rotativa-sun-am"],
  ["08:00", "10:00", "ampliacion-sun"],
  ["10:00", "10:30", "domingo-fiesta"],
  ["10:30", "14:00", "siempre-casa"],
  ["14:00", "16:00", "en-escena-repeat"],
  ["16:00", "17:00", "chistosos-best"],
  ["17:00", "18:00", "letras-repeat"],
  ["19:00", "20:00", "chistosos-best"],
  ["20:00", "22:00", "rotativa-sun-pm"],
  ["22:00", "00:00", "ampliacion-sun-repeat"],
];

const weekdaySchedule = weekdaySlots.flatMap(([startTime, endTime, programId], index) =>
  [1, 2, 3, 4, 5].map((dayOfWeek) => ({
    id: `${programId}-${dayOfWeek}-${index}`,
    programId,
    dayOfWeek,
    startTime,
    endTime,
  })),
);

const weekendSchedule = [
  ...saturdaySlots.map(([startTime, endTime, programId], index) => ({ id: `${programId}-6-${index}`, programId, dayOfWeek: 6, startTime, endTime })),
  ...sundaySlots.map(([startTime, endTime, programId], index) => ({ id: `${programId}-0-${index}`, programId, dayOfWeek: 0, startTime, endTime })),
];

export const scheduleSlots: ScheduleSlot[] = [...weekdaySchedule, ...weekendSchedule].map((slot) => ({
  ...slot,
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  active: true,
}));

export const fixedBlocks: FixedBlock[] = [{
  id: "00000000-0000-4000-8000-000000000801",
  programId: "encendidos",
  title: "Tecnoverso",
  sequence: "Tecnoverso",
  type: "sequence",
  guest: "Arturo Goga",
  guestRole: "Periodista especializado en tecnología",
  notes: "Secuencia de tecnología. El tema se completa en la pauta de cada fecha.",
  daysOfWeek: [3, 5],
  startTime: "11:30",
  durationMinutes: 10,
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  active: true,
}];

export const initialWorkspaceState: WorkspaceState = {
  programs,
  scheduleSlots,
  fixedBlocks,
  bulletins: [
    {
      id: "bulletin-elections",
      weekStart: "2026-08-24",
      title: "Elecciones 2026: confirmar voceros antes de las 15:00",
      body: "Registrar nombre, cargo y teléfono de coordinación de cada invitado.",
      scope: "Todos los programas",
      programIds: [],
      pinnedRank: 1,
      updatedAt: "2026-08-29T08:00:00-05:00",
    },
    {
      id: "bulletin-audio",
      weekStart: "2026-08-24",
      title: "Nombrar los audios antes de subirlos",
      body: "Usar fecha, programa e invitado para facilitar el archivo y la búsqueda.",
      scope: "Programas informativos",
      programIds: [],
      pinnedRank: 2,
      updatedAt: "2026-08-29T08:00:00-05:00",
    },
  ],
  importantDates: [
    ...peruNationalHolidays2026.filter((item) => item.date !== "2026-08-30"),
    {
      id: "date-polls",
      date: "2026-08-28",
      title: "Cierre de encuestas",
      details: "Preparar un bloque explicativo y confirmar voceros.",
      plans: {
        encendidos: "Explicar el cierre y preparar preguntas para especialistas.",
        "rotativa-noche": "Resumen de la jornada y reacciones.",
      },
      category: "editorial",
      sourceUrl: "",
    },
    {
      ...peruNationalHolidays2026.find((item) => item.date === "2026-08-30")!,
      id: "date-santa-rosa",
      date: "2026-08-30",
      title: "Santa Rosa de Lima",
      details: "Cobertura de seguridad, tránsito y actividades religiosas.",
      plans: {},
    },
  ],
  emissions: [
    {
      id: "emission-encendidos-2026-08-28",
      programId: "encendidos",
      date: "2026-08-28",
      status: "draft",
      rawText: "PREPAUTA ENCENDIDOS VIERNES 28 DE AGOSTO 2026\n\n10:00 - 10:15\nVIVOS\n\n10:15 - 10:45\nTEMA: ¿TU HIJO NO SUELTA EL CELULAR?\nINVITADA: ERIKA ALVAREZ VELIZ",
      producerName: "",
      segments: [
        { id: "segment-live", startTime: "10:00", endTime: "10:15", type: "live", title: "Vivos", guest: "", notes: "Apertura y enlaces." },
        { id: "segment-phone", startTime: "10:15", endTime: "10:45", type: "interview", title: "Uso problemático del celular", guest: "Erika Alvarez Veliz", notes: "Señales de alerta en niños." },
      ],
      updatedAt: "2026-08-28T15:20:00.000Z",
    },
  ],
  people: [
    {
      id: "person-erika-alvarez-veliz",
      displayName: "Erika Alvarez Veliz",
      normalizedName: "erika alvarez veliz",
      aliases: [],
      primaryRole: "Psicóloga clínica",
      organization: "",
      phone: "",
      tags: ["Psicología clínica", "Modificación de conducta", "Infancia"],
      relationshipType: "guest",
      notes: "",
      appearances: [
        {
          id: "appearance-erika-encendidos",
          personId: "person-erika-alvarez-veliz",
          programId: "encendidos",
          date: "2026-08-28",
          role: "guest",
          roleDescription: "Psicóloga clínica",
          summary: "Señales de alerta en niños por uso problemático del celular.",
          segmentTitle: "Uso problemático del celular",
          topic: "Uso problemático del celular",
          focus: "Diferenciar el uso normal del uso problemático.",
          sourceExcerpt: "INVITADA: ERIKA ALVAREZ VELIZ",
        },
      ],
    },
  ],
};
