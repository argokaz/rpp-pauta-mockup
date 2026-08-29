import { describe, expect, it } from "vitest";
import { extractNumberedStories, preprocessPauta } from "./pauta-preprocessor";
import type { StructurePautaRequest } from "./pauta-import";

function request(rawText: string): StructurePautaRequest {
  return {
    programId: "encendidos",
    programName: "Encendidos",
    targetDate: "2026-08-28",
    plannedStart: "10:00",
    plannedEnd: "12:30",
    rawText,
  };
}

const timedPauta = `PREPAUTA ENCENDIDOS VIERNES 28 DE AGOSTO 2026

10:00 - 10:15
VIVOS

10:15 - 10:45
TEMA: ¿TU HIJO NO SUELTA EL CELULAR? ESTAS SON LAS SEÑALES DE ALERTA
INVITADA: ERIKA ALVAREZ VELIZ - PSICÓLOGA CLÍNICA
ENFOQUE: DIFERENCIAR ENTRE UN USO NORMAL Y UN USO PROBLEMÁTICO.

10:45 - 11:00
ABRIMOS LÍNEAS TELEFÓNICAS:
PREGUNTA PARA EL PÚBLICO: ¿EL CELULAR ESTÁ REEMPLAZANDO EL JUEGO?

11:30 - 11:45
SECUENCIA 'TECNOVERSO'
TEMA: CARGAR EL CELULAR TODA LA NOCHE DAÑA LA BATERÍA
INVITADO: ARTURO GOGA - PERIODISTA ESPECIALIZADO EN TECNOLOGÍA`;

const newsPauta = `PAUTA LAS NOTICIAS
28 DE AGOSTO 2026
CONDUCCIÓN: FATIMA CHÁVEZ
PRODUCCIÓN: JEAN PIERRE LAUREANO
SALUDO - MARCADORES
T1
(EMERGENCIA 2808)
GOBIERNO DECLARA EL ESTADO DE EMERGENCIA EN LIMA Y EL CALLAO
T2
(PADRECITO)
MUNICIPALIDAD AMENAZA CON DESALOJAR UN CENTRO EDUCATIVO PARROQUIAL
----00000----
1
INF - EJECUTIVO Y OFICIALISMO CONFÍAN EN QUE FACULTADES LEGISLATIVAS SEAN APROBADAS
(INFORME)
EL GOBIERNO ALISTÓ EL PEDIDO DE FACULTADES LEGISLATIVAS POR 120 DÍAS.
1.5
OFF - GOBIERNO DECLARA EL ESTADO DE EMERGENCIA EN LIMA Y EL CALLAO
(EMERGENCIA 2808)
LA MEDIDA TENDRÁ UNA DURACIÓN DE 60 DÍAS.
2
ON - LA PRESIDENTA DESCARTA RENUNCIAS EN EL GABINETE
(ON ENTREVISTA 1+2)
LA PRESIDENTA RESPONDIÓ A LA PRENSA.
3- ENTIDADES PÚBLICAS REGISTRARON SANCIONES POR ACOSO`;

describe("preprocesamiento rápido de pautas", () => {
  it("conserva los tiempos explícitos y reconoce invitados sin llamar al modelo", () => {
    const result = preprocessPauta(request(timedPauta));

    expect(result.mode).toBe("timed");
    expect(result.proposal?.segments).toHaveLength(4);
    expect(result.proposal?.segments[1]).toMatchObject({
      startTime: "10:15",
      endTime: "10:45",
      type: "interview",
      guestName: "Erika Alvarez Veliz",
      guestRole: "Psicóloga clínica",
    });
    expect(result.proposal?.segments[2]).toMatchObject({ type: "audience" });
    expect(result.proposal?.segments[3]).toMatchObject({ sequence: "Tecnoverso" });
  });

  it("separa noticias numeradas y las mantiene dentro de una bandeja sin horarios", () => {
    const result = preprocessPauta(request(newsPauta));
    const pool = result.proposal?.segments.at(-1);

    expect(result.mode).toBe("news_pool");
    expect(result.proposal).toMatchObject({
      layoutMode: "news_pool",
      detectedDate: "2026-08-28",
      hosts: ["Fatima Chavez"],
      producers: ["Jean Pierre Laureano"],
    });
    expect(pool).toMatchObject({ startTime: "", endTime: "", type: "other" });
    expect(pool?.stories).toHaveLength(6);
    expect(pool?.stories[0]).toMatchObject({ reference: "T1", mediaCue: "Emergencia 2808" });
    expect(pool?.stories[2]).toMatchObject({ reference: "1", format: "INF", mediaCue: "Informe" });
    expect(pool?.stories[3]).toMatchObject({ reference: "1.5", format: "OFF" });
  });

  it("no confunde texto libre breve con una escaleta estructurada", () => {
    const result = preprocessPauta(request("Conversar sobre seguridad ciudadana con información todavía por confirmar."));
    expect(result).toEqual({ mode: "freeform", proposal: null });
  });

  it("extrae directamente la lista numerada para auditoría", () => {
    expect(extractNumberedStories(newsPauta).map((story) => story.reference)).toEqual(["T1", "T2", "1", "1.5", "2", "3"]);
  });
});
