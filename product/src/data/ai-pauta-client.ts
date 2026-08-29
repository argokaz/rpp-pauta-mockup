import {
  structurePautaResponseSchema,
  type StructurePautaRequest,
  type StructurePautaResponse,
} from "@/domain/pauta-import";

export async function structurePauta(
  input: StructurePautaRequest,
  accessToken: string,
): Promise<StructurePautaResponse> {
  const response = await fetch("/api/structure-pauta", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload
      ? String(payload.error)
      : "No pudimos ordenar esta pauta.";
    throw new Error(message);
  }

  return structurePautaResponseSchema.parse(payload);
}
