import type { Bulletin, ImportantDate, Program } from "@/domain/schemas";

function eventDateLabel(date: string): string {
  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long" })
    .format(new Date(`${date}T12:00:00`));
}

function listNames(names: string[]): string {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names.at(-1)}`;
}

export function bulletinForImportantDate(
  event: ImportantDate,
  programs: Program[],
  weekStart: string,
  updatedAt: string,
  existing?: Bulletin,
): Bulletin {
  const assignedPrograms = Object.entries(event.plans)
    .filter(([, notes]) => notes.trim())
    .map(([programId]) => programs.find((program) => program.id === programId)?.shortName)
    .filter((name): name is string => Boolean(name));
  const assignment = assignedPrograms.length
    ? `Hay encargos específicos para ${listNames(assignedPrograms)}.`
    : "Todos los programas deben revisar este evento y definir su cobertura.";

  return {
    id: event.id,
    weekStart,
    title: `Preparar para el ${eventDateLabel(event.date)}: ${event.title.trim()}`,
    body: [event.details.trim(), assignment, "Abre el evento para revisar la planificación y preparar la pauta."].filter(Boolean).join(" "),
    scope: "Todos los programas",
    programIds: [],
    pinnedRank: existing?.pinnedRank ?? null,
    updatedAt,
  };
}
