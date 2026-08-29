import { describe, expect, it } from "vitest";
import {
  pautaProposalSchema,
  proposalSegmentToSegment,
  structurePautaRequestSchema,
} from "./pauta-import";

const proposal = pautaProposalSchema.parse({
  documentType: "pre",
  detectedProgramName: "Encendidos",
  detectedDate: "2026-08-28",
  hosts: ["Sara Abu Sabbah"],
  producers: [],
  warnings: [],
  segments: [{
    startTime: "10:15",
    endTime: "10:45",
    type: "interview",
    title: "Uso problemático del celular",
    sequence: "",
    topic: "Señales de alerta en niños",
    focus: "Diferenciar el uso normal del uso problemático",
    guestName: "Erika Alvarez Veliz",
    guestRole: "Psicóloga clínica",
    audienceQuestion: "",
    productionCues: [],
    notes: "",
    confidence: 0.97,
    sourceExcerpt: "10:15 - 10:45 TEMA: ¿TU HIJO NO SUELTA EL CELULAR?",
  }],
});

describe("contrato de importación con IA", () => {
  it("acepta una solicitud editorial completa", () => {
    expect(structurePautaRequestSchema.parse({
      programId: "encendidos",
      programName: "Encendidos",
      targetDate: "2026-08-28",
      plannedStart: "10:00",
      plannedEnd: "12:30",
      sourceChannel: "whatsapp",
      rawText: "PREPAUTA ENCENDIDOS VIERNES 28 DE AGOSTO 2026",
    }).programId).toBe("encendidos");
  });

  it("rechaza horarios ambiguos en la salida estructurada", () => {
    expect(() => pautaProposalSchema.parse({
      ...proposal,
      segments: [{ ...proposal.segments[0], startTime: "10.15" }],
    })).toThrow();
  });

  it("convierte la propuesta confirmada al segmento editable", () => {
    const segment = proposalSegmentToSegment(proposal.segments[0]);
    expect(segment).toMatchObject({
      startTime: "10:15",
      endTime: "10:45",
      type: "interview",
      guest: "Erika Alvarez Veliz",
      guestRole: "Psicóloga clínica",
      confidence: 0.97,
    });
  });
});
