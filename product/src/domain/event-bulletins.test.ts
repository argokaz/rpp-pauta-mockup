import { describe, expect, it } from "vitest";
import { bulletinForImportantDate } from "./event-bulletins";
import type { ImportantDate, Program } from "./schemas";

const programs = [
  { id: "encendidos", name: "Encendidos", shortName: "Encendidos", hosts: "Sara Abu Sabbah y Carlos Galdós", managed: true, active: true, accentColor: "#f4d800" },
  { id: "conexion", name: "Conexión", shortName: "Conexión", hosts: "Martín Riepl y Fátima Chávez", managed: true, active: true, accentColor: "#d9713a" },
] satisfies Program[];

const event = {
  id: "event-1",
  date: "2026-09-18",
  title: "Debate municipal",
  details: "Confirmar voceros antes del jueves.",
  plans: { encendidos: "Entrevistar especialistas", conexion: "Preparar resumen" },
  category: "editorial",
  sourceUrl: "",
} satisfies ImportantDate;

describe("bulletinForImportantDate", () => {
  it("convierte un evento delegado en una indicación global y accionable", () => {
    const bulletin = bulletinForImportantDate(event, programs, "2026-09-14", "2026-08-30T12:00:00Z");
    expect(bulletin.id).toBe(event.id);
    expect(bulletin.title).toMatch(/18 de (?:setiembre|septiembre)/);
    expect(bulletin.body).toContain("Encendidos y Conexión");
    expect(bulletin.scope).toBe("Todos los programas");
  });

  it("conserva la prioridad cuando se actualiza el evento publicado", () => {
    const bulletin = bulletinForImportantDate(event, programs, "2026-09-14", "2026-08-30T12:00:00Z", {
      id: event.id,
      weekStart: "2026-09-14",
      title: "Anterior",
      body: "Anterior",
      scope: "Todos los programas",
      pinnedRank: 2,
      updatedAt: "2026-08-29T12:00:00Z",
    });
    expect(bulletin.pinnedRank).toBe(2);
  });
});
