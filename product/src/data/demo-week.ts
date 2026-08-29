import { normalizePersonName } from "../domain/people-history";
import type { Emission, Person, ScheduleSlot, Segment, WorkspaceState } from "../domain/schemas";
import { programs, scheduleSlots } from "./seed";

export const DEMO_WEEK_START = "2026-08-24";
export const DEMO_WEEK_END = "2026-08-30";
export const DEMO_DATA_AVAILABLE = process.env.NEXT_PUBLIC_DEMO_DATA !== "false";

const DEMO_PREFIX = "demo-";
const DEMO_NOTICE = "DATOS DE PRUEBA — pauta ficticia inspirada en formatos históricos de RPP; no corresponde a una emisión real.";

type StoryTemplate = Pick<Segment, "type" | "title" | "guest" | "notes"> & Partial<Pick<Segment, "sequence" | "topic" | "focus" | "guestRole" | "audienceQuestion" | "productionCues">>;

const newsStories: StoryTemplate[] = [
  { type: "opening", title: "Titulares y servicios de la jornada", guest: "", notes: "Resumen nacional, tránsito y clima.", topic: "Agenda informativa", focus: "Priorizar información útil y hechos confirmados." },
  { type: "interview", title: "Seguridad ciudadana y prevención", guest: "Maricruz Estrella", guestRole: "Dirigente vecinal", notes: "Entrevista de contexto y respuesta comunitaria.", topic: "Prevención barrial", focus: "Medidas concretas y necesidades de los vecinos." },
  { type: "live", title: "Despacho desde el centro de Lima", guest: "", notes: "Reporte móvil con actualización de tránsito.", topic: "Movilidad urbana", productionCues: ["Confirmar enlace diez minutos antes", "Pedir dos datos verificables"] },
  { type: "interview", title: "Claves para entender la agenda política", guest: "Fernando Tuesta", guestRole: "Analista político", notes: "Conversación de análisis.", topic: "Coyuntura política", focus: "Separar hechos, escenarios y opinión." },
  { type: "sports", title: "La fecha deportiva", guest: "Juan Carlos Ortecho", guestRole: "Periodista deportivo", notes: "Resultados, agenda y protagonistas.", topic: "Actualidad deportiva" },
  { type: "cue", title: "Cierre y avance informativo", guest: "", notes: "Repaso de pendientes y pase al siguiente programa.", topic: "Cierre" },
];

const interviewStories: StoryTemplate[] = [
  { type: "opening", title: "Noticias que marcan la agenda", guest: "", notes: "Contexto breve antes de las entrevistas.", topic: "Agenda nacional" },
  { type: "interview", title: "Qué cambia para el ciudadano", guest: "Jorge Puch Pardo", guestRole: "Especialista electoral", notes: "Entrevista de servicio.", topic: "Trámites y participación ciudadana", focus: "Explicar plazos, requisitos y canales oficiales." },
  { type: "interview", title: "Economía familiar ante el alza de precios", guest: "Jorge Carrillo Acosta", guestRole: "Experto en finanzas", notes: "Recomendaciones prácticas.", topic: "Finanzas personales", focus: "Priorizar decisiones aplicables al presupuesto familiar." },
  { type: "live", title: "La noticia desde la región", guest: "", notes: "Despacho regional y testimonio local.", topic: "Agenda regional", productionCues: ["Confirmar ubicación", "Solicitar cifra y fuente"] },
  { type: "interview", title: "Salud pública: prevención y señales de alerta", guest: "Erika Alvarez Veliz", guestRole: "Psicóloga clínica", notes: "Bloque de orientación.", topic: "Salud mental", focus: "Diferenciar recomendaciones generales de atención profesional." },
  { type: "cue", title: "Conclusiones y siguiente cobertura", guest: "", notes: "Resumen de respuestas y asuntos pendientes.", topic: "Cierre" },
];

