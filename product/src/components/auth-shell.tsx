"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { WorkspaceApp } from "@/components/workspace-app";
import { WorkspaceLoadingShell } from "@/components/workspace-loading-shell";
import { localWorkspaceRepository } from "@/data/local-workspace-repository";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/data/supabase-client";
import { createSupabaseWorkspaceRepository } from "@/data/supabase-workspace-repository";
import { emailForLogin } from "@/domain/program-access";
import type { WorkspaceState } from "@/domain/schemas";

type Profile = {
  full_name: string;
  app_role: "superadmin" | "general_producer" | "producer" | "viewer";
  active: boolean;
};

const editableRoles = new Set(["superadmin", "general_producer", "producer"]);

export function AuthShell() {
  const remoteMode = isSupabaseConfigured();
  const supabase = useMemo(() => remoteMode ? getSupabaseBrowserClient() : null, [remoteMode]);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialWorkspace, setInitialWorkspace] = useState<WorkspaceState | null>(null);
  const [loading, setLoading] = useState(remoteMode);
  const [authError, setAuthError] = useState("");
  const [programIds, setProgramIds] = useState<string[]>([]);
  const profileUserIdRef = useRef<string | null>(null);
  const sessionUserId = session?.user.id ?? null;
  const remoteRepository = useMemo(
    () => supabase && sessionUserId ? createSupabaseWorkspaceRepository(supabase, sessionUserId) : null,
    [sessionUserId, supabase],
  );

  const getAccessToken = useCallback(async (forceRefresh = false) => {
    if (!supabase) throw new Error("Falta la configuración de Supabase.");
    const { data, error } = forceRefresh
      ? await supabase.auth.refreshSession()
      : await supabase.auth.getSession();
    if (error || !data.session) {
      throw new Error("Tu sesión venció. Vuelve a ingresar para ordenar la pauta.");
    }
    return data.session.access_token;
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (profileUserIdRef.current !== nextUserId) {
        profileUserIdRef.current = nextUserId;
        setProfile(null);
        setInitialWorkspace(null);
        setProgramIds([]);
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !sessionUserId || !remoteRepository) return;
    let active = true;
    void Promise.all([
      supabase.from("profiles").select("full_name,app_role,active").eq("id", sessionUserId).single(),
      supabase.from("program_memberships").select("program_id").eq("user_id", sessionUserId),
      remoteRepository.load(),
    ]).then(([profileResult, membershipResult, loadedWorkspace]) => {
        if (!active) return;
        if (profileResult.error) setAuthError("No se pudo cargar tu perfil editorial.");
        else {
          profileUserIdRef.current = sessionUserId;
          setAuthError("");
          setProfile(profileResult.data as Profile);
          setProgramIds((membershipResult.data ?? []).map((membership) => membership.program_id));
          setInitialWorkspace(loadedWorkspace);
        }
      }).catch((error: unknown) => {
        if (!active) return;
        setAuthError(error instanceof Error ? error.message : "No se pudo cargar la información editorial.");
      });
    return () => { active = false; };
  }, [remoteRepository, sessionUserId, supabase]);

  if (!remoteMode) {
    return <WorkspaceApp repository={localWorkspaceRepository} accountLabel="AG" canEdit appRole="superadmin" />;
  }

  if (loading) return <WorkspaceLoadingShell />;
  if (!supabase) return <AccessError message="Falta la configuración de Supabase." />;
  if (!session) return <SignIn supabase={supabase} initialError={authError} />;
  if (!profile || !remoteRepository || !initialWorkspace) return authError ? <AccessError message={authError} /> : <WorkspaceLoadingShell />;
  if (!profile.active) return <AccessError message="Tu acceso editorial está suspendido. Solicita a producción general que lo reactive." />;
  if (profile.app_role === "producer" && !programIds.length) return <AccessError message="Tu cuenta todavía no tiene un programa asignado." />;

  const email = session.user.email ?? "Usuario RPP";
  const accountLabel = (profile.full_name || email).slice(0, 2).toUpperCase();

  return (
    <WorkspaceApp
      repository={remoteRepository}
      initialWorkspace={initialWorkspace}
      accountLabel={accountLabel}
      accountName={profile.full_name || email}
      canEdit={editableRoles.has(profile.app_role)}
      getAccessToken={getAccessToken}
      onSignOut={() => { void supabase.auth.signOut(); }}
      producerProgramIds={profile.app_role === "producer" ? programIds : undefined}
      appRole={profile.app_role}
    />
  );
}

function SignIn({ supabase, initialError }: { supabase: ReturnType<typeof getSupabaseBrowserClient>; initialError: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(initialError);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const email = emailForLogin(username);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSending(false);
    setMessage(error ? "Usuario o contraseña incorrectos." : "Acceso correcto. Abriendo la pauta...");
  }

  return (
    <main className="access-shell">
      <section className="access-panel" aria-labelledby="access-title">
        <div className="access-brand"><span>RPP</span><div><strong>Pauta</strong><small>Informativos</small></div></div>
        <div className="access-copy"><span>Acceso editorial</span><h1 id="access-title">Ingresa a la pauta compartida</h1><p>Usa las credenciales asignadas para el piloto editorial.</p></div>
        <form onSubmit={submit} className="access-form">
          <label><span>Usuario</span><input autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Usuario" /></label>
          <label><span>Contraseña</span><input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" /></label>
          <button className="primary" disabled={sending}>{sending ? "Ingresando..." : "Ingresar"}</button>
          {message && <p className="access-message" role="status">{message}</p>}
        </form>
        <small className="access-note">Acceso restringido al equipo editorial.</small>
      </section>
    </main>
  );
}

function AccessError({ message }: { message: string }) {
  return <main className="access-shell"><section className="access-panel compact"><strong>No pudimos abrir la herramienta</strong><p>{message}</p><button className="primary" onClick={() => window.location.reload()}>Reintentar</button></section></main>;
}
