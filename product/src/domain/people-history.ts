import type { Person, WorkspaceState } from "./schemas";
import { segmentParticipants } from "./editorial-participants";

export type PersonNameMatch = {
  person: Person;
  score: number;
};

function cleanTag(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function inferPersonTags(person: Pick<Person, "tags" | "primaryRole" | "organization">): string[] {
  const candidates = [
    ...person.tags,
    ...person.primaryRole.split(/[,;/|]+/),
    person.organization,
  ]
    .map(cleanTag)
    .filter((value) => value.length >= 3 && value.length <= 48);

  const unique = new Map<string, string>();
  for (const tag of candidates) {
    const normalized = normalizePersonName(tag);
    if (!unique.has(normalized)) unique.set(normalized, tag);
  }
  return [...unique.values()].slice(0, 6);
}

export function isEditorialCollaborator(person: Person): boolean {
  return person.relationshipType === "collaborator"
    || person.appearances.some((appearance) => appearance.role === "other" || appearance.role === "specialist");
}

export function sortPeopleEditorially(people: Person[]): Person[] {
  return [...people].sort((left, right) => {
    const relationshipOrder = Number(isEditorialCollaborator(right)) - Number(isEditorialCollaborator(left));
    if (relationshipOrder) return relationshipOrder;

    const leftInvitations = left.appearances.filter((appearance) => appearance.role === "guest").length;
    const rightInvitations = right.appearances.filter((appearance) => appearance.role === "guest").length;
    if (leftInvitations !== rightInvitations) return rightInvitations - leftInvitations;

    const leftRecent = left.appearances[0]?.date ?? "";
    const rightRecent = right.appearances[0]?.date ?? "";
    return rightRecent.localeCompare(leftRecent) || left.displayName.localeCompare(right.displayName, "es");
  });
}

export function normalizePersonName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("es");
}

function levenshteinDistance(left: string, right: string): number {
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitution = previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
      current[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        current[rightIndex - 1] + 1,
        substitution,
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function nameSimilarity(left: string, right: string): number {
  const maxLength = Math.max(left.length, right.length);
  if (!maxLength) return 1;
  const fullNameScore = 1 - (levenshteinDistance(left, right) / maxLength);
  const leftTokens = left.split(" ").filter(Boolean);
  const rightTokens = right.split(" ").filter(Boolean);
  const tokenScore = leftTokens.reduce((total, token) => {
    const bestToken = rightTokens.reduce((best, candidate) => {
      const length = Math.max(token.length, candidate.length);
      return Math.max(best, length ? 1 - (levenshteinDistance(token, candidate) / length) : 0);
    }, 0);
    return total + bestToken;
  }, 0) / Math.max(leftTokens.length, 1);

  return Math.max(fullNameScore, tokenScore * .96);
}

export function findSimilarPeople(value: string, people: Person[], limit = 3): PersonNameMatch[] {
  const normalized = normalizePersonName(value);
  if (normalized.length < 4) return [];

  return people
    .map((person) => {
      const names = [person.displayName, ...person.aliases].map(normalizePersonName);
      const score = Math.max(...names.map((name) => nameSimilarity(normalized, name)));
      return { person, score };
    })
    .filter(({ person, score }) => person.normalizedName !== normalized && score >= .72)
    .sort((left, right) => right.score - left.score || left.person.displayName.localeCompare(right.person.displayName, "es"))
    .slice(0, limit);
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
      for (const participant of segmentParticipants(segment)) {
        const displayName = participant.name.trim();
        if (!displayName) continue;
        const collaborator = participant.role === "guest" && segment.type === "sports"
          && !participant.roleDescription.trim()
          && segment.title.toLocaleLowerCase("es").includes(`con ${displayName.toLocaleLowerCase("es")}`);
        const appearanceRole = collaborator ? "other" as const : participant.role;
        const normalizedName = normalizePersonName(displayName);
        const previous = existing.get(normalizedName);
        const person = next.get(normalizedName) ?? {
          id: localId("person", displayName), displayName, normalizedName, aliases: [],
          primaryRole: participant.roleDescription, organization: participant.organization, phone: "", tags: [],
          relationshipType: appearanceRole === "guest" ? "guest" as const : "collaborator" as const,
          editorialRoles: [appearanceRole], contacts: [], programRoles: [], notes: "", appearances: [],
        };
        person.displayName = displayName;
        person.primaryRole = participant.roleDescription || previous?.primaryRole || person.primaryRole;
        person.organization = participant.organization || previous?.organization || person.organization;
        person.editorialRoles = [...new Set([...(person.editorialRoles ?? []), appearanceRole])];
        if (appearanceRole !== "guest") person.relationshipType = "collaborator";
        person.appearances.push({
          id: `appearance-${emission.id}-${segment.id}-${participant.id}`,
          personId: person.id, programId: emission.programId, date: emission.date, role: appearanceRole,
          roleDescription: participant.roleDescription,
          summary: segment.focus || segment.topic || segment.notes, segmentTitle: segment.title,
          topic: segment.topic ?? "", focus: segment.focus ?? "",
          sourceExcerpt: participant.sourceExcerpt || segment.sourceExcerpt || "",
        });
        next.set(normalizedName, person);
      }
    }

    if (emission.producerName.trim()) ensureProgramPerson(emission.producerName, emission.programId, "producer", state, next);
  }

  return {
    ...state,
    people: sortPeopleEditorially([...next.values()]
      .map((person) => ({
        ...person,
        tags: inferPersonTags(person),
        appearances: person.appearances.sort((a, b) => b.date.localeCompare(a.date)),
      }))),
  };
}

function ensureProgramPerson(
  displayName: string,
  programId: string,
  role: "host" | "producer",
  state: WorkspaceState,
  people: Map<string, Person>,
): void {
  const normalizedName = normalizePersonName(displayName);
  const existing = people.get(normalizedName) ?? state.people.find((person) => person.normalizedName === normalizedName);
  const person: Person = existing ? { ...existing, appearances: [...existing.appearances] } : {
    id: localId("person", displayName), displayName, normalizedName, aliases: [], primaryRole: role === "host" ? "Conductor/a" : "Productor/a",
    organization: "RPP", phone: "", tags: [role === "host" ? "Conducción" : "Producción"], relationshipType: "collaborator",
    editorialRoles: [role], contacts: [], programRoles: [], notes: "", appearances: [],
  };
  person.editorialRoles = [...new Set([...(person.editorialRoles ?? []), role])];
  person.programRoles = person.programRoles ?? [];
  if (!person.programRoles.some((item) => item.programId === programId && item.role === role)) {
    person.programRoles.push({ id: `${person.id}-${programId}-${role}`, programId, role, roleDescription: role === "host" ? "Conducción" : "Producción" });
  }
  person.relationshipType = "collaborator";
  people.set(normalizedName, person);
}