const encendidosStories: StoryTemplate[] = [
  { type: "opening", title: "Vivos y agenda de la mañana", guest: "", notes: "Apertura con enlaces y noticias de servicio.", topic: "Actualidad" },
  { type: "interview", title: "¿Cómo reconocer el uso problemático del celular?", guest: "Erika Alvarez Veliz", guestRole: "Psicóloga clínica", notes: "Señales de alerta y hábitos familiares.", topic: "Bienestar digital", focus: "Diferenciar uso frecuente, dependencia y señales que requieren ayuda.", audienceQuestion: "¿Qué hábito digital quisieras cambiar en casa?" },
  { type: "audience", title: "La voz del público", guest: "", notes: "Líneas telefónicas y mensajes de oyentes.", topic: "Participación de audiencia", productionCues: ["Verificar teléfonos al aire", "Agrupar respuestas por tema"] },
  { type: "interview", title: "Humor y resiliencia sobre el escenario", guest: "Patricia Portocarrero", guestRole: "Actriz y comediante", notes: "Conversación cultural.", topic: "Teatro y bienestar", focus: "Cómo una experiencia personal se transforma en una propuesta escénica." },
  { type: "sequence", title: "Cargar el celular toda la noche: mito o realidad", guest: "Arturo Goga", guestRole: "Periodista especializado en tecnología", notes: "Secuencia Tecnoverso.", sequence: "Tecnoverso", topic: "Cuidado de baterías", focus: "Explicar hábitos útiles sin alarmismo." },
  { type: "sports", title: "La fiesta del fútbol", guest: "Juan Carlos Ortecho", guestRole: "Periodista deportivo", notes: "Bloque deportivo y agenda del fin de semana.", topic: "Fútbol" },
];

const connectionStories: StoryTemplate[] = [
  { type: "opening", title: "Noticias para volver a casa", guest: "", notes: "Actualización de tránsito, clima y servicios.", topic: "Actualidad y movilidad" },
  { type: "interview", title: "Cómo ordenar las deudas del mes", guest: "Jorge Carrillo Acosta", guestRole: "Experto en finanzas", notes: "Consejos para priorizar pagos.", topic: "Deudas y presupuesto", focus: "Ofrecer pasos concretos y advertir sobre el sobreendeudamiento." },
  { type: "sequence", title: "Evita fraudes en tus cuentas digitales", guest: "Arturo Goga", guestRole: "Periodista especializado en tecnología", notes: "Seguridad digital para usuarios.", topic: "Ciberseguridad", focus: "Reconocer enlaces, llamadas y mensajes fraudulentos." },
  { type: "audience", title: "Lo que reportan los oyentes", guest: "", notes: "Mensajes de servicio y participación.", topic: "Participación ciudadana" },
  { type: "interview", title: "Agenda cultural para el fin de semana", guest: "Patricia Portocarrero", guestRole: "Actriz y comediante", notes: "Estrenos, teatro y actividades familiares.", topic: "Cultura" },
];

const humorStories: StoryTemplate[] = [
  { type: "opening", title: "El personaje del día", guest: "", notes: "Apertura de humor sobre la coyuntura.", topic: "Actualidad en clave de humor" },
  { type: "sequence", title: "La llamada imposible", guest: "", notes: "Imitación y reacción del público.", sequence: "La llamada", topic: "Humor e imitaciones" },
  { type: "audience", title: "Oyentes al aire", guest: "", notes: "Mensajes, pedidos y participación.", topic: "Audiencia" },
  { type: "cue", title: "Lo mejor del día", guest: "", notes: "Selección de momentos y despedida.", topic: "Cierre" },
];

