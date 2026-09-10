export const SAVE_TIMEOUT_MS = 15_000;

/** Also bounds waiting for authentication. The aborted signal prevents a delayed fetch. */
export async function withSaveDeadline<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = SAVE_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("No pudimos confirmar el guardado a tiempo. Tu texto sigue aquí. Revisa la conexión y vuelve a guardar."));
      controller.abort();
    }, timeoutMs);
  });
  try { return await Promise.race([operation(controller.signal), timeout]); }
  finally { clearTimeout(timer); }
}
