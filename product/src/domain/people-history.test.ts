import { describe, expect, it } from "vitest";
import { initialWorkspaceState } from "../data/seed";
import { findSimilarPeople, inferPersonTags, normalizePersonName, sortPeopleEditorially, syncLocalPeople } from "./people-history";

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

  it("sugiere una persona existente aunque el nombre tenga errores", () => {
    const state = syncLocalPeople(initialWorkspaceState);
    const matches = findSimilarPeople("Erika Alvares Velis", state.people);

    expect(matches[0]?.person.displayName).toBe("Erika Alvarez Veliz");
    expect(matches[0]?.score).toBeGreaterThan(.8);
  });

  it("no propone coincidencias débiles para nombres distintos", () => {
    const state = syncLocalPeople(initialWorkspaceState);
    expect(findSimilarPeople("Pedro Castillo", state.people)).toEqual([]);
  });

  it("genera tags breves desde la especialidad y la organización", () => {
    const person = syncLocalPeople(initialWorkspaceState).people[0];
    expect(inferPersonTags({ ...person, primaryRole: "Psicóloga clínica, modificación de conducta", organization: "Clínica RPP", tags: [] }))
      .toEqual(["Psicóloga clínica", "modificación de conducta", "Clínica RPP"]);
  });

  it("prioriza colaboradores, luego invitados frecuentes y recientes", () => {
    const base = syncLocalPeople(initialWorkspaceState).people[0];
    const frequent = { ...base, id: "frequent", displayName: "Invitado frecuente", normalizedName: "invitado frecuente", appearances: [...base.appearances, { ...base.appearances[0], id: "second" }] };
    const collaborator = { ...base, id: "collaborator", displayName: "Colaborador", normalizedName: "colaborador", relationshipType: "collaborator" as const, appearances: [] };
    expect(sortPeopleEditorially([frequent, base, collaborator]).map((person) => person.id))
      .toEqual(["collaborator", "frequent", base.id]);
  });
});
