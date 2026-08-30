import { describe, expect, it } from "vitest";
import { workspaceStateSchema, type Emission } from "../domain/schemas";
import { initialWorkspaceState, programs, scheduleSlots } from "./seed";
import {
  createDemoWeekEmissions,
  DEMO_EMPTY_DAY_OF_WEEK,
  demoWeekEmissions,
  demoWeekPeople,
  demoDateForDayOfWeek,
  findDemoEmptyTarget,
  isDemoId,
  mergeDemoEmissions,
  mergeDemoPeople,
  stripDemoData,
} from "./demo-week";

describe("semana de datos de prueba", () => {
  it("cubre los horarios administrados y reserva el viernes para crear una pauta", () => {
    const managedProgramIds = new Set(programs.filter((program) => program.managed).map((program) => program.id));
    const managedSlots = scheduleSlots.filter((slot) => managedProgramIds.has(slot.programId));
    const emptyDate = demoDateForDayOfWeek("2026-08-24", DEMO_EMPTY_DAY_OF_WEEK);
    const emptyEmissions = demoWeekEmissions.filter((emission) => emission.date === emptyDate);

    expect(demoWeekEmissions).toHaveLength(managedSlots.length);
    expect(emptyEmissions.length).toBeGreaterThan(0);
    expect(emptyEmissions.every((emission) => emission.status === "empty" && !emission.rawText && emission.segments.length === 0)).toBe(true);
    expect(demoWeekEmissions.every((emission) => isDemoId(emission.id))).toBe(true);
    expect(demoWeekEmissions.filter((emission) => emission.date !== emptyDate).every((emission) => emission.segments.length >= 2)).toBe(true);
    expect(demoWeekEmissions.filter((emission) => emission.date !== emptyDate).every((emission) => emission.rawText.includes("DATOS DE PRUEBA"))).toBe(true);
  });

  it("genera la misma experiencia en cualquier semana elegida", () => {
    const emissions = createDemoWeekEmissions("2026-09-07", programs, scheduleSlots);

    expect(emissions.length).toBeGreaterThan(0);
    expect(emissions.every((emission) => emission.date >= "2026-09-07" && emission.date <= "2026-09-13")).toBe(true);
    expect(emissions.filter((emission) => emission.date === "2026-09-11").every((emission) => emission.status === "empty" && !emission.rawText)).toBe(true);
    expect(emissions.filter((emission) => emission.date !== "2026-09-11").every((emission) => emission.rawText.includes("DATOS DE PRUEBA"))).toBe(true);
  });

  it("salta al siguiente viernes cuando el actual ya tiene una pauta real", () => {
    const occupied: Emission = {
      id: "real-friday",
      programId: "encendidos",
      date: "2026-08-28",
      status: "ready",
      rawText: "Pauta real",
      producerName: "Producción",
      segments: [],
      updatedAt: "2026-08-28T12:00:00.000Z",
    };

    expect(findDemoEmptyTarget("2026-08-24", [occupied], programs, scheduleSlots, "encendidos")?.date).toBe("2026-09-04");
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

  it("incluye una bandeja demo para probar la post-pauta por noticia", () => {
    const emission = demoWeekEmissions.find((item) => item.programId === "rotativa-am" && item.date === "2026-08-27");
    const pool = emission?.segments.find((segment) => (segment.stories?.length ?? 0) > 0);

    expect(pool?.stories).toHaveLength(4);
    expect(pool?.stories?.every((story) => !story.disposition)).toBe(true);
  });

  it("oculta fixtures y overrides al apagar el modo demo", () => {
    const override = { ...demoWeekEmissions[0], status: "post" as const };
    expect(mergeDemoEmissions(initialWorkspaceState.emissions, [override], false)).toEqual(initialWorkspaceState.emissions);
    expect(mergeDemoPeople(initialWorkspaceState.people, false, demoWeekEmissions)).toEqual(initialWorkspaceState.people);
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
