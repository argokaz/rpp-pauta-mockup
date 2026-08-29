import { describe, expect, it } from "vitest";
import type { PautaProposal } from "./pauta-import";
import { applyPautaGuardrails, extractExplicitGuestNames } from "./pauta-guardrails";

function proposal(overrides: Partial<PautaProposal> = {}): PautaProposal {
  return {
    documentType: "pre",
    detectedProgramName: "Encendidos",
    detectedDate: "28 DE AGOSTO 2026",
    hosts: [],
    producers: [],
    warnings: [],
    segments: [],
    ...overrides,
  };
}

function segment(guestName = "", guestRole = ""): PautaProposal["segments"][number] {
  return {
    startTime: "10:15",
    endTime: "10:45",
    type: "interview",
    title: "Señales de alerta",
    sequence: "",
    topic: "Uso problemático del celular",
    focus: "Diferenciar usos",
    guestName,
    guestRole,
    audienceQuestion: "",
    productionCues: [],
    notes: "",
    confidence: 0.94,
    sourceExcerpt: "INVITADA: ERIKA ALVAREZ VELIZ - PSICÓLOGA CLÍNICA",
  };
}

const encendidos = `PREPAUTA ENCENDIDOS VIERNES 28 DE AGOSTO 2026
10:15 - 10:45
INVITADA: ERIKA ALVAREZ VELIZ - PSICÓLOGA CLÍNICA
11:30 - 11:45
INVITADO: ARTURO GOGA – PERIODISTA ESPECIALIZADO EN TECNOLOGÍA
12:15 - 12:30
BLOQUE DEPORTIVO CON JUAN CARLOS ORTECHO: LA FIESTA DEL FÚTBOL`;

describe("guardrails editoriales de pauta", () => {
  it("reconoce solo marcadores explícitos de invitación", () => {
    expect(extractExplicitGuestNames(encendidos)).toEqual([
      "ERIKA ALVAREZ VELIZ",
      "ARTURO GOGA",
    ]);
  });

  it("conserva un invitado respaldado y normaliza la fecha en español", () => {
    const result = applyPautaGuardrails(
      proposal({ segments: [segment("Erika Alvarez Veliz", "Psicóloga clínica")] }),
      encendidos,
      "2026-08-28",
    );

    expect(result.proposal.segments[0].guestName).toBe("Erika Alvarez Veliz");
    expect(result.proposal.detectedDate).toBe("2026-08-28");
    expect(result.requiresFallback).toBe(true);
    expect(result.proposal.warnings.join(" ")).toContain("ARTURO GOGA");
  });

  it("no convierte a un colaborador presentado con CON en invitado", () => {
    const raw = "12:15 - 12:30\nBLOQUE DEPORTIVO CON JUAN CARLOS ORTECHO: LA FIESTA DEL FÚTBOL";
    const result = applyPautaGuardrails(
      proposal({ segments: [{ ...segment("Juan Carlos Ortecho", "Periodista deportivo"), startTime: "12:15", endTime: "12:30" }] }),
      raw,
      "2026-08-28",
    );

    expect(result.proposal.segments[0].guestName).toBe("");
    expect(result.requiresFallback).toBe(false);
  });

  it("retira personas de titulares que no son invitados", () => {
    const raw = `PAUTA LAS NOTICIAS\n28 DE AGOSTO 2026\nT3\nKEIKO EN TACNA\nLA PRESIDENTA KEIKO FUJIMORI DESCARTÓ RENUNCIAS\nT5\nJUAN GABRIEL 2808\nADMIRADORES RECORDARON A JUAN GABRIEL`;
    const result = applyPautaGuardrails(
      proposal({
        detectedProgramName: "Las Noticias",
        segments: [
          { ...segment("Keiko Fujimori", "Presidenta"), startTime: "", endTime: "", title: "Keiko en Tacna" },
          { ...segment("Juan Gabriel", "Cantante"), startTime: "", endTime: "", title: "Juan Gabriel" },
        ],
      }),
      raw,
      "2026-08-28",
    );

    expect(result.proposal.segments.map((item) => item.guestName)).toEqual(["", ""]);
    expect(result.requiresFallback).toBe(false);
    expect(result.proposal.segments[0].title).toBe("Keiko en Tacna");
    expect(result.proposal.warnings).toHaveLength(2);
  });

  it("rechaza un invitado asignado al bloque equivocado", () => {
    const raw = `10:15 - 10:45\nINVITADA: ERIKA ALVAREZ VELIZ - PSICÓLOGA\n11:00 - 11:30\nINVITADA: PATRICIA PORTOCARRERO - ACTRIZ`;
    const result = applyPautaGuardrails(
      proposal({
        segments: [{
          ...segment("Patricia Portocarrero", "Actriz"),
          sourceExcerpt: "INVITADA: ERIKA ALVAREZ VELIZ - PSICÓLOGA",
        }],
      }),
      raw,
      "2026-08-28",
    );

    expect(result.proposal.segments[0].guestName).toBe("");
    expect(result.requiresFallback).toBe(true);
  });

  it("retira horarios que el modelo inventó", () => {
    const raw = "PAUTA LAS NOTICIAS\n28 DE AGOSTO 2026\nT1\nEMERGENCIA EN LIMA";
    const result = applyPautaGuardrails(
      proposal({ segments: [{ ...segment(), startTime: "08:00", endTime: "08:30" }] }),
      raw,
      "2026-08-28",
    );

    expect(result.proposal.segments[0]).toMatchObject({ startTime: "", endTime: "", confidence: 0.55 });
  });

  it("solo conserva conducción y producción con sus etiquetas literales", () => {
    const raw = `PAUTA LAS NOTICIAS\nCONDUCCIÓN: FATIMA CHÁVEZ\nPRODUCCIÓN: JEAN PIERRE LAUREANO`;
    const result = applyPautaGuardrails(
      proposal({ hosts: ["Fátima Chávez", "Keiko Fujimori"], producers: ["Jean Pierre Laureano"] }),
      raw,
      "2026-08-28",
    );

    expect(result.proposal.hosts).toEqual(["Fátima Chávez"]);
    expect(result.proposal.producers).toEqual(["Jean Pierre Laureano"]);
  });
});
