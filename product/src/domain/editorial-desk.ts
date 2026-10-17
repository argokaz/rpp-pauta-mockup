import { segmentParticipants } from "./editorial-participants";
import { normalizePersonName } from "./people-history";
import type { Emission, Program, Segment, SegmentParticipant } from "./schemas";

/**
 * Un programa recorre siempre los mismos cuatro pasos. La interfaz los muestra
 * en este orden para que producción y jefatura hablen el mismo idioma.
 */
export type PautaStage = "prepare" | "ready" | "post" | "closed";

export const pautaStages: Array<{ id: PautaStage; label: string; hint: string }> = [
  { id: "prepare", label: "Pauta", hint: "Pegar o escribir y revisar" },
  { id: "ready", label: "Lista", hint: "Lista para salir al aire" },
  { id: "post", label: "Post-pauta", hint: "Registrar lo que salió" },
  { id: "closed", label: "Cerrada", hint: "Verificada en el archivo" },
];

export function pautaStage(emission?: Pick<Emission, "status" | "postPauta"> & { segments?: Pick<Segment, "disposition">[] }): PautaStage {
  if (!emission) return "prepare";
  if (emission.postPauta?.reviewStatus === "verified") return "closed";
  // Marcar el primer resultado ya es empezar la post-pauta.
  if (emission.status === "post" || emission.segments?.some((segment) => segment.disposition)) return "post";
  if (emission.status === "ready") return "ready";
  return "prepare";
}

export function pautaStageLabel(emission?: Pick<Emission, "status" | "postPauta" | "segments">): string {
  if (!emission || (emission.status === "empty" && !emission.segments.length)) return "Sin pauta";
  if (pautaStage(emission) === "prepare") return "En preparación";
  return pautaStages.find((stage) => stage.id === pautaStage(emission))?.label ?? "Sin pauta";
}

export type GuestBooking = {
  key: string;
  personKey: string;
  personId?: string;
  name: string;
  roleDescription: string;
  date: string;
  programId: string;
  programName: string;
  startTime: string;
  segmentId: string;
  segmentTitle: string;
  topic: string;
  outcome: "planned" | "aired" | "skipped";
  postSummary: string;
};

const bookedRoles = new Set<SegmentParticipant["role"]>(["guest", "specialist"]);

function bookingOutcome(segment: Segment): GuestBooking["outcome"] {
  if (segment.disposition === "skipped") return "skipped";
  if (segment.disposition) return "aired";
  return "planned";
}

export function personKeyFor(participant: Pick<SegmentParticipant, "personId" | "name">): string {
  return participant.personId ? `id:${participant.personId}` : `name:${normalizePersonName(participant.name)}`;
}

/** Lista cada invitación (persona + programa + bloque) a partir de las pautas guardadas. */
export function guestBookings(emissions: Emission[], programs: Program[]): GuestBooking[] {
  const programNames = new Map(programs.map((program) => [program.id, program.shortName || program.name]));
  return emissions.flatMap((emission) => emission.segments.flatMap((segment) => segmentParticipants(segment)
    .filter((participant) => bookedRoles.has(participant.role) && participant.name.trim())
    .map((participant): GuestBooking => ({
      key: `${emission.id}:${segment.id}:${participant.id}`,
      personKey: personKeyFor(participant),
      personId: participant.personId,
      name: participant.name.trim(),
      roleDescription: participant.roleDescription || participant.organization || "",
      date: emission.date,
      programId: emission.programId,
      programName: programNames.get(emission.programId) ?? emission.programId,
      startTime: segment.startTime,
      segmentId: segment.id,
      segmentTitle: segment.title,
      topic: segment.topic || segment.focus || "",
      outcome: bookingOutcome(segment),
      postSummary: segment.postSummary?.trim() ?? "",
    }))))
    .sort((left, right) => right.date.localeCompare(left.date) || left.startTime.localeCompare(right.startTime) || left.name.localeCompare(right.name, "es"));
}

export type GuestOverlap = {
  personKey: string;
  name: string;
  date: string;
  bookings: GuestBooking[];
};

/**
 * Una misma persona invitada a más de un programa en la misma fecha. Se avisa,
 * no se bloquea: la decisión final sigue siendo editorial.
 */
export function guestOverlaps(bookings: GuestBooking[]): GuestOverlap[] {
  const groups = new Map<string, GuestBooking[]>();
  for (const booking of bookings) {
    if (booking.outcome === "skipped") continue;
    // El nombre normalizado cubre también a quien aún no tiene ficha vinculada.
    const groupKey = `${booking.date}|${normalizePersonName(booking.name)}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), booking]);
  }
  return [...groups.values()]
    .filter((items) => new Set(items.map((item) => item.programId)).size > 1)
    .map((items) => ({ personKey: items[0].personKey, name: items[0].name, date: items[0].date, bookings: [...items].sort((left, right) => left.startTime.localeCompare(right.startTime)) }))
    .sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name, "es"));
}

export function bookingMatchesQuery(booking: GuestBooking, query: string): boolean {
  const normalizedQuery = normalizePersonName(query);
  if (!normalizedQuery) return true;
  return normalizePersonName([booking.name, booking.roleDescription, booking.programName, booking.segmentTitle, booking.topic, booking.postSummary].join(" ")).includes(normalizedQuery);
}
