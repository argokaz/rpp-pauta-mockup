import type { Bulletin, Program } from "@/domain/schemas";

export type BulletinUpdateState = "new" | "updated" | null;

export function bulletinTargetProgramIds(bulletin: Bulletin): string[] {
  if (bulletin.scope === "Todos los programas" || bulletin.scope === "Programas informativos") return [];
  if (bulletin.scope === "Selección de programas") return bulletin.programIds;
  return bulletin.programIds.length ? bulletin.programIds : [bulletin.scope];
}

export function bulletinScopeLabel(bulletin: Bulletin, programs: Program[]): string {
  if (bulletin.scope === "Todos los programas" || bulletin.scope === "Programas informativos") return bulletin.scope;
  const names = bulletinTargetProgramIds(bulletin)
    .map((programId) => programs.find((program) => program.id === programId)?.shortName)
    .filter((name): name is string => Boolean(name));
  if (!names.length) return "Sin programas";
  if (names.length === 1) return names[0];
  return `${names.length} programas`;
}

export function bulletinVisibleToProgram(bulletin: Bulletin, programId: string, programName: string, shortName: string): boolean {
  return bulletin.scope === "Todos los programas"
    || bulletin.scope === "Programas informativos"
    || bulletinTargetProgramIds(bulletin).includes(programId)
    || bulletin.scope === programId
    || bulletin.scope === programName
    || bulletin.scope === shortName;
}

export function bulletinVersion(bulletin: Bulletin): string {
  return JSON.stringify([
    bulletin.title.trim(),
    bulletin.body.trim(),
    bulletin.scope,
    [...bulletin.programIds].sort(),
    bulletin.pinnedRank,
  ]);
}

export function sortBulletins(items: Bulletin[]): Bulletin[] {
  return [...items].sort((left, right) => {
    const leftRank = left.pinnedRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.pinnedRank ?? Number.MAX_SAFE_INTEGER;
    return leftRank - rightRank
      || right.updatedAt.localeCompare(left.updatedAt)
      || left.title.localeCompare(right.title, "es");
  });
}

export function splitBulletins(items: Bulletin[]): { featured: Bulletin[]; remaining: Bulletin[] } {
  return { featured: sortBulletins(items), remaining: [] };
}

export function bulletinUpdateState(
  bulletin: Bulletin,
  seenVersions: Record<string, string>,
): BulletinUpdateState {
  if (!(bulletin.id in seenVersions)) return "new";
  return seenVersions[bulletin.id] === bulletinVersion(bulletin) ? null : "updated";
}
