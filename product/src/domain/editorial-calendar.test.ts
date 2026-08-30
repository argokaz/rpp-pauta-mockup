import { describe, expect, it } from "vitest";
import { mondayForDate, slotAppliesOnDate, weekDaysFor } from "./editorial-calendar";
import type { ScheduleSlot } from "./schemas";

const slot: ScheduleSlot = {
  id: "slot",
  programId: "encendidos",
  dayOfWeek: 5,
  startTime: "10:00",
  endTime: "12:30",
  effectiveFrom: "2026-08-01",
  effectiveTo: "2026-09-15",
  active: false,
};

describe("calendario editorial", () => {
  it("construye semanas de lunes a domingo incluso desde un domingo", () => {
    expect(mondayForDate("2026-08-30")).toBe("2026-08-24");
    expect(weekDaysFor("2026-08-30").map((day) => day.date)).toEqual([
      "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30",
    ]);
  });

  it("conserva un horario retirado dentro de su vigencia histórica", () => {
    expect(slotAppliesOnDate(slot, "2026-08-28")).toBe(true);
    expect(slotAppliesOnDate(slot, "2026-09-16")).toBe(false);
    expect(slotAppliesOnDate({ ...slot, active: true, effectiveTo: null }, "2027-01-01")).toBe(true);
  });
});
