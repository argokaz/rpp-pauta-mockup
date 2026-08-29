import { describe, expect, it } from "vitest";
import { initialWorkspaceState } from "../data/seed";
import { normalizePersonName, syncLocalPeople } from "./people-history";

describe("histórico local de personas", () => {
  it("normaliza acentos, espacios y mayúsculas para evitar duplicados", () => {
    expect(normalizePersonName("  FÁTIMA   Chávez ")).toBe("fatima chavez");
  });

  it("crea una aparición vinculada al programa y al segmento", () => {
    const synced = syncLocalPeople(initialWorkspaceState);
    const erika = synced.people.find((person) => person.normalizedName === "erika alvarez veliz");

    expect(erika).toMatchObject({
      displayName: "Erika Alvarez Veliz",
      appearances: [{
        programId: "encendidos",
        date: "2026-08-28",
        role: "guest",
        segmentTitle: "Uso problemático del celular",
      }],
    });
  });

  it("distingue un colaborador deportivo de un invitado", () => {
    const state = structuredClone(initialWorkspaceState);
    state.emissions[0].segments.push({
      id: "segment-sports",
      startTime: "12:15",
      endTime: "12:30",
      type: "sports",
      title: "Bloque deportivo con Juan Carlos Ortecho",
      guest: "Juan Carlos Ortecho",
      notes: "La fiesta del fútbol",
    });

    const synced = syncLocalPeople(state);
    const juan = synced.people.find((person) => person.normalizedName === "juan carlos ortecho");
    expect(juan?.appearances[0].role).toBe("other");
  });
});
