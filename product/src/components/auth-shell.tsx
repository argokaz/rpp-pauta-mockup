"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { WorkspaceApp } from "@/components/workspace-app";
import { localWorkspaceRepository } from "@/data/local-workspace-repository";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/data/supabase-client";
import { createSupabaseWorkspaceRepository } from "@/data/supabase-workspace-repository";

type Profile = {
  full_name: string;
  app_role: "superadmin" | "general_producer" | "producer" | "viewer";
};

const editableRoles = new Set(["superadmin", "general_producer"]);

export function AuthShell() {
  const remoteMode = isSupabaseConfigured();
  const supabase = useMemo(() => remoteMode ? getSupabaseBrowserClient() : null, [remoteMode]);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(remoteMode);
  const [authError, setAuthError] = useState("");
  const remoteRepository = useMemo(
    () => supabase && session ? createSupabaseWorkspaceRepository(supabase, session.user.id) : null,
    [session, supabase],
  );

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
      setSession(nextSession);
      setProfile(null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("full_name,app_role")
      .eq("id", session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setAuthError("No se pudo cargar tu perfil editorial.");
        else setProfile(data as Profile);
      });
    return () => { active = false; };
  }, [session, supabase]);

  if (!remoteMode) {
    return <WorkspaceApp repository={localWorkspaceRepository} accountLabel="AG" canEdit />;
  }

  if (loading) return <AccessLoading />;
  if (!supabase) return <AccessError message="Falta la configuración de Supabase." />;
  if (!session) return <SignIn supabase={supabase} initialError={authError} />;
  if (!profile || !remoteRepository) return authError ? <AccessError message={authError} /> : <AccessLoading />;

  const email = session.user.email ?? "Usuario RPP";
  const accountLabel = (profile.full_name || email).slice(0, 2).toUpperCase();

  return (
    <WorkspaceApp
      repository={remoteRepository}
      accountLabel={accountLabel}
      accountName={profile.full_name || email}
      canEdit={editableRoles.has(profile.app_role)}
      onSignOut={() => { void supabase.auth.signOut(); }}
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
    const email = username.trim().toLowerCase() === "demo"
      ? "demo@rpp-pauta.local"
      : username.trim();
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

function AccessLoading() {
  return <main className="access-shell"><section className="access-panel compact"><strong>Abriendo la pauta</strong><p>Estamos verificando tu sesión y permisos.</p></section></main>;
}

function AccessError({ message }: { message: string }) {
  return <main className="access-shell"><section className="access-panel compact"><strong>No pudimos abrir la herramienta</strong><p>{message}</p><button className="primary" onClick={() => window.location.reload()}>Reintentar</button></section></main>;
}
