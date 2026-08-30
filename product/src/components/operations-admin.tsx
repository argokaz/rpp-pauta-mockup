"use client";

import { useEffect, useMemo, useState } from "react";
import type { EditorialUser, WorkspaceRepository } from "@/data/workspace-repository";
import { programAccessUsername } from "@/domain/program-access";
import type { Program, ScheduleSlot, WorkspaceState } from "@/domain/schemas";

type AdminTab = "schedule" | "programs" | "team";

type GeneratedAccess = {
  id: string;
  username: string;
  password: string;
  programName: string;
};

type OperationsAdminProps = {
  canManageUsers: boolean;
  getAccessToken?: (forceRefresh?: boolean) => Promise<string>;
  initialDate: string;
  onClose: () => void;
  onWorkspaceChange: (workspace: WorkspaceState) => void;
  repository: WorkspaceRepository;
  workspace: WorkspaceState;
};

const roles: Array<{ value: EditorialUser["role"]; label: string }> = [
  { value: "superadmin", label: "Superadmin" },
  { value: "general_producer", label: "Producción general" },
  { value: "producer", label: "Productor de programa" },
  { value: "viewer", label: "Solo lectura" },
];

function dayOfWeek(value: string): number {
  return new Date(`${value}T12:00:00`).getDay();
}

function blankSlot(date: string, programId: string): ScheduleSlot {
  return { id: `new-${crypto.randomUUID()}`, programId, dayOfWeek: dayOfWeek(date), startTime: "08:00", endTime: "09:00", effectiveFrom: date, effectiveTo: null, active: true };
}

function blankProgram(): Program {
  return { id: "", name: "", shortName: "", hosts: "", managed: true, active: true };
}

