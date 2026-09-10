import { describe, expect, it, vi } from "vitest";
import { initialWorkspaceState } from "./seed";
import { createPracticeRepository, createPracticeWorkspace, limaMoment, practicePautaProposal } from "./practice-workspace";
import { structurePautaResponseSchema } from "../domain/pauta-import";
import { bulletinVisibleToProgram } from "../domain/bulletins";

function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}
const morning = new Date("2026-09-10T11:00:00Z");

describe("demo aislado de la semana actual", () => {
  it("usa el calendario de Lima incluso al cambiar la semana en UTC", () => {
    expect(limaMoment(new Date("2026-10-05T02:15:00Z"))).toMatchObject({ date: "2026-10-04", weekStart: "2026-09-28", time: "21:15" });
    expect(limaMoment(new Date("2026-10-05T05:15:00Z"))).toMatchObject({ date: "2026-10-05", weekStart: "2026-10-05", time: "00:15" });
  });
  it("prepara ejemplos y espacios vacíos en cualquier semana, sin copiar contenido real", () => {
    const real = structuredClone(initialWorkspaceState);
    real.emissions[0].rawText = "CONTENIDO REAL PRIVADO";
    const before = JSON.stringify(real);
    const demo = createPracticeWorkspace(real, new Date("2026-10-22T16:00:00Z"));
    expect(demo.emissions.every((item) => item.date >= "2026-10-19" && item.date <= "2026-10-25")).toBe(true);
    expect(demo.emissions.some((item) => !item.segments.length)).toBe(true);
    expect(demo.emissions.some((item) => item.date === "2026-10-22" && item.segments.length)).toBe(true);
    expect(JSON.stringify(demo)).not.toContain("CONTENIDO REAL PRIVADO");
    expect(JSON.stringify(real)).toBe(before);
    expect(bulletinVisibleToProgram(demo.bulletins[0], "encendidos", "Encendidos", "Encendidos")).toBe(true);
  });
  it("distingue antes, durante y después de la emisión según la hora actual", () => {
    const emissionAt = (hour: string) => createPracticeWorkspace(initialWorkspaceState, new Date(`2026-09-10T${hour}:00Z`)).emissions.find((item) => item.programId === "encendidos" && item.date === "2026-09-10")!;
    expect(emissionAt("14:00").segments.every((item) => !item.actualStart)).toBe(true);
    expect(emissionAt("16:00").segments.some((item) => item.actualStart)).toBe(true);
    const ended = emissionAt("18:00");
    expect(ended.status).toBe("post");
    expect(ended.segments.every((item) => item.disposition === "aired")).toBe(true);
    expect(ended.segments.some((item) => !item.postSummary)).toBe(true);
    expect(ended.segments.some((item) => item.postSummary)).toBe(true);
  });
  it("guarda ejercicios, actualiza ejemplos intactos y permite reiniciar", async () => {
    const browser = storage();
    const demo = createPracticeRepository(initialWorkspaceState, browser, "qa", morning);
    const empty = demo.workspace.emissions.find((item) => !item.segments.length)!;
    await demo.repository.saveProgramEmission!({ ...empty, rawText: "Mi ejercicio conservado", status: "draft" });
    const later = new Date("2026-09-10T23:00:00Z");
    const resumed = createPracticeRepository(initialWorkspaceState, browser, "qa", later);
    expect(resumed.workspace.emissions.find((item) => item.id === empty.id)?.rawText).toBe("Mi ejercicio conservado");
    expect(resumed.workspace.emissions.find((item) => item.date === "2026-09-10" && item.programId === "encendidos")?.status).toBe("post");
    expect(browser.values.size).toBe(1);
    expect([...browser.values.keys()][0]).toBe("rpp-practice-v1:qa:2026-09-07");
    const reset = createPracticeRepository(initialWorkspaceState, browser, "qa", later, true);
    expect(reset.workspace.emissions.find((item) => item.id === empty.id)?.rawText).toBe("");
  });
  it("separa cuentas y semanas, y conserva cambios de bloques e indicaciones sin red", async () => {
    const browser = storage();
    const network = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Demo must not use network"));
    try {
      const demo = createPracticeRepository(initialWorkspaceState, browser, "producer", morning);
      const emission = demo.workspace.emissions.find((item) => item.segments.length)!;
      await demo.repository.saveSegment!(emission, { ...emission.segments[0], title: "Título de práctica" }, 0);
      const updated = await demo.repository.load();
      await demo.repository.save({ ...updated, bulletins: updated.bulletins.map((item) => ({ ...item, title: "Indicación de práctica" })) });
      const resumed = createPracticeRepository(initialWorkspaceState, browser, "producer", morning);
      expect(resumed.workspace.emissions.find((item) => item.id === emission.id)?.segments[0].title).toBe("Título de práctica");
      expect(resumed.workspace.bulletins[0].title).toBe("Indicación de práctica");
      const other = createPracticeRepository(initialWorkspaceState, browser, "admin", morning);
      expect(other.workspace.bulletins[0].title).not.toBe("Indicación de práctica");
      const nextWeek = createPracticeRepository(initialWorkspaceState, browser, "producer", new Date("2026-09-14T12:00:00Z"));
      expect(nextWeek.workspace.emissions.every((item) => item.date >= "2026-09-14")).toBe(true);
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
  it("permite revisar textos estructurados y libres sin enviar nada a IA", () => {
    for (const rawText of ["10:00 - 10:15\nTEMA: Apertura\nResumen de temas del día.\n10:15 - 10:30\nTEMA: Entrevista\nINVITADA: Ana Pérez\nTema: hábitos cotidianos.", "Quiero hablar de hábitos cotidianos con una invitada y recibir preguntas del público."]) {
      const response = practicePautaProposal({ programId: "encendidos", programName: "Encendidos", targetDate: "2026-09-10", plannedStart: "10:00", plannedEnd: "12:30", rawText });
      expect(structurePautaResponseSchema.safeParse(response).success).toBe(true);
      expect(response.processingMode).toBe("local");
      expect(response.proposal.segments.length).toBeGreaterThan(0);
      if (rawText.startsWith("10:00")) { expect(response.proposal.layoutMode).toBe("timed"); expect(response.proposal.segments).toHaveLength(2); }
    }
  });
});
