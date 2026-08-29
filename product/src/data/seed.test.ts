import { describe, expect, it } from "vitest";
import { workspaceStateSchema } from "../domain/schemas";
import { initialWorkspaceState, programs, scheduleSlots } from "./seed";

describe("datos iniciales de Pauta RPP", () => {
  it("mantiene exactamente 22 programas administrados", () => {
    expect(programs.filter((program) => program.managed)).toHaveLength(22);
  });

  it("incluye la programación completa de viernes, sábado y domingo", () => {
    expect(scheduleSlots.filter((slot) => slot.dayOfWeek === 5)).toHaveLength(13);
    expect(scheduleSlots.filter((slot) => slot.dayOfWeek === 6)).toHaveLength(14);
    expect(scheduleSlots.filter((slot) => slot.dayOfWeek === 0)).toHaveLength(11);
  });

  it("no contiene horarios que apunten a programas inexistentes", () => {
    const programIds = new Set(programs.map((program) => program.id));
    expect(scheduleSlots.every((slot) => programIds.has(slot.programId))).toBe(true);
  });

  it("no duplica identificadores de horario", () => {
    expect(new Set(scheduleSlots.map((slot) => slot.id)).size).toBe(scheduleSlots.length);
  });

  it("valida el estado demo con el contrato del dominio", () => {
    expect(workspaceStateSchema.parse(initialWorkspaceState)).toEqual(initialWorkspaceState);
  });
});
