import { afterEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseWorkspaceRepository } from "./supabase-workspace-repository";
import { createPracticeWorkspace } from "./practice-workspace";
import { createLocalWorkspaceRepository } from "./local-workspace-repository";
import { withSaveDeadline } from "./save-deadline";
import type { Bulletin } from "../domain/schemas";

const bulletin: Bulletin = { id: "fab1d992-dcce-430b-81a7-fd8339d4dd67", weekStart: "2026-09-07", title: "Tema de servicio", body: "Preparar preguntas para el invitado", scope: "Todos los programas", programIds: [], pinnedRank: null, updatedAt: "2026-09-10T12:00:00Z" };
function remote(fetcher: typeof fetch) {
  return createSupabaseWorkspaceRepository(createClient("https://example.supabase.co", "public-test-key", { accessToken: async () => "test-token", global: { fetch: fetcher } }), "test-user");
}
afterEach(() => vi.useRealTimers());

describe("guardado puntual editorial", () => {
  it("guarda una indicación en una sola petición, sin reescribir ni recargar el resto", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    await remote(request).saveEditorialChanges!({ bulletins: [bulletin] });
    expect(request).toHaveBeenCalledTimes(1);
    const [url, options] = request.mock.calls[0];
    expect(String(url)).toContain("/rest/v1/bulletins");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual([expect.objectContaining({ id: bulletin.id, title: bulletin.title, scope: "all", scope_program_ids: [] })]);
  });
  it("agrupa indicaciones y conserva el mismo id al reintentar", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 201 }));
    const repository = remote(request);
    const selected = { ...bulletin, scope: "encendidos", programIds: ["encendidos", "rotativa-am"] };
    await repository.saveEditorialChanges!({ bulletins: [selected] });
    await repository.saveEditorialChanges!({ bulletins: [selected] });
    for (const [, options] of request.mock.calls) expect(JSON.parse(String(options?.body))).toEqual([expect.objectContaining({ id: bulletin.id, scope_program_ids: selected.programIds })]);
  });
  it("devuelve el rechazo del servidor para mantener abierto el borrador", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ message: "Permiso denegado", code: "42501" }), { status: 403 }));
    await expect(remote(request).saveEditorialChanges!({ bulletins: [bulletin] })).rejects.toThrow("Permiso denegado");
    expect(bulletin.body).toBe("Preparar preguntas para el invitado");
  });
  it("un evento toca solo ese evento y sus coberturas", async () => {
    const request = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 201 }));
    await remote(request).saveEditorialChanges!({ importantDates: [{ id: bulletin.id, date: "2026-09-10", title: "Reunión", details: "Preparar cobertura", category: "editorial", sourceUrl: "", plans: { encendidos: "Entrevista" } }] });
    expect(request.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual(["/rest/v1/important_dates", "/rest/v1/important_date_plans", "/rest/v1/important_date_plans"]);
    expect(String(request.mock.calls[1][0])).toContain(`important_date_id=eq.${bulletin.id}`);
  });
  it("también guarda en demo sin tocar pautas ni otras indicaciones", async () => {
    let state = createPracticeWorkspace(undefined, new Date("2026-09-10T12:00:00Z"));
    const originalEmissions = structuredClone(state.emissions);
    const originalNotice = structuredClone(state.bulletins[0]);
    const repository = createLocalWorkspaceRepository({ load: () => structuredClone(state), save: (next) => { state = next; } });
    await repository.saveEditorialChanges!({ bulletins: [bulletin] });
    expect(state.emissions).toEqual(originalEmissions);
    expect(state.bulletins).toContainEqual(originalNotice);
    expect(state.bulletins).toContainEqual(bulletin);
  });
  it("limita una conexión colgada y aborta la solicitud pendiente", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const result = withSaveDeadline(async (current) => { signal = current; return new Promise<void>(() => {}); }, 15000);
    const assertion = expect(result).rejects.toThrow("Tu texto sigue aquí");
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