const financeStories: StoryTemplate[] = [
  { type: "opening", title: "El dato que cuida tu bolsillo", guest: "", notes: "Apertura con cifra y recomendación práctica.", topic: "Educación financiera" },
  { type: "interview", title: "Presupuesto familiar sin complicaciones", guest: "Jorge Carrillo Acosta", guestRole: "Experto en finanzas", notes: "Método simple para ordenar ingresos y gastos.", topic: "Presupuesto", focus: "Convertir conceptos financieros en decisiones cotidianas." },
  { type: "interview", title: "Ahorro, CTS y fondo de emergencia", guest: "Majo Rojas", guestRole: "Especialista en finanzas personales", notes: "Alternativas y errores frecuentes.", topic: "Ahorro", focus: "Comparar liquidez, riesgo y objetivo." },
  { type: "audience", title: "Consultorio del oyente", guest: "", notes: "Preguntas breves sobre deudas y tarjetas.", topic: "Finanzas personales" },
  { type: "cue", title: "Tres acciones para esta semana", guest: "", notes: "Resumen accionable del programa.", topic: "Cierre" },
];

const cultureStories: StoryTemplate[] = [
  { type: "opening", title: "Agenda de música, teatro y cultura", guest: "", notes: "Recomendaciones y novedades.", topic: "Agenda cultural" },
  { type: "interview", title: "Una obra que transforma experiencias en humor", guest: "Patricia Portocarrero", guestRole: "Actriz y comediante", notes: "Conversación sobre creación escénica.", topic: "Teatro", focus: "Proceso creativo y relación con el público." },
  { type: "interview", title: "Nuevas voces de la música peruana", guest: "Milena Warthon", guestRole: "Cantautora", notes: "Entrevista y presentación musical.", topic: "Música peruana" },
  { type: "sequence", title: "Estrenos recomendados", guest: "", notes: "Guía breve para el fin de semana.", sequence: "En cartelera", topic: "Cine y espectáculos" },
  { type: "cue", title: "Próximas fechas y despedida", guest: "", notes: "Repaso de agenda.", topic: "Cierre" },
];

const homeStories: StoryTemplate[] = [
  { type: "opening", title: "Servicios para empezar el domingo", guest: "", notes: "Actualidad, tránsito y recomendaciones.", topic: "Servicio" },
  { type: "interview", title: "Hábitos digitales saludables en familia", guest: "Erika Alvarez Veliz", guestRole: "Psicóloga clínica", notes: "Acuerdos y límites por edades.", topic: "Familia y tecnología", focus: "Proponer rutinas realistas y observables." },
  { type: "sequence", title: "Cocina rendidora para la semana", guest: "", notes: "Receta y aprovechamiento de alimentos.", sequence: "Cocina en casa", topic: "Alimentación" },
  { type: "interview", title: "Emprender desde el barrio", guest: "Maricruz Estrella", guestRole: "Dirigente vecinal", notes: "Organización comunitaria y economía local.", topic: "Emprendimiento", focus: "Aprendizajes aplicables a iniciativas pequeñas." },
  { type: "audience", title: "Consultas y mensajes de la audiencia", guest: "", notes: "Participación de oyentes.", topic: "Audiencia" },
];

const faithStories: StoryTemplate[] = [
  { type: "opening", title: "Lectura y contexto del evangelio", guest: "", notes: "Presentación de la reflexión del día.", topic: "Evangelio" },
  { type: "interview", title: "Fe, esperanza y servicio a la comunidad", guest: "Maricruz Estrella", guestRole: "Dirigente vecinal", notes: "Testimonio comunitario.", topic: "Solidaridad", focus: "Traducir la reflexión en acciones cotidianas." },
  { type: "audience", title: "Preguntas de los oyentes", guest: "", notes: "Diálogo abierto con la audiencia.", topic: "Fe y vida cotidiana" },
  { type: "cue", title: "Reflexión final", guest: "", notes: "Ideas centrales y despedida.", topic: "Cierre" },
];

function storiesForProgram(programId: string): StoryTemplate[] {
  if (programId === "encendidos") return encendidosStories;
  if (programId === "conexion") return connectionStories;
  if (programId === "chistosos") return humorStories;
  if (programId === "sencillo-bolsillo") return financeStories;
  if (programId === "en-escena") return cultureStories;
  if (programId === "siempre-casa") return homeStories;
  if (programId === "dialogo-fe" || programId === "domingo-fiesta") return faithStories;
  if (programId.startsWith("ampliacion")) return interviewStories;
  return newsStories;
}

function clockMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function dateForDayOfWeek(dayOfWeek: number): string {
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return `2026-08-${String(24 + offset).padStart(2, "0")}`;
}

function statusForDate(date: string, programId: string): Emission["status"] {
  const day = Number(date.slice(-2));
  if (day <= 25) return "post";
  if (day <= 27) return "ready";
  if (day === 28) return programId.length % 2 === 0 ? "ready" : "draft";
  return "draft";
}

function segmentCount(slot: ScheduleSlot, stories: StoryTemplate[]): number {
  const start = clockMinutes(slot.startTime);
  const rawEnd = clockMinutes(slot.endTime);
  const duration = (rawEnd <= start ? rawEnd + 1440 : rawEnd) - start;
  return Math.min(stories.length, Math.max(2, Math.min(5, Math.floor(duration / 30) + 1)));
}

function buildSegments(slot: ScheduleSlot, date: string): Segment[] {
  const stories = storiesForProgram(slot.programId);
  const count = segmentCount(slot, stories);
  const start = clockMinutes(slot.startTime);
  const rawEnd = clockMinutes(slot.endTime);
  const end = rawEnd <= start ? rawEnd + 1440 : rawEnd;
  const duration = end - start;
  const rotation = (Number(date.slice(-2)) + slot.programId.length) % stories.length;

  return Array.from({ length: count }, (_, index) => {
    const story = stories[(rotation + index) % stories.length];
    const segmentStart = start + Math.round((duration * index / count) / 15) * 15;
    const segmentEnd = index === count - 1
      ? end
      : start + Math.round((duration * (index + 1) / count) / 15) * 15;
    return {
      id: `${DEMO_PREFIX}segment-${slot.programId}-${date}-${index + 1}`,
      startTime: formatClock(segmentStart),
      endTime: formatClock(segmentEnd),
      type: story.type,
      title: story.title,
      guest: story.guest,
      notes: story.notes,
      sequence: story.sequence,
      topic: story.topic,
      focus: story.focus,
      guestRole: story.guestRole,
      audienceQuestion: story.audienceQuestion,
      productionCues: story.productionCues,
      confidence: 1,
      sourceExcerpt: `[DEMO] ${story.title}${story.guest ? ` — ${story.guest}` : ""}`,
    };
  });
}

function rawTextForEmission(programName: string, date: string, segments: Segment[]): string {
  return [
    `[${DEMO_NOTICE}]`,
    `PREPAUTA DEMO — ${programName.toUpperCase()}`,
    `FECHA: ${date}`,
    "PRODUCCIÓN: EQUIPO DEMO",
    "",
    ...segments.flatMap((segment) => [
      `${segment.startTime} - ${segment.endTime}`,
      `TEMA: ${segment.title.toUpperCase()}`,
      ...(segment.guest ? [`INVITADO/A: ${segment.guest.toUpperCase()}${segment.guestRole ? ` — ${segment.guestRole.toUpperCase()}` : ""}`] : []),
      `ENFOQUE: ${segment.focus || segment.notes}`,
      "---",
    ]),
  ].join("\n");
}

function createDemoEmissions(): Emission[] {
  return scheduleSlots.flatMap((slot) => {
    const program = programs.find((item) => item.id === slot.programId);
    if (!program?.managed) return [];
    const date = dateForDayOfWeek(slot.dayOfWeek);
    const status = statusForDate(date, slot.programId);
    const segments = buildSegments(slot, date).map((segment) => status === "post" ? {
      ...segment,
      actualStart: segment.startTime,
      actualEnd: segment.endTime,
      disposition: "aired" as const,
      postSummary: segment.focus || segment.notes,
      keyQuote: "",
      quoteVerified: false,
    } : segment);
    return [{
      id: `${DEMO_PREFIX}emission-${slot.programId}-${date}`,
      programId: slot.programId,
      date,
      status,
      rawText: rawTextForEmission(program.name, date, segments),
      producerName: "Equipo demo",
      segments,
      postPauta: {
        reviewStatus: status === "post" ? "verified" : "capture",
        sourceType: "none",
        sourceUrl: "",
        transcriptStatus: "none",
        notes: status === "post" ? "Post-pauta demo revisada. No corresponde a una emisión real." : "",
        ...(status === "post" ? { verifiedAt: `${date}T23:00:00.000Z` } : {}),
      },
      updatedAt: `${date}T12:00:00.000Z`,
    } satisfies Emission];
  });
}

