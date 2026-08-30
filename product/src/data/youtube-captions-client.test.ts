import { afterEach, describe, expect, it, vi } from "vitest";
import { extractYoutubeCaptions } from "./youtube-captions-client";

const input = {
  programId: "encendidos",
  targetDate: "2026-08-28",
  sourceUrl: "https://www.youtube.com/watch?v=lDsn5FMTmSk",
  languageCode: "es",
  refresh: false,
};

const result = {
  videoId: "lDsn5FMTmSk",
  sourceUrl: input.sourceUrl,
  embedUrl: "https://www.youtube.com/embed/lDsn5FMTmSk",
  title: "Encendidos 28/08/2026",
  languageCode: "es",
  provider: "youtube-caption-extractor@1.10.2",
  cached: false,
  extractedAt: "2026-08-30T12:00:00.000Z",
  segments: [{ startMs: 0, endMs: 900, text: "RPP Noticias" }],
};

afterEach(() => vi.restoreAllMocks());

describe("extractYoutubeCaptions", () => {
  it("envía la sesión y valida la respuesta", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    const getAccessToken = vi.fn().mockResolvedValue("token-vigente");

    await expect(extractYoutubeCaptions(input, getAccessToken)).resolves.toEqual(result);
    expect(getAccessToken).toHaveBeenCalledWith(false);
    expect(fetchMock).toHaveBeenCalledWith("/api/youtube-captions", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer token-vigente" }),
    }));
  });

  it("renueva la sesión una vez ante un 401", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "Sesión vencida" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...result, cached: true }), { status: 200 }));
    const getAccessToken = vi.fn()
      .mockResolvedValueOnce("token-vencido")
      .mockResolvedValueOnce("token-renovado");

    await expect(extractYoutubeCaptions(input, getAccessToken)).resolves.toMatchObject({ cached: true });
    expect(getAccessToken).toHaveBeenNthCalledWith(1, false);
    expect(getAccessToken).toHaveBeenNthCalledWith(2, true);
  });
});
