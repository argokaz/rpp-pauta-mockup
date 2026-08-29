import { describe, expect, it } from "vitest";
import { workspaceStateSchema, type Emission } from "../domain/schemas";
import { initialWorkspaceState, programs, scheduleSlots } from "./seed";
import {
  demoWeekEmissions,
  demoWeekPeople,
  isDemoId,
  mergeDemoEmissions,
  mergeDemoPeople,
  stripDemoData,
} from "./demo-week";

describe("semana de datos de prueba", () => {
  it("cubre cada horario administrado de la semana piloto", () => {
    const managedProgramIds = new Set(programs.filter((program) => program.managed).map((program) => program.id));
    const managedSlots = scheduleSlots.filter((slot) => managedProgramIds.has(slot.programId));

    expect(demoWeekEmissions).toHaveLength(managedSlots.length);
    expect(demoWeekEmissions.every((emission) => isDemoId(emission.id))).toBe(true);
    expect(demoWeekEmissions.every((emission) => emission.segments.length >= 2)).toBe(true);
    expect(demoWeekEmissions.every((emission) => emission.rawText.includes("DATOS DE PRUEBA"))).toBe(true);
  });

  it("mantiene las pautas reales por encima de las ficticias", () => {
    const real: Emission = {
      ...demoWeekEmissions[0],
      id: "real-emission",
      status: "ready",
      rawText: "Pauta real que debe conservarse",
    };
    const merged = mergeDemoEmissions([real], [], true);
    const selected = merged.find((emission) => emission.programId === real.programId && emission.date === real.date);

    expect(selected?.id).toBe("real-emission");
    expect(selected?.rawText).toBe("Pauta real que debe conservarse");
  });

  it("incluye post-pautas demo con tiempos reales y resultado editorial", () => {
    const post = demoWeekEmissions.find((emission) => emission.status === "post");

    expect(post?.postPauta?.reviewStatus).toBe("verified");
    expect(post?.segments.every((segment) => segment.disposition === "aired")).toBe(true);
    expect(post?.segments.every((segment) => segment.actualStart && segment.actualEnd)).toBe(true);
    expect(post?.segments.every((segment) => segment.postSummary?.trim())).toBe(true);
  });

  it("oculta fixtures y overrides al apagar el modo demo", () => {
    const override = { ...demoWeekEmissions[0], status: "post" as const };
    expect(mergeDemoEmissions(initialWorkspaceState.emissions, [override], false)).toEqual(initialWorkspaceState.emissions);
    expect(mergeDemoPeople(initialWorkspaceState.people, false)).toEqual(initialWorkspaceState.people);
  });

  it("elimina defensivamente cualquier demo antes de persistir", () => {
    const cleaned = stripDemoData({
      ...initialWorkspaceState,
      emissions: [...initialWorkspaceState.emissions, demoWeekEmissions[0]],
      people: [...initialWorkspaceState.people, demoWeekPeople[0]],
    });

    expect(cleaned.emissions).toEqual(initialWorkspaceState.emissions);
    expect(cleaned.people).toEqual(initialWorkspaceState.people);
    expect(workspaceStateSchema.parse(cleaned)).toEqual(cleaned);
  });
});
