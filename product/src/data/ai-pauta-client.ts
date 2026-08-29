import {
  structurePautaResponseSchema,
  type StructurePautaRequest,
  type StructurePautaResponse,
} from "../domain/pauta-import";

export async function structurePauta(
  input: StructurePautaRequest,
  getAccessToken: (forceRefresh?: boolean) => Promise<string>,
): Promise<StructurePautaResponse> {
  async function request(forceRefresh = false) {
    const accessToken = await getAccessToken(forceRefresh);
    return fetch("/api/structure-pauta", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });
  }

  let response = await request();
  if (response.status === 401) response = await request(true);

  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload
      ? String(payload.error)
      : "No pudimos ordenar esta pauta.";
    throw new Error(message);
  }

  return structurePautaResponseSchema.parse(payload);
}
