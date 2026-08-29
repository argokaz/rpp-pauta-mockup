import { describe, expect, it } from "vitest";
import { searchArchiveLocally, type ArchiveSearchFilters } from "./archive-search";
import type { Emission } from "./schemas";

const emissions: Emission[] = [
  {
    id: "emission-1",
    programId: "encendidos",
    date: "2026-08-28",
    status: "post",
    rawText: "Entrevista sobre bienestar digital",
    producerName: "Jean Pierre Laureano",
    updatedAt: "2026-08-28T12:30:00.000Z",
    segments: [{
      id: "segment-1",
      startTime: "10:15",
      endTime: "10:45",
      type: "interview",
      title: "Señales de alerta por uso del celular",
      guest: "Erika Alvarez Veliz",
      guestRole: "Psicóloga clínica",
      topic: "Bienestar digital",
      focus: "Hábitos familiares",
      notes: "",
      disposition: "aired",
      postSummary: "Explicó cuándo el uso del celular se vuelve problemático.",
      keyQuote: "El límite debe ser consistente.",
      quoteVerified: true,
    }],
  },
  {
    id: "emission-2",
    programId: "conexion",
    date: "2026-08-27",
    status: "ready",
    rawText: "Pauta de economía",
    producerName: "Equipo Conexión",
    updatedAt: "2026-08-27T20:00:00.000Z",
    segments: [{
      id: "segment-2",
      startTime: "18:30",
      endTime: "19:00",
      type: "interview",
      title: "Cómo ordenar las deudas",
      guest: "Jorge Carrillo Acosta",
      guestRole: "Experto en finanzas",
      topic: "Finanzas personales",
      focus: "Priorizar pagos",
      notes: "",
    }],
  },
];

function filters(overrides: Partial<ArchiveSearchFilters> = {}): ArchiveSearchFilters {
  return { query: "", limit: 20, offset: 0, ...overrides };
}

describe("búsqueda histórica local", () => {
  it("busca por lo dicho, tema y programa", () => {
    expect(searchArchiveLocally(emissions, filters({ query: "uso del celular" })).items[0]?.segmentId).toBe("segment-1");
    expect(searchArchiveLocally(emissions, filters({ query: "finanzas", programId: "conexion" })).total).toBe(1);
  });

  it("tolera errores pequeños en el nombre de un invitado", () => {
    const result = searchArchiveLocally(emissions, filters({ query: "Erika Alvares Velis" }));
    expect(result.items[0]?.guest).toBe("Erika Alvarez Veliz");
  });

  it("filtra por rango de fechas y resultado al aire", () => {
    expect(searchArchiveLocally(emissions, filters({ dateFrom: "2026-08-28", disposition: "aired" })).total).toBe(1);
    expect(searchArchiveLocally(emissions, filters({ disposition: "planned" })).items[0]?.segmentId).toBe("segment-2");
  });

  it("pagina sin perder el total", () => {
    const first = searchArchiveLocally(emissions, filters({ limit: 1 }));
    const second = searchArchiveLocally(emissions, filters({ limit: 1, offset: 1 }));
    expect(first).toMatchObject({ total: 2, hasMore: true });
    expect(second).toMatchObject({ total: 2, hasMore: false });
    expect(second.items[0]?.segmentId).toBe("segment-2");
  });
});
