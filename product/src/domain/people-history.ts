import type { Person, WorkspaceState } from "./schemas";

export type PersonNameMatch = {
  person: Person;
  score: number;
};

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
