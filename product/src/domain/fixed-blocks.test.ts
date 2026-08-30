import { describe, expect, it } from "vitest";
import { fixedBlocksForEmission, fixedSegmentId, mergeImportedSegmentsWithFixedBlocks, prefillEmissionWithFixedBlocks } from "./fixed-blocks";
import type { Emission, FixedBlock, Segment } from "./schemas";

const tecnoverso: FixedBlock = {
  id: "fixed-tecnoverso",
  programId: "encendidos",
  title: "Tecnoverso",
  sequence: "Tecnoverso",
  type: "sequence",
  guest: "Arturo Goga",
  guestRole: "Periodista especializado en tecnología",
  notes: "Secuencia semanal de tecnología.",
  daysOfWeek: [3, 5],
  startTime: "11:30",
  durationMinutes: 10,
  effectiveFrom: "2026-01-01",
  effectiveTo: null,
  active: true,
};

const emptyEmission: Emission = { id: "emission", programId: "encendidos", date: "2026-09-02", status: "empty", rawText: "", producerName: "", segments: [], appliedFixedBlockIds: [], updatedAt: "2026-09-01T00:00:00Z" };

describe("bloques fijos", () => {
  it("aplica Tecnoverso miércoles y viernes, pero no jueves", () => {
    expect(fixedBlocksForEmission([tecnoverso], "encendidos", "2026-09-02")).toHaveLength(1);
    expect(fixedBlocksForEmission([tecnoverso], "encendidos", "2026-09-03")).toHaveLength(0);
    expect(fixedBlocksForEmission([tecnoverso], "encendidos", "2026-09-04")).toHaveLength(1);
  });

  it("conserva una repetición retirada solo hasta el día anterior al retiro", () => {
    const retired = { ...tecnoverso, active: false, effectiveTo: "2026-09-03" };
    expect(fixedBlocksForEmission([retired], "encendidos", "2026-09-02")).toHaveLength(1);
    expect(fixedBlocksForEmission([retired], "encendidos", "2026-09-04")).toHaveLength(0);
  });

  it("prellena una sola vez con duración libre de diez minutos", () => {
    const first = prefillEmissionWithFixedBlocks(emptyEmission, [tecnoverso], () => "segment-fixed");
    const second = prefillEmissionWithFixedBlocks(first, [tecnoverso], () => "duplicate");
    expect(first.segments[0]).toMatchObject({ startTime: "11:30", endTime: "11:40", fixedBlockId: tecnoverso.id });
    expect(second.segments).toHaveLength(1);
    expect(first.appliedFixedBlockIds).toEqual([tecnoverso.id]);
  });

  it("no vuelve a insertar una repetición omitida expresamente para esa fecha", () => {
    const omitted = { ...emptyEmission, appliedFixedBlockIds: [tecnoverso.id] };
    expect(prefillEmissionWithFixedBlocks(omitted, [tecnoverso], () => "segment-fixed").segments).toHaveLength(0);
  });

  it("genera un UUID estable por bloque y fecha", () => {
    expect(fixedSegmentId(tecnoverso.id, "2026-09-02")).toBe(fixedSegmentId(tecnoverso.id, "2026-09-02"));
    expect(fixedSegmentId(tecnoverso.id, "2026-09-02")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(fixedSegmentId(tecnoverso.id, "2026-09-02")).not.toBe(fixedSegmentId(tecnoverso.id, "2026-09-04"));
  });

  it("reconoce el bloque dentro de una pauta importada y evita duplicarlo", () => {
    const fixed = prefillEmissionWithFixedBlocks(emptyEmission, [tecnoverso], () => "segment-fixed").segments;
    const imported: Segment[] = [{ id: "imported", startTime: "11:32", endTime: "11:42", type: "sequence", title: "Secuencia Tecnoverso", guest: "Arturo Goga", notes: "Tema del día" }];
    const merged = mergeImportedSegmentsWithFixedBlocks(imported, fixed);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "imported", fixedBlockId: tecnoverso.id, startTime: "11:32" });
  });
});
