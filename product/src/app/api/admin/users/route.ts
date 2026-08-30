import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { z } from "zod";
import { nextProgramAccessCandidate, programAccessCandidate, programAccessEmail, programAccessUsername } from "@/domain/program-access";

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_program_access"), programId: z.string().trim().min(1).max(120) }),
  z.object({ action: z.literal("reset_program_access"), userId: z.uuid() }),
]);

type AdminClient = SupabaseClient;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

function generatedPassword(): string {
  return `Rpp!${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
}

async function createProgramAccess(admin: AdminClient, programId: string) {
  const { data: program, error: programError } = await admin
    .from("programs")
    .select("id,name,short_name,managed,active")
    .eq("id", programId)
    .single();
  if (programError || !program?.active || !program.managed) return jsonError("El programa no está disponible para crear un acceso.", 404);

  const baseUsername = programAccessCandidate(program.id, 1);
  const { data: existingProfiles, error: existingProfilesError } = await admin
    .from("profiles")
    .select("email")
    .like("email", `${baseUsername}%@rpp-pauta.local`);
  if (existingProfilesError) return jsonError("No se pudieron comprobar los accesos existentes.", 500);
  const usedUsernames = new Set((existingProfiles ?? [])
    .map((profile) => programAccessUsername(profile.email))
    .filter((username): username is string => Boolean(username)));

  const password = generatedPassword();
  let createdUser: User | null = null;
  let username = "";
  let fullName = "";

  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const candidate = nextProgramAccessCandidate(program.id, usedUsernames);
    if (!candidate) break;
    username = candidate.username;
    const accessNumber = candidate.accessNumber;
    fullName = `Producción ${program.short_name}${accessNumber > 1 ? ` ${accessNumber}` : ""}`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: programAccessEmail(username),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, program_access: true },
    });
    if (created.user) {
      createdUser = created.user;
      break;
    }
    if (!/already|registered|exists/i.test(createError?.message ?? "")) {
      return jsonError("No se pudo crear el acceso del programa.", 400);
    }
    usedUsernames.add(username);
  }
  if (!createdUser) return jsonError("Este programa alcanzó el límite de accesos directos.", 409);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, app_role: "producer", active: true })
    .eq("id", createdUser.id);
  if (profileError) {
    await admin.auth.admin.deleteUser(createdUser.id);
    return jsonError("No se pudo completar el perfil editorial del programa.", 500);
  }

  const { error: membershipError } = await admin.from("program_memberships").insert({
    user_id: createdUser.id,
    program_id: program.id,
    membership_role: "producer",
  });
  if (membershipError) {
    await admin.auth.admin.deleteUser(createdUser.id);
    return jsonError("No se pudo asignar el acceso al programa.", 500);
  }

  return Response.json({ id: createdUser.id, username, password, programName: program.short_name }, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}

async function resetProgramAccess(admin: AdminClient, userId: string) {
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,email,app_role,active")
    .eq("id", userId)
    .single();
  const username = profile?.email ? programAccessUsername(profile.email) : null;
  if (profileError || !profile || profile.app_role !== "producer" || !username) {
    return jsonError("Solo se puede regenerar la contraseña de un acceso directo de programa.", 400);
  }

  const { data: memberships, error: membershipError } = await admin
    .from("program_memberships")
    .select("program_id,programs(short_name)")
    .eq("user_id", userId)
    .limit(2);
  if (membershipError || memberships?.length !== 1) return jsonError("El acceso no tiene un único programa asignado.", 400);

  const password = generatedPassword();
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateError) return jsonError("No se pudo generar una nueva contraseña.", 400);
  const program = memberships[0].programs as unknown as { short_name?: string } | null;
  return Response.json({ id: userId, username, password, programName: program?.short_name ?? username }, {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!url || !publicKey) return jsonError("Falta la configuración pública de Supabase.", 503);
  if (!serviceKey) return jsonError("La creación de accesos todavía no está habilitada en el servidor.", 503);
  if (!authorization?.startsWith("Bearer ")) return jsonError("Tu sesión ya no es válida.", 401);

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("La solicitud de acceso no es válida.", 400);

  const accessToken = authorization.slice("Bearer ".length);
  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userResult.user) return jsonError("Tu sesión ya no es válida.", 401);

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("app_role,active")
    .eq("id", userResult.user.id)
    .single();
  if (profileError || !profile?.active || profile.app_role !== "superadmin") {
    return jsonError("No tienes permiso para crear accesos.", 403);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return parsed.data.action === "create_program_access"
    ? createProgramAccess(admin, parsed.data.programId)
    : resetProgramAccess(admin, parsed.data.userId);
}
