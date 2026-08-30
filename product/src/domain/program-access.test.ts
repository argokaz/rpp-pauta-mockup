import { describe, expect, it } from "vitest";
import { emailForLogin, normalizeProgramAccessUsername, programAccessEmail, programAccessUsername } from "./program-access";

describe("accesos directos por programa", () => {
  it("genera un usuario simple y determinista para cada programa", () => {
    expect(normalizeProgramAccessUsername("Ampliación Lima")).toBe("ampliacion-lima");
    expect(programAccessEmail("encendidos")).toBe("encendidos@rpp-pauta.local");
  });

  it("permite iniciar sesión con el usuario corto o con un correo", () => {
    expect(emailForLogin("encendidos")).toBe("encendidos@rpp-pauta.local");
    expect(emailForLogin("persona@rpp.com.pe")).toBe("persona@rpp.com.pe");
    expect(emailForLogin("produccion")).toBe("produccion@rpp-pauta.com");
  });

  it("identifica las cuentas operativas sin exponer el correo técnico", () => {
    expect(programAccessUsername("encendidos@rpp-pauta.local")).toBe("encendidos");
    expect(programAccessUsername("demo@rpp-pauta.local")).toBeNull();
    expect(programAccessUsername("productor@rpp.com.pe")).toBeNull();
  });
});
