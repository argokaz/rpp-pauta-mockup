import type { Bulletin } from "@/domain/schemas";

export type BulletinUpdateState = "new" | "updated" | null;

export function bulletinVersion(bulletin: Bulletin): string {
  return JSON.stringify([
    bulletin.title.trim(),
    bulletin.body.trim(),
    bulletin.scope,
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
  const sorted = sortBulletins(items);
  const pinned = sorted.filter((item) => item.pinnedRank !== null).slice(0, 2);
  const featured = pinned.length ? pinned : sorted.slice(0, 2);
  const featuredIds = new Set(featured.map((item) => item.id));
  return {
    featured,
    remaining: sorted.filter((item) => !featuredIds.has(item.id)),
  };
}

export function bulletinUpdateState(
  bulletin: Bulletin,
  seenVersions: Record<string, string>,
): BulletinUpdateState {
  if (!(bulletin.id in seenVersions)) return "new";
  return seenVersions[bulletin.id] === bulletinVersion(bulletin) ? null : "updated";
}
