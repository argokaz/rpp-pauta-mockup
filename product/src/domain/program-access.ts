const PROGRAM_ACCESS_DOMAIN = "rpp-pauta.local";

export function normalizeProgramAccessUsername(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function programAccessEmail(username: string): string {
  return `${normalizeProgramAccessUsername(username)}@${PROGRAM_ACCESS_DOMAIN}`;
}

export function programAccessCandidate(programId: string, accessNumber: number): string {
  const base = normalizeProgramAccessUsername(programId);
  return accessNumber <= 1 ? base : `${base}-${accessNumber}`;
}

export function nextProgramAccessCandidate(programId: string, usedUsernames: Iterable<string>, limit = 100): { username: string; accessNumber: number } | null {
  const used = new Set([...usedUsernames].map(normalizeProgramAccessUsername));
  for (let accessNumber = 1; accessNumber <= limit; accessNumber += 1) {
    const username = programAccessCandidate(programId, accessNumber);
    if (!used.has(username)) return { username, accessNumber };
  }
  return null;
}

export function programAccessUsername(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  const suffix = `@${PROGRAM_ACCESS_DOMAIN}`;
  if (!normalized.endsWith(suffix)) return null;
  const username = normalized.slice(0, -suffix.length);
  return username && username !== "demo" ? username : null;
}

export function emailForLogin(usernameOrEmail: string): string {
  const normalized = usernameOrEmail.trim().toLowerCase();
  if (normalized === "demo") return programAccessEmail("demo");
  if (normalized === "produccion") return "produccion@rpp-pauta.com";
  if (normalized.includes("@")) return normalized;
  return programAccessEmail(normalized);
}
