import { describe, expect, it } from "vitest";
import { bookingMatchesQuery, guestBookings, guestOverlaps, pautaStage, pautaStageLabel } from "./editorial-desk";
import type { Emission, Program, Segment } from "./schemas";

const programs: Program[] = [
  { id: "encendidos", name: "Encendidos", shortName: "Encendidos", hosts: "", managed: true, active: true, accentColor: "#f4d800" },
  { id: "conexion", name: "Conexión", shortName: "Conexión", hosts: "", managed: true, active: true, accentColor: "#f4d800" },
];

function segment(id: string, startTime: string, guest: string, extra: Partial<Segment> = {}): Segment {
  return { id, startTime, endTime: startTime, type: "interview", title: `Bloque ${id}`, guest, notes: "", ...extra };
}

function emission(programId: string, date: string, segments: Segment[], extra: Partial<Emission> = {}): Emission {
  return { id: `${programId}-${date}`, programId, date, status: "draft", rawText: "", producerName: "", segments, updatedAt: "", ...extra };
}

describe("pauta stages", () => {
  it("maps emission status and verification to a single step", () => {
    expect(pautaStage(undefined)).toBe("prepare");
    expect(pautaStage(emission("encendidos", "2026-10-16", [], { status: "ready" }))).toBe("ready");
    expect(pautaStage(emission("encendidos", "2026-10-16", [], { status: "post" }))).toBe("post");
    expect(pautaStage(emission("encendidos", "2026-10-16", [], {
      status: "post",
      postPauta: { reviewStatus: "verified", sourceType: "none", sourceUrl: "", transcriptStatus: "none", notes: "" },
    }))).toBe("closed");
  });

  it("distinguishes an empty pauta from one in preparation", () => {
    expect(pautaStageLabel(emission("encendidos", "2026-10-16", [], { status: "empty" }))).toBe("Sin pauta");
    expect(pautaStageLabel(emission("encendidos", "2026-10-16", [segment("1", "10:00", "")]))).toBe("En preparación");
  });
});

describe("guest bookings", () => {
  const emissions = [
    emission("encendidos", "2026-10-16", [segment("1", "10:15", "Erika Álvarez"), segment("2", "11:00", "")]),
    emission("conexion", "2026-10-16", [segment("3", "18:30", "erika alvarez", { disposition: "aired", postSummary: "Habló de salud mental" })]),
    emission("conexion", "2026-10-15", [segment("4", "18:30", "Erika Álvarez", { disposition: "skipped" })]),
  ];

  it("lists each invitation with program, block and outcome", () => {
    const bookings = guestBookings(emissions, programs);
    expect(bookings).toHaveLength(3);
    expect(bookings[0]).toMatchObject({ date: "2026-10-16", programName: "Encendidos", startTime: "10:15", outcome: "planned" });
    expect(bookings[1]).toMatchObject({ programName: "Conexión", outcome: "aired", postSummary: "Habló de salud mental" });
    expect(bookings[2].outcome).toBe("skipped");
  });

  it("flags the same person booked in two programs on the same day", () => {
    const overlaps = guestOverlaps(guestBookings(emissions, programs));
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].date).toBe("2026-10-16");
    expect(overlaps[0].bookings.map((booking) => booking.programId)).toEqual(["encendidos", "conexion"]);
  });

  it("searches names, programs and what was said without accents", () => {
    const [, aired] = guestBookings(emissions, programs);
    expect(bookingMatchesQuery(aired, "salud")).toBe(true);
    expect(bookingMatchesQuery(aired, "conexion")).toBe(true);
    expect(bookingMatchesQuery(aired, "economía")).toBe(false);
  });
});
