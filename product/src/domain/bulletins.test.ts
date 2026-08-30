import { describe, expect, it } from "vitest";
import { bulletinUpdateState, bulletinVersion, sortBulletins, splitBulletins } from "./bulletins";
import type { Bulletin } from "./schemas";

const bulletins: Bulletin[] = [
  { id: "old", weekStart: "2026-08-24", title: "Anterior", body: "A", scope: "Todos los programas", pinnedRank: null, updatedAt: "2026-08-27T10:00:00Z" },
  { id: "pin-2", weekStart: "2026-08-24", title: "Fijada dos", body: "B", scope: "Todos los programas", pinnedRank: 2, updatedAt: "2026-08-29T11:00:00Z" },
  { id: "new", weekStart: "2026-08-24", title: "Reciente", body: "C", scope: "Todos los programas", pinnedRank: null, updatedAt: "2026-08-29T12:00:00Z" },
  { id: "pin-1", weekStart: "2026-08-24", title: "Fijada uno", body: "D", scope: "Todos los programas", pinnedRank: 1, updatedAt: "2026-08-28T12:00:00Z" },
  { id: "pin-4", weekStart: "2026-08-24", title: "Fijada cuatro", body: "E", scope: "Todos los programas", pinnedRank: 4, updatedAt: "2026-08-29T13:00:00Z" },
  { id: "pin-3", weekStart: "2026-08-24", title: "Fijada tres", body: "F", scope: "Todos los programas", pinnedRank: 3, updatedAt: "2026-08-29T14:00:00Z" },
];

describe("bulletins", () => {
  it("ordena primero las cuatro posiciones fijadas", () => {
    expect(sortBulletins(bulletins).map((item) => item.id)).toEqual(["pin-1", "pin-2", "pin-3", "pin-4", "new", "old"]);
  });

  it("mantiene las fijadas visibles y agrupa el resto", () => {
    const result = splitBulletins(bulletins);
    expect(result.featured.map((item) => item.id)).toEqual(["pin-1", "pin-2", "pin-3", "pin-4"]);
    expect(result.remaining.map((item) => item.id)).toEqual(["new", "old"]);
  });

  it("muestra las dos más recientes cuando todavía no hay fijadas", () => {
    const result = splitBulletins(bulletins.filter((item) => item.pinnedRank === null));
    expect(result.featured.map((item) => item.id)).toEqual(["new", "old"]);
    expect(result.remaining).toEqual([]);
  });

  it("distingue una indicación nueva de una actualizada", () => {
    const item = bulletins[0];
    expect(bulletinUpdateState(item, {})).toBe("new");
    expect(bulletinUpdateState(item, { old: bulletinVersion({ ...item, body: "Texto anterior" }) })).toBe("updated");
    expect(bulletinUpdateState(item, { old: bulletinVersion(item) })).toBeNull();
    expect(bulletinUpdateState({ ...item, updatedAt: "2026-08-30T10:00:00Z" }, { old: bulletinVersion(item) })).toBeNull();
  });
});
