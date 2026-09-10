import { createDemoPeople, createDemoWeekEmissions } from "./demo-week";
import { createLocalWorkspaceRepository } from "./local-workspace-repository";
import { initialWorkspaceState } from "./seed";
import { weekDaysFor, slotAppliesOnDate } from "../domain/editorial-calendar";
import { workspaceStateSchema, type WorkspaceState, type Emission } from "../domain/schemas";
import { preprocessPauta } from "../domain/pauta-preprocessor";
import type { StructurePautaRequest, StructurePautaResponse } from "../domain/pauta-import";

export function limaMoment(at = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(at);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(at);
  const [hour, minute] = time.split(":").map(Number);
  return { date, time, minutes: hour * 60 + minute, weekStart: weekDaysFor(date)[0].date };
}
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Copy only the program structure. Never import real editorial content or contacts. */
export function createPracticeWorkspace(structure: WorkspaceState = initialWorkspaceState, at = new Date()): WorkspaceState {
  const moment = limaMoment(at);
  const programs = structuredClone(structure.programs.length ? structure.programs : initialWorkspaceState.programs);
  const scheduleSlots = structuredClone(structure.scheduleSlots.length ? structure.scheduleSlots : initialWorkspaceState.scheduleSlots);
  const generated = createDemoWeekEmissions(moment.weekStart, programs, scheduleSlots, -1);
  const emissions: Emission[] = generated.map((emission, index) => {
    const slot = scheduleSlots.find((item) => item.programId === emission.programId && item.dayOfWeek === new Date(`${emission.date}T12:00:00`).getDay() && slotAppliesOnDate(item, emission.date));
    const ended = emission.date < moment.date || (emission.date === moment.date && moment.minutes >= (slot?.endTime === "00:00" ? 1440 : minutes(slot?.endTime ?? "23:59")));
    const live = emission.date === moment.date && !ended && moment.minutes >= minutes(slot?.startTime ?? "23:59");
    const status = ended ? "post" as const : live || index % 2 ? "draft" as const : "ready" as const;
    const segments = emission.segments.map((segment, blockIndex) => {
      const aired = ended || (live && minutes(segment.endTime) <= moment.minutes);
      const running = live && minutes(segment.startTime) <= moment.minutes && minutes(segment.endTime) > moment.minutes;
      return { ...segment, id: segment.id.replace(/^demo-/, "practice-"), version: 1,
        actualStart: aired || running ? segment.startTime : undefined,
        actualEnd: aired ? segment.endTime : undefined,
        disposition: aired ? "aired" as const : undefined,
        postSummary: aired && blockIndex !== 0 ? segment.focus || segment.notes : "",
        keyQuote: "", quoteVerified: false,
        stories: segment.stories?.map((story) => ({ ...story, disposition: aired ? "aired" as const : undefined, postSummary: aired ? story.summary : "" })),
      };
    });
    return { ...emission, id: emission.id.replace(/^demo-/, "practice-"), status, segments,
      postPauta: { reviewStatus: ended ? "review" as const : "capture" as const, sourceType: "none" as const, sourceUrl: "", transcriptStatus: "none" as const, notes: "Ejemplo ficticio para practicar. Puedes completar o cambiar este registro." },
      updatedAt: at.toISOString(),
    };
  });
  // One empty emission per program, preferably the next occurrence in this week.
  for (const program of programs.filter((item) => item.managed)) {
    const candidates = emissions.filter((item) => item.programId === program.id && item.date !== moment.date).sort((a, b) => Number(a.date < moment.date) - Number(b.date < moment.date) || a.date.localeCompare(b.date));
    const empty = candidates[0];
    if (empty) { empty.status = "empty"; empty.rawText = ""; empty.producerName = ""; empty.segments = []; empty.postPauta = { reviewStatus: "capture", sourceType: "none", sourceUrl: "", transcriptStatus: "none", notes: "" }; }
  }
  const people = createDemoPeople(emissions).map((person) => ({ ...person, id: person.id.replace(/^demo-/, "practice-"), appearances: person.appearances.map((appearance) => ({ ...appearance, id: appearance.id.replace(/^demo-/, "practice-"), personId: person.id.replace(/^demo-/, "practice-") })) }));
  return workspaceStateSchema.parse({ programs, scheduleSlots, fixedBlocks: [], emissions, people,
    bulletins: [{ id: `practice-notice-${moment.weekStart}`, weekStart: moment.weekStart, title: "Demo: prepara una entrevista de servicio", body: "Elige un tema útil para la audiencia, asigna un invitado y completa su enfoque. Puedes editar esta indicación o crear otra.", scope: "Todos los programas", programIds: [], pinnedRank: null, updatedAt: at.toISOString() }],
    importantDates: [{ id: `practice-event-${moment.date}`, date: moment.date, title: "Demo: reunión de coordinación editorial", details: "Ejercicio: asigna una cobertura a un programa y comprueba cómo aparece en sus indicaciones.", plans: {}, category: "editorial", sourceUrl: "" }],
  });
}

