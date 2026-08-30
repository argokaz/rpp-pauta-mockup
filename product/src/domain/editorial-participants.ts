import type { EditorialEntity, Segment, SegmentParticipant } from "./schemas";

export const participantRoleLabels: Record<SegmentParticipant["role"], string> = {
  host: "Conducción",
  guest: "Invitado/a",
  producer: "Producción",
  reporter: "Reportero/a",
  specialist: "Especialista",
  other: "Colaborador/a",
};

export const entityTypeLabels: Record<EditorialEntity["type"], string> = {
  organization: "Organización",
  place: "Lugar",
  event: "Evento",
  incident: "Suceso",
};

export function legacyParticipant(segment: Pick<Segment, "id" | "guest" | "guestRole" | "sourceExcerpt">): SegmentParticipant[] {
  if (!segment.guest.trim()) return [];
  return [{
    id: `${segment.id}-guest-1`,
    name: segment.guest.trim(),
    role: "guest",
    roleDescription: segment.guestRole?.trim() ?? "",
    organization: "",
    sourceExcerpt: segment.sourceExcerpt?.trim() ?? "",
  }];
}

export function segmentParticipants(segment: Segment): SegmentParticipant[] {
  return segment.participants?.length ? segment.participants : legacyParticipant(segment);
}

export function withParticipantCompatibility(segment: Segment): Segment {
  const participants = segmentParticipants(segment);
  const primaryGuest = participants.find((participant) => participant.role === "guest" || participant.role === "specialist");
  return {
    ...segment,
    participants,
    guest: primaryGuest?.name ?? "",
    guestRole: primaryGuest?.roleDescription ?? "",
  };
}

export function newParticipant(role: SegmentParticipant["role"] = "guest"): SegmentParticipant {
  return {
    id: crypto.randomUUID(),
    name: "",
    role,
    roleDescription: "",
    organization: "",
    sourceExcerpt: "",
  };
}

export function newEditorialEntity(type: EditorialEntity["type"] = "organization"): EditorialEntity {
  return { id: crypto.randomUUID(), name: "", type };
}
