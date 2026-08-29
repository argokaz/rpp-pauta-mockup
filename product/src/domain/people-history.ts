import type { Person, WorkspaceState } from "./schemas";

export function normalizePersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

function localId(prefix: string, value: string): string {
  return `${prefix}-${normalizePersonName(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

export function syncLocalPeople(state: WorkspaceState): WorkspaceState {
  const existing = new Map(state.people.map((person) => [person.normalizedName, person]));
  const next = new Map<string, Person>();

  for (const person of state.people) {
    next.set(person.normalizedName, { ...person, appearances: [] });
  }

  for (const emission of state.emissions) {
    for (const segment of emission.segments) {
      const displayName = segment.guest.trim();
      if (!displayName) continue;
      const normalizedName = normalizePersonName(displayName);
      const previous = existing.get(normalizedName);
      const person = next.get(normalizedName) ?? {
        id: localId("person", displayName),
        displayName,
        normalizedName,
        aliases: [],
        primaryRole: segment.guestRole ?? "",
        organization: "",
        notes: "",
        appearances: [],
      };
      const collaborator = segment.type === "sports"
        && !(segment.guestRole ?? "").trim()
        && segment.title.toLocaleLowerCase("es").includes(`con ${displayName.toLocaleLowerCase("es")}`);
      person.displayName = displayName;
      person.primaryRole = segment.guestRole || previous?.primaryRole || person.primaryRole;
      person.appearances.push({
        id: `appearance-${emission.id}-${segment.id}`,
        personId: person.id,
        programId: emission.programId,
        date: emission.date,
        role: collaborator ? "other" : "guest",
        roleDescription: segment.guestRole ?? "",
        summary: segment.focus || segment.topic || segment.notes,
        segmentTitle: segment.title,
        topic: segment.topic ?? "",
        focus: segment.focus ?? "",
        sourceExcerpt: segment.sourceExcerpt ?? "",
      });
      next.set(normalizedName, person);
    }
  }

  return {
    ...state,
    people: [...next.values()]
      .map((person) => ({
        ...person,
        appearances: person.appearances.sort((a, b) => b.date.localeCompare(a.date)),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "es")),
  };
}
