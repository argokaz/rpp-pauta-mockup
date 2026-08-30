import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.email(),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["superadmin", "general_producer", "producer", "viewer"]),
  programIds: z.array(z.string()).max(40).default([]),
});

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!url || !publicKey) return jsonError("Falta la configuración pública de Supabase.", 503);
  if (!serviceKey) return jsonError("La invitación todavía no está habilitada en el servidor. Falta SUPABASE_SERVICE_ROLE_KEY.", 503);
  if (!authorization?.startsWith("Bearer ")) return jsonError("Tu sesión ya no es válida.", 401);

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Revisa el correo, nombre, rol y programas asignados.", 400);

  const accessToken = authorization.slice("Bearer ".length);
  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userResult, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userResult.user) return jsonError("Tu sesión ya no es válida.", 401);

  const { data: profile, error: profileError } = await userClient.from("profiles").select("app_role,active").eq("id", userResult.user.id).single();
  if (profileError || !profile?.active || profile.app_role !== "superadmin") {
    return jsonError("No tienes permiso para invitar usuarios.", 403);
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email.toLowerCase(), {
    data: { full_name: parsed.data.fullName },
    redirectTo: new URL("/", request.url).origin,
  });
  if (inviteError || !invited.user) {
    return jsonError(inviteError?.message.includes("already") ? "Ese correo ya tiene una cuenta." : "No se pudo enviar la invitación.", 400);
  }

  const { error: updateError } = await admin.from("profiles").update({ full_name: parsed.data.fullName, app_role: parsed.data.role, active: true }).eq("id", invited.user.id);
  if (updateError) return jsonError("La cuenta fue creada, pero falta completar su perfil editorial.", 500);

  if (["producer", "viewer"].includes(parsed.data.role) && parsed.data.programIds.length) {
    const { error: membershipError } = await admin.from("program_memberships").insert(parsed.data.programIds.map((programId) => ({
      user_id: invited.user.id,
      program_id: programId,
      membership_role: parsed.data.role === "viewer" ? "viewer" : "producer",
    })));
    if (membershipError) return jsonError("La cuenta fue creada, pero falta asignar sus programas.", 500);
  }

  return Response.json({ id: invited.user.id, email: parsed.data.email.toLowerCase() }, { status: 201 });
}