function slug(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function OperationsAdmin({ canManageUsers, getAccessToken, initialDate, onClose, onWorkspaceChange, repository, workspace }: OperationsAdminProps) {
  const [tab, setTab] = useState<AdminTab>("schedule");
  const [scheduleDate, setScheduleDate] = useState(initialDate);
  const [slotDraft, setSlotDraft] = useState<ScheduleSlot | null>(null);
  const [programDraft, setProgramDraft] = useState<Program | null>(null);
  const [users, setUsers] = useState<EditorialUser[]>([]);
  const [userDraft, setUserDraft] = useState<EditorialUser | null>(null);
  const [generatedAccess, setGeneratedAccess] = useState<GeneratedAccess | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const programs = workspace.programs.filter((program) => program.active).sort((a, b) => a.name.localeCompare(b.name, "es"));
  const daySlots = useMemo(() => workspace.scheduleSlots
    .filter((slot) => slot.dayOfWeek === dayOfWeek(scheduleDate))
    .sort((a, b) => a.startTime.localeCompare(b.startTime)), [scheduleDate, workspace.scheduleSlots]);
  const managedPrograms = programs.filter((program) => program.managed);
  const producerAccessCount = (programId: string) => users.filter((user) => user.role === "producer" && user.programIds.includes(programId)).length;
  const totalProgramAccesses = managedPrograms.reduce((total, program) => total + producerAccessCount(program.id), 0);

  useEffect(() => {
    if (tab !== "team" || users.length || !repository.loadEditorialUsers) return;
    const frame = window.requestAnimationFrame(() => {
      setLoadingUsers(true);
      void repository.loadEditorialUsers?.().then(setUsers).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "No se pudo cargar el equipo.")).finally(() => setLoadingUsers(false));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [repository, tab, users.length]);

  async function refreshWorkspace() {
    onWorkspaceChange(await repository.load());
  }

  async function saveSlot() {
    if (!slotDraft || !repository.saveScheduleSlot) return;
    if (!slotDraft.programId || !slotDraft.startTime || !slotDraft.endTime) { setMessage("Completa programa, inicio y fin."); return; }
    setSaving(true); setMessage("");
    try { await repository.saveScheduleSlot(slotDraft); await refreshWorkspace(); setSlotDraft(null); setMessage("Horario guardado con su vigencia."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el horario."); }
    finally { setSaving(false); }
  }

  async function retireSlot(slotId: string) {
    if (!repository.deleteScheduleSlot) return;
    setSaving(true); setMessage("");
    try { await repository.deleteScheduleSlot(slotId, scheduleDate); await refreshWorkspace(); setMessage("Horario retirado sin borrar su historia."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo retirar el horario."); }
    finally { setSaving(false); }
  }

  async function saveProgram() {
    if (!programDraft || !repository.saveProgram) return;
    const next = { ...programDraft, id: programDraft.id || slug(programDraft.name), shortName: programDraft.shortName || programDraft.name };
    if (!next.id || !next.name) { setMessage("Escribe el nombre del programa."); return; }
    setSaving(true); setMessage("");
    try { await repository.saveProgram(next); await refreshWorkspace(); setProgramDraft(null); setMessage("Programa actualizado."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el programa."); }
    finally { setSaving(false); }
  }

  async function saveUser() {
    if (!userDraft || !repository.saveEditorialUser) return;
    setSaving(true); setMessage("");
    try {
      await repository.saveEditorialUser(userDraft);
      setUsers(await repository.loadEditorialUsers?.() ?? users);
      setUserDraft(null);
      setMessage("Usuario y programas actualizados.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo guardar el usuario."); }
    finally { setSaving(false); }
  }

  async function requestProgramAccess(payload: { action: "create_program_access"; programId: string } | { action: "reset_program_access"; userId: string }) {
    if (!getAccessToken) { setMessage("La creación de accesos solo está disponible con Supabase."); return; }
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await getAccessToken()}` },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as Partial<GeneratedAccess> & { error?: string };
      if (!response.ok || !body.id || !body.username || !body.password || !body.programName) throw new Error(body.error || "No se pudo generar el acceso.");
      setGeneratedAccess(body as GeneratedAccess);
      setUserDraft(null);
      setUsers(await repository.loadEditorialUsers?.() ?? users);
      setMessage(payload.action === "create_program_access" ? `Acceso ${body.username} creado. Copia las credenciales antes de cerrar.` : "Contraseña renovada. Copia las nuevas credenciales.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "No se pudo generar el acceso."); }
    finally { setSaving(false); }
  }

  async function copyGeneratedAccess() {
    if (!generatedAccess) return;
    try {
      await navigator.clipboard.writeText(`RPP Pauta\nPrograma: ${generatedAccess.programName}\nUsuario: ${generatedAccess.username}\nContraseña: ${generatedAccess.password}\nhttps://rpp-pauta.vercel.app`);
      setMessage("Credenciales copiadas.");
    } catch { setMessage("No se pudieron copiar automáticamente. Selecciona los campos y cópialos manualmente."); }
  }

  function toggleProgram(programId: string, selected: string[], onChange: (programIds: string[]) => void) {
    onChange(selected.includes(programId) ? selected.filter((id) => id !== programId) : [...selected, programId]);
  }

  return (
    <div className="modal-backdrop operations-admin-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal operations-admin" role="dialog" aria-modal="true" aria-labelledby="operations-admin-title">
        <header><div><span>Configuración operativa</span><h2 id="operations-admin-title">Administración de RPP Pauta</h2></div><button onClick={onClose}>Cerrar</button></header>
        <nav aria-label="Secciones administrativas">
          <button className={tab === "schedule" ? "active" : ""} onClick={() => setTab("schedule")}>Parrilla</button>
          <button className={tab === "programs" ? "active" : ""} onClick={() => setTab("programs")}>Programas</button>
          {canManageUsers && <button className={tab === "team" ? "active" : ""} onClick={() => setTab("team")}>Accesos y equipo</button>}
        </nav>
        {message && <p className="admin-message" role="status">{message}</p>}

        {tab === "schedule" && <div className="admin-section schedule-admin">
          <header><div><strong>Parrilla con vigencia</strong><span>Los cambios nuevos no alteran el horario histórico.</span></div><label><span>Día a configurar</span><input type="date" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} /></label><button onClick={() => setSlotDraft(blankSlot(scheduleDate, programs[0]?.id ?? ""))}>Añadir horario</button></header>
          <div className="admin-schedule-list">{daySlots.map((slot) => {
            const program = programs.find((item) => item.id === slot.programId);
            const valid = scheduleDate >= slot.effectiveFrom && (!slot.effectiveTo || scheduleDate <= slot.effectiveTo) && (slot.active || Boolean(slot.effectiveTo));
            return <article key={slot.id} className={valid ? "current" : "historical"}><time>{slot.startTime}<span>{slot.endTime}</span></time><div><strong>{program?.shortName ?? slot.programId}</strong><small>{slot.effectiveFrom} a {slot.effectiveTo || "sin fecha de fin"}</small></div><b>{valid ? "Vigente" : "Histórico"}</b><button disabled={!slot.active} onClick={() => setSlotDraft({ ...slot, id: `version-${slot.id}`, effectiveFrom: scheduleDate, effectiveTo: null, active: true })}>Crear cambio</button><button disabled={!slot.active || saving} onClick={() => void retireSlot(slot.id)}>Retirar</button></article>})}{!daySlots.length && <div className="empty-state compact"><strong>Sin horarios configurados</strong><p>Añade el primer bloque para este día de la semana.</p></div>}</div>
        </div>}

        {tab === "programs" && <div className="admin-section programs-admin">
          <header><div><strong>Programas de la señal</strong><span>Define cuáles se administran dentro de la herramienta.</span></div><button onClick={() => setProgramDraft(blankProgram())}>Añadir programa</button></header>
          <div>{[...workspace.programs].sort((a, b) => a.name.localeCompare(b.name, "es")).map((program) => <button key={program.id} onClick={() => setProgramDraft(program)}><span><strong>{program.name}</strong><small>{program.hosts || "Conductores por completar"}</small></span><b>{program.active ? program.managed ? "Administrado" : "Solo horario" : "Inactivo"}</b></button>)}</div>
        </div>}

        {tab === "team" && <div className="admin-section team-admin">
          <section className="program-access-card">
            <header><div><strong>Accesos por programa</strong><span>Crea una o varias cuentas independientes para cada equipo.</span></div><b>{loadingUsers ? "..." : totalProgramAccesses}</b></header>
            <div className="program-access-list">
              {loadingUsers && <div className="admin-access-loading"><strong>Revisando accesos</strong><span>Contando las cuentas asignadas a cada programa.</span></div>}
              {!loadingUsers && managedPrograms.map((program) => {
                const accessCount = producerAccessCount(program.id);
                return <article key={program.id}><div><strong>{program.shortName}</strong><span>{accessCount ? `${accessCount} ${accessCount === 1 ? "acceso" : "accesos"} de producción` : "Sin acceso de producción"}</span></div><button disabled={saving || !getAccessToken} onClick={() => void requestProgramAccess({ action: "create_program_access", programId: program.id })}>{accessCount ? "Crear otro" : "Crear acceso"}</button></article>;
              })}
              {!loadingUsers && !managedPrograms.length && <div className="admin-access-empty"><strong>No hay programas administrados</strong><span>Activa un programa desde la sección Programas para crear sus accesos.</span></div>}
            </div>
            <footer>Cada cuenta recibe una contraseña independiente. Los usuarios adicionales se numeran automáticamente, por ejemplo: encendidos-2 y encendidos-3.</footer>
          </section>
          <section className="team-list"><header><strong>Accesos existentes</strong><span>{loadingUsers ? "Cargando..." : `${users.length} cuentas`}</span></header><div>{users.map((user) => {
            const directUsername = programAccessUsername(user.email);
            return <button key={user.id} onClick={() => setUserDraft(user)}><span><strong>{user.fullName || user.email}</strong><small>{directUsername ? `Usuario: ${directUsername}` : user.email}</small></span><b>{roles.find((role) => role.value === user.role)?.label}</b><em>{user.active ? "Activo" : "Suspendido"}</em></button>;
          })}</div></section>
        </div>}

        {slotDraft && <div className="admin-drawer"><header><strong>{slotDraft.id.startsWith("new-") ? "Nuevo horario" : "Nueva vigencia"}</strong><button onClick={() => setSlotDraft(null)}>Cerrar</button></header><div>{slotDraft.id.startsWith("version-") && <p className="admin-drawer-note">El horario anterior se conservará hasta el día previo. Este cambio empieza en la fecha indicada.</p>}<label><span>Programa</span><select value={slotDraft.programId} onChange={(event) => setSlotDraft({ ...slotDraft, programId: event.target.value })}>{programs.map((program) => <option key={program.id} value={program.id}>{program.shortName}</option>)}</select></label><div className="admin-inline"><label><span>Inicio</span><input type="time" value={slotDraft.startTime} onChange={(event) => setSlotDraft({ ...slotDraft, startTime: event.target.value })} /></label><label><span>Fin</span><input type="time" value={slotDraft.endTime} onChange={(event) => setSlotDraft({ ...slotDraft, endTime: event.target.value })} /></label></div><div className="admin-inline"><label><span>Vigente desde</span><input type="date" value={slotDraft.effectiveFrom} onChange={(event) => setSlotDraft({ ...slotDraft, effectiveFrom: event.target.value })} /></label><label><span>Hasta</span><input type="date" value={slotDraft.effectiveTo ?? ""} min={slotDraft.effectiveFrom} onChange={(event) => setSlotDraft({ ...slotDraft, effectiveTo: event.target.value || null })} /></label></div><button className="primary" disabled={saving} onClick={() => void saveSlot()}>Guardar horario</button></div></div>}

        {programDraft && <div className="admin-drawer"><header><strong>{programDraft.id ? "Editar programa" : "Nuevo programa"}</strong><button onClick={() => setProgramDraft(null)}>Cerrar</button></header><div><label><span>Nombre completo</span><input value={programDraft.name} onChange={(event) => setProgramDraft({ ...programDraft, name: event.target.value })} /></label><label><span>Nombre corto</span><input value={programDraft.shortName} onChange={(event) => setProgramDraft({ ...programDraft, shortName: event.target.value })} /></label><label><span>Conductores</span><input value={programDraft.hosts} onChange={(event) => setProgramDraft({ ...programDraft, hosts: event.target.value })} /></label><label className="admin-switch"><input type="checkbox" checked={programDraft.managed} onChange={(event) => setProgramDraft({ ...programDraft, managed: event.target.checked })} /><span>Se administra dentro de la herramienta</span></label><label className="admin-switch"><input type="checkbox" checked={programDraft.active} onChange={(event) => setProgramDraft({ ...programDraft, active: event.target.checked })} /><span>Programa activo en la señal</span></label><button className="primary" disabled={saving} onClick={() => void saveProgram()}>Guardar programa</button></div></div>}

        {userDraft && <div className="admin-drawer"><header><strong>Editar acceso</strong><button onClick={() => setUserDraft(null)}>Cerrar</button></header><div><label><span>Nombre</span><input value={userDraft.fullName} onChange={(event) => setUserDraft({ ...userDraft, fullName: event.target.value })} /></label><label><span>{programAccessUsername(userDraft.email) ? "Usuario" : "Correo"}</span><input disabled value={programAccessUsername(userDraft.email) ?? userDraft.email} /></label><label><span>Rol</span><select value={userDraft.role} onChange={(event) => setUserDraft({ ...userDraft, role: event.target.value as EditorialUser["role"] })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></label>{["producer", "viewer"].includes(userDraft.role) && <div className="program-checks">{programs.filter((program) => program.managed).map((program) => <label key={program.id}><input type="checkbox" checked={userDraft.programIds.includes(program.id)} onChange={() => toggleProgram(program.id, userDraft.programIds, (programIds) => setUserDraft({ ...userDraft, programIds }))} />{program.shortName}</label>)}</div>}<label className="admin-switch"><input type="checkbox" checked={userDraft.active} onChange={(event) => setUserDraft({ ...userDraft, active: event.target.checked })} /><span>Acceso activo</span></label>{programAccessUsername(userDraft.email) && <button className="admin-secondary-action" disabled={saving} onClick={() => void requestProgramAccess({ action: "reset_program_access", userId: userDraft.id })}>Generar nueva contraseña</button>}<button className="primary" disabled={saving} onClick={() => void saveUser()}>Guardar acceso</button></div></div>}

        {generatedAccess && <div className="admin-drawer generated-access-drawer" role="dialog" aria-modal="true" aria-labelledby="generated-access-title"><header><div><span>Acceso listo</span><strong id="generated-access-title">{generatedAccess.programName}</strong></div><button onClick={() => setGeneratedAccess(null)}>Cerrar</button></header><div><p className="admin-drawer-note">Copia estas credenciales ahora. La contraseña no volverá a mostrarse después de cerrar.</p><label><span>Usuario</span><input readOnly value={generatedAccess.username} onFocus={(event) => event.currentTarget.select()} /></label><label><span>Contraseña</span><input readOnly value={generatedAccess.password} onFocus={(event) => event.currentTarget.select()} /></label><button className="primary" onClick={() => void copyGeneratedAccess()}>Copiar credenciales</button><small>El acceso abre únicamente el espacio de producción de {generatedAccess.programName}.</small></div></div>}
      </section>
    </div>
  );
}
