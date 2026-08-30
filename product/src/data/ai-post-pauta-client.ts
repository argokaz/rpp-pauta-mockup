import { structurePostPautaResponseSchema, type StructurePostPautaRequest, type StructurePostPautaResponse } from "@/domain/post-pauta-import";

export async function structurePostPauta(input: StructurePostPautaRequest, getAccessToken: (forceRefresh?: boolean) => Promise<string>): Promise<StructurePostPautaResponse> {
  async function request(forceRefresh = false) {
    const accessToken = await getAccessToken(forceRefresh);
    return fetch("/api/structure-post-pauta", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }
  let response = await request();
  if (response.status === 401) response = await request(true);
  const payload: unknown = await response.json();
  if (!response.ok) throw new Error(typeof payload === "object" && payload && "error" in payload ? String(payload.error) : "No pudimos contrastar la post-pauta.");
  return structurePostPautaResponseSchema.parse(payload);
}