function createDemoPeople(emissions: Emission[]): Person[] {
  const people = new Map<string, Person>();
  for (const emission of emissions) {
    for (const segment of emission.segments) {
      if (!segment.guest.trim()) continue;
      const normalizedName = normalizePersonName(segment.guest);
      const personId = `${DEMO_PREFIX}person-${normalizedName.replaceAll(" ", "-")}`;
      const appearance = {
        id: `${DEMO_PREFIX}appearance-${emission.programId}-${emission.date}-${segment.id}`,
        personId,
        programId: emission.programId,
        date: emission.date,
        role: "guest" as const,
        roleDescription: segment.guestRole ?? "Invitado/a",
        summary: segment.postSummary || segment.notes,
        segmentTitle: segment.title,
        topic: segment.topic ?? segment.title,
        focus: segment.focus ?? segment.notes,
        sourceExcerpt: segment.sourceExcerpt ?? `[DEMO] ${segment.title}`,
        quotes: segment.keyQuote
          ? [{ text: segment.keyQuote, verified: segment.quoteVerified ?? false }]
          : [],
      };
      const existing = people.get(normalizedName);
      if (existing) {
        existing.appearances.push(appearance);
      } else {
        people.set(normalizedName, {
          id: personId,
          displayName: segment.guest,
          normalizedName,
          aliases: [],
          primaryRole: segment.guestRole ?? "Invitado/a",
          organization: "",
          notes: DEMO_NOTICE,
          appearances: [appearance],
        });
      }
    }
  }
  return [...people.values()];
}

export const demoWeekEmissions = createDemoEmissions();
export const demoWeekPeople = createDemoPeople(demoWeekEmissions);

export function isDemoId(id: string): boolean {
  return id.startsWith(DEMO_PREFIX);
}

export function mergeDemoEmissions(realEmissions: Emission[], demoOverrides: Emission[], enabled: boolean): Emission[] {
  const realOnly = realEmissions.filter((emission) => !isDemoId(emission.id));
  if (!enabled || !DEMO_DATA_AVAILABLE) return realOnly;

  const byProgramAndDate = new Map<string, Emission>();
  for (const emission of demoWeekEmissions) byProgramAndDate.set(`${emission.programId}:${emission.date}`, emission);
  for (const emission of demoOverrides.filter((item) => isDemoId(item.id))) byProgramAndDate.set(`${emission.programId}:${emission.date}`, emission);
  for (const emission of realOnly) byProgramAndDate.set(`${emission.programId}:${emission.date}`, emission);
  return [...byProgramAndDate.values()];
}

export function mergeDemoPeople(realPeople: Person[], enabled: boolean): Person[] {
  if (!enabled || !DEMO_DATA_AVAILABLE) return realPeople.filter((person) => !isDemoId(person.id));

  const merged = new Map(demoWeekPeople.map((person) => [person.normalizedName, { ...person, appearances: [...person.appearances] }]));
  for (const person of realPeople.filter((item) => !isDemoId(item.id))) {
    const demoPerson = merged.get(person.normalizedName);
    merged.set(person.normalizedName, {
      ...(demoPerson ?? person),
      ...person,
      appearances: demoPerson
        ? [...person.appearances, ...demoPerson.appearances]
        : person.appearances,
    });
  }
  return [...merged.values()];
}

export function stripDemoData(workspace: WorkspaceState): WorkspaceState {
  return {
    ...workspace,
    emissions: workspace.emissions.filter((emission) => !isDemoId(emission.id)),
    people: workspace.people.filter((person) => !isDemoId(person.id)),
  };
}
