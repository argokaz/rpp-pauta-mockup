import { describe, expect, it } from "vitest";
import { bulletinUpdateState, bulletinVersion, bulletinVisibleToProgram, sortBulletins, splitBulletins } from "./bulletins";
import type { Bulletin } from "./schemas";

const bulletins: Bulletin[] = [
  { id: "old", weekStart: "2026-08-24", title: "Anterior", body: "A", scope: "Todos los programas", programIds: [], pinnedRank: null, updatedAt: "2026-08-27T10:00:00Z" },
  { id: "pin-2", weekStart: "2026-08-24", title: "Fijada dos", body: "B", scope: "Todos los programas", programIds: [], pinnedRank: 2, updatedAt: "2026-08-29T11:00:00Z" },
  { id: "new", weekStart: "2026-08-24", title: "Reciente", body: "C", scope: "Todos los programas", programIds: [], pinnedRank: null, updatedAt: "2026-08-29T12:00:00Z" },
  { id: "pin-1", weekStart: "2026-08-24", title: "Fijada uno", body: "D", scope: "Todos los programas", programIds: [], pinnedRank: 1, updatedAt: "2026-08-28T12:00:00Z" },
  { id: "pin-4", weekStart: "2026-08-24", title: "Fijada cuatro", body: "E", scope: "Todos los programas", programIds: [], pinnedRank: 4, updatedAt: "2026-08-29T13:00:00Z" },
  { id: "pin-3", weekStart: "2026-08-24", title: "Fijada tres", body: "F", scope: "Todos los programas", programIds: [], pinnedRank: 3, updatedAt: "2026-08-29T14:00:00Z" },
];

describe("bulletins", () => {
  it("ordena primero las cuatro posiciones fijadas", () => {
    expect(sortBulletins(bulletins).map((item) => item.id)).toEqual(["pin-1", "pin-2", "pin-3", "pin-4", "new", "old"]);
  });

  it("mantiene todas las indicaciones visibles y ordena primero las fijadas", () => {
    const result = splitBulletins(bulletins);
    expect(result.featured.map((item) => item.id)).toEqual(["pin-1", "pin-2", "pin-3", "pin-4", "new", "old"]);
    expect(result.remaining).toEqual([]);
  });

  it("muestra todas las indicaciones recientes cuando todavía no hay fijadas", () => {
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

  it("muestra una indicación global o asignada al programa exacto", () => {
    expect(bulletinVisibleToProgram({ ...bulletins[0], scope: "Todos los programas" }, "encendidos", "Encendidos", "Encendidos")).toBe(true);
    expect(bulletinVisibleToProgram({ ...bulletins[0], scope: "encendidos" }, "encendidos", "Encendidos", "Encendidos")).toBe(true);
    expect(bulletinVisibleToProgram({ ...bulletins[0], scope: "encendidos" }, "conexion", "Conexión", "Conexión")).toBe(false);
  });

  it("muestra una indicación a cualquiera de los programas seleccionados", () => {
    const item = { ...bulletins[0], scope: "encendidos", programIds: ["encendidos", "conexion"] };
    expect(bulletinVisibleToProgram(item, "encendidos", "Encendidos", "Encendidos")).toBe(true);
    expect(bulletinVisibleToProgram(item, "conexion", "Conexión", "Conexión")).toBe(true);
    expect(bulletinVisibleToProgram(item, "rotativa-am", "Rotativa AM", "Rotativa AM")).toBe(false);
  });

  it("no confunde el modo de selección vacío con un programa", () => {
    const item = { ...bulletins[0], scope: "Selección de programas", programIds: [] };
    expect(bulletinVisibleToProgram(item, "encendidos", "Encendidos", "Encendidos")).toBe(false);
  });
});
