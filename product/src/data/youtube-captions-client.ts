import {
  youtubeCaptionResponseSchema,
  type YoutubeCaptionRequest,
  type YoutubeCaptionResponse,
} from "../domain/youtube-captions";

export async function extractYoutubeCaptions(
  input: YoutubeCaptionRequest,
  getAccessToken: (forceRefresh?: boolean) => Promise<string>,
): Promise<YoutubeCaptionResponse> {
  async function request(forceRefresh = false) {
    const accessToken = await getAccessToken(forceRefresh);
    return fetch("/api/youtube-captions", {
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
    throw new Error(
      typeof payload === "object" && payload && "error" in payload
        ? String(payload.error)
        : "No pudimos extraer los captions de este video.",
    );
  }
  return youtubeCaptionResponseSchema.parse(payload);
}
