import { afterEach, describe, expect, it, vi } from "vitest";
import { structurePauta } from "./ai-pauta-client";
import type { StructurePautaRequest } from "../domain/pauta-import";

const input: StructurePautaRequest = {
  programId: "encendidos",
  programName: "Encendidos",
  targetDate: "2026-08-28",
  plannedStart: "10:00",
  plannedEnd: "12:30",
  sourceChannel: "whatsapp",
  rawText: "PREPAUTA ENCENDIDOS VIERNES 28 DE AGOSTO 2026",
};

const successPayload = {
  importId: "8425e5fc-f4e8-4a32-8434-407a60e562de",
  model: "gpt-5.6-terra",
  proposal: {
    documentType: "pre",
    detectedProgramName: "Encendidos",
    detectedDate: "2026-08-28",
    hosts: [],
    producers: [],
    warnings: [],
    segments: [],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("structurePauta", () => {
  it("uses the current session token for the request", async () => {
    const getAccessToken = vi.fn().mockResolvedValue("current-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(successPayload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(structurePauta(input, getAccessToken)).resolves.toMatchObject({ model: "gpt-5.6-terra" });
    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(getAccessToken).toHaveBeenCalledWith(false);
    expect(fetchMock).toHaveBeenCalledWith("/api/structure-pauta", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer current-token" }),
    }));
  });

  it("refreshes the session and retries once after a 401", async () => {
    const getAccessToken = vi.fn()
      .mockResolvedValueOnce("expired-token")
      .mockResolvedValueOnce("fresh-token");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "La sesión ya no es válida." }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(successPayload), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(structurePauta(input, getAccessToken)).resolves.toMatchObject({ model: "gpt-5.6-terra" });
    expect(getAccessToken).toHaveBeenNthCalledWith(1, false);
    expect(getAccessToken).toHaveBeenNthCalledWith(2, true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer fresh-token" }),
    }));
  });
});