export type PracticeStorage = Pick<Storage, "getItem" | "setItem">;

/** An entirely local repository: it never receives a real repository or auth token. */
export function createPracticeRepository(structure: WorkspaceState, storage: PracticeStorage, scope: string, at = new Date(), reset = false) {
  const initial = createPracticeWorkspace(structure, at);
  const key = `rpp-practice-v1:${scope}:${limaMoment(at).weekStart}`;
  let workspace = structuredClone(initial);
  if (!reset) {
    try {
      const stored = storage.getItem(key);
      if (stored) {
        const raw = JSON.parse(stored);
        const prior = workspaceStateSchema.parse(raw.workspace);
        const baseline = workspaceStateSchema.parse(raw.initial);
        // Refresh untouched examples to the current moment, retain user exercises.
        for (const field of Object.keys(initial) as Array<keyof WorkspaceState>) {
          const baseItems = baseline[field] as Array<{ id: string }>;
          const savedItems = prior[field] as Array<{ id: string }>;
          const removed = new Set(baseItems.filter((item) => !savedItems.some((saved) => saved.id === item.id)).map((item) => item.id));
          const changed = savedItems.filter((item) => JSON.stringify(item) !== JSON.stringify(baseItems.find((base) => base.id === item.id)));
          const changedIds = new Set(changed.map((item) => item.id));
          Object.assign(workspace, { [field]: [...initial[field].filter((item) => !removed.has(item.id) && !changedIds.has(item.id)), ...changed] });
        }
      }
    } catch { workspace = structuredClone(initial); }
  }
  workspace = workspaceStateSchema.parse(workspace);
  const persist = (next: WorkspaceState) => {
    const validated = workspaceStateSchema.parse(next);
    storage.setItem(key, JSON.stringify({ initial, workspace: validated }));
    workspace = validated;
  };
  persist(workspace);
  return { workspace, repository: createLocalWorkspaceRepository({ load: () => structuredClone(workspace), save: persist }) };
}

export function practicePautaProposal(input: StructurePautaRequest): StructurePautaResponse {
  const prepared = preprocessPauta(input);
  return { importId: crypto.randomUUID(), model: "Práctica local", processingMode: "local", proposal: prepared.proposal ?? {
    layoutMode: "freeform", documentType: "pre", detectedProgramName: input.programName, detectedDate: input.targetDate, hosts: [], producers: [],
    warnings: ["Demo local: conservamos tu texto en un bloque para que practiques la revisión. Puedes dividirlo o añadir otros bloques."],
    segments: [{ startTime: input.plannedStart, endTime: input.plannedEnd, type: "other", title: "Texto para organizar", sequence: "", topic: "", focus: input.rawText, guestName: "", guestRole: "", audienceQuestion: "", productionCues: [], notes: "", stories: [], confidence: 1, sourceExcerpt: input.rawText }],
  } };
}
