const schedule = {
  weekday: [
    ["03:30", "05:00", "La Rotativa del Campo", "Jesús Miguel Calderón"],
    ["05:00", "08:00", "La Rotativa del Aire | Edición Mañana", "Carlos Villarreal y Joanna Castro"],
    ["08:00", "10:00", "Ampliación de noticias Lima", "Mávila Huertas y Fernando Carvallo"],
    ["08:00", "10:00", "Ampliación de noticias regional", "Edición regional"],
    ["10:00", "12:30", "Encendidos", "Sara Abu Sabbah y Carlos Galdós"],
    ["12:30", "14:30", "La Rotativa del Aire | Edición Tarde", "Carlos Villarreal y Joanna Castro"],
    ["14:30", "16:00", "Fútbol como cancha", "Jesús Arias y Alan Diez"],
    ["16:00", "17:00", "Los Chistosos", "Hernán Vidaurre y Daniel Marquina"],
    ["17:00", "18:00", "Espacio Vital", "Elmer Huerta"],
    ["18:00", "20:00", "Conexión", "Martín Riepl y Fátima Chávez"],
    ["20:00", "22:00", "La Rotativa del Aire | Edición Noche", "Jesús Miguel Calderón"],
    ["22:00", "23:00", "Vamos al VAR", "Jesús Arias, Alan Diez y Pedro García"],
    ["23:00", "00:00", "Sabelones", "Daniel Marquina"]
  ],
  saturday: [
    ["04:00", "05:00", "Lo mejor de La Rotativa del Campo", "Especial semanal"],
    ["05:00", "08:00", "La Rotativa de fin de Semana | Sábado", "Fátima Chávez y César Espinoza"],
    ["08:00", "09:00", "Ampliación de Noticias | Sábado", "Fernando Vivas y César Espinoza"],
    ["09:00", "10:00", "Enfoque de los sábados", "Fernando Carvallo"],
    ["10:00", "10:30", "Diálogo de Fe", "Fernando Carvallo y Carlos Castillo"],
    ["10:30", "12:00", "Sencillo y al Bolsillo", "Finanzas personales"],
    ["12:00", "14:00", "En escena", "Johnny Padilla"],
    ["14:00", "16:00", "Lo mejor de Los Chistosos", "Hernán Vidaurre y Daniel Marquina"],
    ["16:00", "17:00", "Letras en el tiempo", "Patricia del Río"],
    ["17:00", "18:00", "Ampliación de Noticias | Sábado | Repetición", "Repetición"],
    ["18:00", "20:00", "En Escena | Repetición", "Repetición"],
    ["20:00", "22:00", "La Rotativa del Aire | Sábado Noche", "Fin de semana"],
    ["22:00", "23:00", "Enfoque de los Sábados | Repetición", "Repetición"],
    ["23:00", "00:00", "Letras en el tiempo | Repetición", "Repetición"]
  ],
  sunday: [
    ["00:00", "05:00", "RPP Informando | Domingo", "Carlos Montalvo"],
    ["05:00", "08:00", "La Rotativa de fin de Semana | Domingo", "Carlos Villarreal y Noemy Mamani"],
    ["08:00", "10:00", "Ampliación de Noticias | Domingo", "Fernando Vivas y Carlos Villarreal"],
    ["10:00", "10:30", "Domingo es fiesta", "Jorge Rodríguez"],
    ["10:30", "14:00", "Siempre en Casa", "Jorge Rodríguez"],
    ["14:00", "16:00", "En Escena | Repetición", "Repetición"],
    ["16:00", "17:00", "Lo mejor de Los Chistosos", "Hernán Vidaurre y Daniel Marquina"],
    ["17:00", "18:00", "Letras en el tiempo | Repetición", "Patricia del Río"],
    ["19:00", "20:00", "Lo mejor de Los Chistosos", "Repetición"],
    ["20:00", "22:00", "La Rotativa del Aire | Domingo Noche", "Fin de semana"],
    ["22:00", "00:00", "Ampliación de Noticias | Domingo | Repetición", "Repetición"]
  ]
};

const managedCatalog = [
  { name: "La Rotativa del Aire | Edición Mañana", label: "Rotativa AM", schedule: "Lun-Vie 05:00 - 08:00", hosts: "Carlos Villarreal y Joanna Castro" },
  { name: "Ampliación de noticias Lima", label: "Ampliación de noticias Lima", schedule: "Lun-Vie 08:00 - 10:00", hosts: "Mávila Huertas y Fernando Carvallo" },
  { name: "Ampliación de noticias regional", label: "Ampliación de noticias regional", schedule: "Lun-Vie 08:00 - 10:00", hosts: "Edición regional" },
  { name: "Encendidos", label: "Encendidos", schedule: "Lun-Vie 10:00 - 12:30", hosts: "Sara Abu Sabbah y Carlos Galdós" },
  { name: "La Rotativa del Aire | Edición Tarde", label: "Rotativa Tarde", schedule: "Lun-Vie 12:30 - 14:30", hosts: "Carlos Villarreal y Joanna Castro" },
  { name: "Los Chistosos", label: "Los Chistosos", schedule: "Lun-Vie 16:00 - 17:00", hosts: "Hernán Vidaurre y Daniel Marquina" },
  { name: "Conexión", label: "Conexión", schedule: "Lun-Vie 18:00 - 20:00", hosts: "Martín Riepl y Fátima Chávez" },
  { name: "La Rotativa del Aire | Edición Noche", label: "Rotativa del Aire Noche", schedule: "Lun-Vie 20:00 - 22:00", hosts: "Jesús Miguel Calderón" },
  { name: "Las cosas como son", label: "Las cosas como son", schedule: "Horario por confirmar", hosts: "Equipo por confirmar" },
  { name: "Prueba de fuego", label: "Prueba de fuego", schedule: "Horario por confirmar", hosts: "Equipo por confirmar" },
  { name: "Así somos", label: "Así somos", schedule: "Horario por confirmar", hosts: "Equipo por confirmar" },
  { name: "La Rotativa de fin de Semana | Sábado", label: "Rotativa AM Sábado", schedule: "Sáb 05:00 - 08:00", hosts: "Fátima Chávez y César Espinoza" },
  { name: "La Rotativa de fin de Semana | Domingo", label: "Rotativa AM Domingo", schedule: "Dom 05:00 - 08:00", hosts: "Carlos Villarreal y Noemy Mamani" },
  { name: "Sencillo y al Bolsillo", label: "Sencillo y al Bolsillo", schedule: "Sáb 10:30 - 12:00", hosts: "Equipo del programa" },
  { name: "En escena", label: "En escena", schedule: "Sáb 12:00 - 14:00", hosts: "Johnny Padilla" },
  { name: "Siempre en Casa", label: "Siempre en Casa", schedule: "Dom 10:30 - 14:00", hosts: "Jorge Rodríguez" },
  { name: "Ampliación de Noticias | Domingo", label: "Ampliación de noticias Domingo", schedule: "Dom 08:00 - 10:00", hosts: "Fernando Vivas y Carlos Villarreal" },
  { name: "Ampliación de Noticias | Sábado", label: "Ampliación de noticias Sábado", schedule: "Sáb 08:00 - 09:00", hosts: "Fernando Vivas y César Espinoza" },
  { name: "Diálogo de Fe", label: "Diálogo de Fe", schedule: "Sáb 10:00 - 10:30", hosts: "Fernando Carvallo y Carlos Castillo" },
  { name: "Domingo es fiesta", label: "Domingo es fiesta", schedule: "Dom 10:00 - 10:30", hosts: "Jorge Rodríguez" },
  { name: "La Rotativa del Aire | Domingo Noche", label: "Rotativa PM Domingo", schedule: "Dom 20:00 - 22:00", hosts: "Fin de semana" },
  { name: "La Rotativa del Aire | Sábado Noche", label: "Rotativa PM Sábado", schedule: "Sáb 20:00 - 22:00", hosts: "Fin de semana" }
];

const managedProgramNames = new Set(managedCatalog.map((program) => program.name));

const days = [
  { short: "Lun", date: 24, key: "weekday" },
  { short: "Mar", date: 25, key: "weekday" },
  { short: "Mié", date: 26, key: "weekday" },
  { short: "Jue", date: 27, key: "weekday" },
  { short: "Vie", date: 28, key: "weekday" },
  { short: "Sáb", date: 29, key: "saturday" },
  { short: "Dom", date: 30, key: "sunday" }
];

function currentDayIndex() {
  return (new Date().getDay() + 6) % 7;
}

function timeToMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isCurrentTimeSlot(start, end) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(start);
  let endMinutes = timeToMinutes(end);
  if (end === "00:00") endMinutes = 24 * 60;
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

const statusPattern = ["ready", "draft", "ready", "ready", "draft", "empty", "ready", "ready", "draft", "ready", "empty", "ready", "ready", "draft"];
const statusText = { ready: "Lista", draft: "En edición", empty: "Sin pauta" };
let selectedDay = 4;
let selectedProgramIndex = null;

const viewButtons = document.querySelectorAll("[data-view-button]");
viewButtons.forEach((button) => button.addEventListener("click", () => {
  const view = button.dataset.viewButton;
  viewButtons.forEach((item) => item.classList.toggle("is-active", item === button));
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (view === "superadmin") window.setTimeout(centerSelectedRoute, 0);
}));

function renderDayTabs() {
  const container = document.querySelector("#agenda-day-tabs");
  container.innerHTML = days.map((day, index) => `<button class="${index === selectedDay ? "is-active" : ""}" data-day-index="${index}">${day.short} ${day.date}</button>`).join("");
  const activeDay = container.querySelector(".is-active");
  container.scrollLeft = activeDay.offsetLeft - container.clientWidth / 2 + activeDay.clientWidth / 2;
  container.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    selectedDay = Number(button.dataset.dayIndex);
    selectedProgramIndex = null;
    renderDayTabs();
    renderTimeline();
    closeAgendaEditor();
  }));
}

function renderTimeline() {
  const day = days[selectedDay];
  const items = schedule[day.key];
  const filter = document.querySelector("#agenda-program-filter").value;
  const indexedItems = items.map((item, originalIndex) => ({ item, originalIndex }));
  const visible = filter === "all"
    ? indexedItems
    : filter === "managed"
      ? indexedItems.filter(({ item }) => managedProgramNames.has(item[2]))
      : indexedItems.filter(({ item }) => item[2].includes(filter));
  document.querySelector("#day-heading").textContent = `${day.short === "Vie" ? "Viernes" : day.short} ${day.date}`;
  document.querySelector("#day-program-count").textContent = `${visible.length} bloques programados`;
  document.querySelector("#agenda-timeline").innerHTML = visible.map(({ item, originalIndex }) => {
    const status = statusPattern[(originalIndex + selectedDay) % statusPattern.length];
    const managed = managedProgramNames.has(item[2]);
    const isLive = selectedDay === currentDayIndex() && isCurrentTimeSlot(item[0], item[1]);
    const badges = isLive
      ? `<span class="card-badges"><span class="live-label">Al aire ahora</span><span class="managed-label">${managed ? "En herramienta" : "Solo horario"}</span></span>`
      : managed
        ? `<span class="card-badges"><span class="managed-label">En herramienta</span><span class="status-label ${status === "draft" ? "draft" : ""}">${statusText[status]}</span></span>`
        : `<span class="card-badges"><span class="schedule-only-label">Solo horario</span></span>`;
    return `<div class="schedule-row">
      <time class="schedule-time">${item[0]}</time>
      <button class="schedule-card status-${status} ${managed ? "is-managed" : "is-schedule-only"} ${isLive ? "is-live" : ""} ${selectedProgramIndex === originalIndex ? "is-selected" : ""}" data-program-index="${originalIndex}">
        <span class="schedule-card-main"><strong>${item[2]}</strong><small>${item[3]} | ${item[0]} - ${item[1]}</small></span>
        ${badges}
      </button>
      <button class="row-actions" data-toast="Aquí se podrá mover, duplicar o desactivar el bloque">Más</button>
    </div>`;
  }).join("");
  document.querySelectorAll(".schedule-card").forEach((button) => button.addEventListener("click", () => openAgendaEditor(Number(button.dataset.programIndex))));
  wireToasts();
}

function openAgendaEditor(index) {
  selectedProgramIndex = index;
  const day = days[selectedDay];
  const item = schedule[day.key][index];
  renderTimeline();
  const editor = document.querySelector("#agenda-editor");
  editor.classList.add("is-open");
  editor.innerHTML = `<div class="editor-content">
    <header><div><span>${day.short} ${day.date} | ${item[0]} - ${item[1]}</span><h2>${item[2]}</h2></div><button class="close-editor" id="close-agenda-editor">Cerrar</button></header>
    <div class="editor-tabs"><button class="is-active" data-editor-tab="pre">Pre-pauta</button><button data-editor-tab="post">Post-pauta</button></div>
    <div class="editor-body">
      <div class="editor-meta"><span>Productor responsable</span><strong>Equipo de ${item[2]}</strong></div>
      <label class="field"><span>Pauta o escaleta original</span><textarea id="agenda-raw">Tema principal: balance de noticias del día.\nInvitado pendiente de confirmar.\nPreparar tres preguntas y contexto.</textarea></label>
      <label class="field autocomplete"><span>Invitado</span><input id="guest-input" value="" placeholder="Empieza a escribir un nombre"><div class="suggestions" id="guest-suggestions"><button type="button" data-guest="Elmer Huerta">Elmer Huerta | 24 apariciones</button><button type="button" data-guest="Fernando Carvallo">Fernando Carvallo | 18 apariciones</button></div></label>
      <button class="primary-button" id="agenda-ai-button">Ordenar con IA</button>
      <div class="ai-preview" id="agenda-ai-preview"><strong>La vista ordenada aparecerá aquí</strong><p>La propuesta identificará tema, invitado, preguntas y frases destacadas. El productor decide qué guardar.</p></div>
    </div>
    <div class="editor-actions"><button class="secondary-button" data-toast="Los cambios quedaron guardados como borrador">Guardar borrador</button><button class="primary-button" data-toast="Bloque marcado como listo para revisión">Enviar a revisión</button></div>
  </div>`;
  document.querySelector("#close-agenda-editor").addEventListener("click", closeAgendaEditor);
  document.querySelector("#agenda-ai-button").addEventListener("click", () => {
    document.querySelector("#agenda-ai-preview").innerHTML = `<strong>Propuesta de la IA</strong><p><b>Tema:</b> balance informativo y contexto para la audiencia.</p><p><b>Invitado:</b> falta confirmar nombre y cargo.</p><p><b>Preguntas:</b> qué cambió hoy, a quién afecta y qué debería observar la audiencia.</p>`;
    showToast("La IA ordenó el material. Revisa antes de guardar.");
  });
  document.querySelectorAll("[data-editor-tab]").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("[data-editor-tab]").forEach((item) => item.classList.toggle("is-active", item === button));
    const textarea = document.querySelector("#agenda-raw");
    textarea.value = button.dataset.editorTab === "post" ? "Lo que salió al aire:\n\nInvitado:\nFrase principal:\nTema emitido:\nSegmentos que no salieron:" : "Tema principal: balance de noticias del día.\nInvitado pendiente de confirmar.\nPreparar tres preguntas y contexto.";
  }));
  const guestInput = document.querySelector("#guest-input");
  const guestSuggestions = document.querySelector("#guest-suggestions");
  guestInput.addEventListener("input", () => guestSuggestions.classList.toggle("is-visible", guestInput.value.length > 0));
  guestSuggestions.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    guestInput.value = button.dataset.guest;
    guestSuggestions.classList.remove("is-visible");
  }));
  wireToasts();
}

function closeAgendaEditor() {
  const editor = document.querySelector("#agenda-editor");
  editor.classList.remove("is-open");
  selectedProgramIndex = null;
  editor.innerHTML = `<div class="editor-empty"><span class="empty-mark">RPP</span><h2>Elige un bloque</h2><p>Abre cualquier programa para pegar la pauta, ordenar con IA o completar lo que salió al aire.</p></div>`;
  renderTimeline();
}

function renderPrograms() {
  const list = document.querySelector("#program-list");
  list.innerHTML = managedCatalog.map((program, index) => `<button class="${index === 1 ? "is-active" : ""}" data-program-list-index="${index}"><strong>${program.label}</strong><span>${program.schedule}</span></button>`).join("");
  list.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    list.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
    const program = managedCatalog[Number(button.dataset.programListIndex)];
    document.querySelector("#program-title").textContent = program.label;
    document.querySelector("#program-hosts").textContent = program.hosts;
    showToast(`Vista cambiada a ${program.label}`);
  }));
}

function renderEpisodeStrip() {
  document.querySelector("#episode-strip").innerHTML = days.slice(0,5).map((day,index) => `<button class="episode-day ${index === 4 ? "is-active" : ""}"><span>${day.short.toUpperCase()} ${day.date}</span><strong>${index === 4 ? "En edición" : "Lista"}</strong><small>${index === 4 ? "2 bloques detectados" : "Post-pauta completa"}</small></button>`).join("");
  document.querySelectorAll(".episode-day").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".episode-day").forEach((item) => item.classList.toggle("is-active", item === button));
  }));
}

function renderFlowDays() {
  document.querySelector("#flow-day-strip").innerHTML = days.map((day,index) => `<button class="${index === 4 ? "is-active" : ""}"><span>${day.short} ${day.date}</span><small>${index === 4 ? "16" : "12"}</small></button>`).join("");
}

const dialog = document.querySelector("#search-dialog");
document.querySelectorAll("[data-open-search], [data-open-person]").forEach((button) => button.addEventListener("click", () => dialog.showModal()));

const bulletinDialog = document.querySelector("#bulletin-dialog");
const bulletinTitleInput = document.querySelector("#bulletin-title-input");
const bulletinBodyInput = document.querySelector("#bulletin-body-input");
const bulletinScopeInput = document.querySelector("#bulletin-scope-input");
let activeBulletinItem = null;

function openBulletinEditor(item = null) {
  activeBulletinItem = item;
  document.querySelector("#bulletin-dialog-title").textContent = item ? "Editar indicación" : "Nueva indicación";
  bulletinTitleInput.value = item?.dataset.bulletinTitle || "";
  bulletinBodyInput.value = item?.dataset.bulletinBody || "";
  bulletinScopeInput.value = item?.dataset.bulletinScope || "Todos los programas";
  bulletinDialog.showModal();
}

function wireBulletinItems() {
  document.querySelectorAll(".bulletin-item").forEach((item) => {
    if (item.dataset.editorWired) return;
    item.dataset.editorWired = "true";
    item.addEventListener("click", () => openBulletinEditor(item));
  });
}

document.querySelector("#add-bulletin-button").addEventListener("click", () => openBulletinEditor());
document.querySelector("#save-bulletin-button").addEventListener("click", () => {
  const title = bulletinTitleInput.value.trim();
  const body = bulletinBodyInput.value.trim();
  if (!title || !body) {
    showToast("Completa el título y el detalle de la indicación.");
    return;
  }
  const item = activeBulletinItem || document.createElement("button");
  item.className = "bulletin-item";
  item.dataset.bulletinTitle = title;
  item.dataset.bulletinBody = body;
  item.dataset.bulletinScope = bulletinScopeInput.value;
  item.innerHTML = "";
  const copy = document.createElement("span");
  const heading = document.createElement("strong");
  const scope = document.createElement("small");
  heading.textContent = title;
  copy.append(heading, document.createTextNode(body));
  scope.textContent = bulletinScopeInput.value;
  item.append(copy, scope);
  if (!activeBulletinItem) document.querySelector("#bulletin-list").append(item);
  wireBulletinItems();
  bulletinDialog.close();
  showToast(activeBulletinItem ? "Indicación actualizada." : "Nueva indicación añadida al tablero.");
});

const dateDialog = document.querySelector("#date-programming-dialog");
const importantDateInput = document.querySelector("#important-date-input");
const importantDateTitleInput = document.querySelector("#important-date-title-input");
const importantDateDetailsInput = document.querySelector("#important-date-details-input");
const datePlans = new Map([
  ["2026-08-28", { "Encendidos": "Explicar el cierre y preparar preguntas para especialistas.", "La Rotativa del Aire | Edición Noche": "Resumen de la jornada y reacciones." }],
  ["2026-08-30", { "La Rotativa de fin de Semana | Domingo": "Enlaces desde el santuario y plan de tránsito.", "La Rotativa del Aire | Domingo Noche": "Balance de incidencias y asistencia." }]
]);
let activeDateItem = null;

function scheduleKeyForDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 0) return "sunday";
  if (weekday === 6) return "saturday";
  return "weekday";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
}

function renderDatePrograms(value) {
  if (!value) return;
  const items = schedule[scheduleKeyForDate(value)];
  const saved = datePlans.get(value) || {};
  document.querySelector("#date-program-count").textContent = `${items.length} bloques del día`;
  document.querySelector("#date-program-list").innerHTML = items.map((item, index) => {
    const note = saved[item[2]] || "";
    const availability = managedProgramNames.has(item[2]) ? "En herramienta" : "Solo horario";
    return `<label class="planning-program-row"><input type="checkbox" data-plan-program="${escapeHtml(item[2])}" ${note ? "checked" : ""}><time>${item[0]}</time><strong>${escapeHtml(item[2])}<small>${availability}</small></strong><input type="text" value="${escapeHtml(note)}" placeholder="Tema, invitado o cobertura" aria-label="Plan para ${escapeHtml(item[2])}"></label>`;
  }).join("");
}

function openDateEditor(item = null) {
  activeDateItem = item;
  const value = item?.dataset.date || "2026-08-31";
  importantDateInput.value = value;
  importantDateTitleInput.value = item?.dataset.dateTitle || "";
  importantDateDetailsInput.value = item?.dataset.dateDetails || "";
  document.querySelector("#date-dialog-title").textContent = item ? item.dataset.dateTitle : "Nueva fecha importante";
  renderDatePrograms(value);
  dateDialog.showModal();
}

function wireDateItems() {
  document.querySelectorAll(".date-row").forEach((item) => {
    if (item.dataset.editorWired) return;
    item.dataset.editorWired = "true";
    item.addEventListener("click", () => openDateEditor(item));
  });
}

function formatDateBadge(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "short" }).format(new Date(year, month - 1, day)).replace(".", "").toUpperCase();
}

importantDateInput.addEventListener("change", () => renderDatePrograms(importantDateInput.value));
document.querySelector("#add-date-button").addEventListener("click", () => openDateEditor());
document.querySelector("#save-date-button").addEventListener("click", () => {
  const value = importantDateInput.value;
  const title = importantDateTitleInput.value.trim();
  if (!value || !title) {
    showToast("Completa la fecha y su nombre.");
    return;
  }
  const plan = {};
  document.querySelectorAll(".planning-program-row").forEach((row) => {
    const checkbox = row.querySelector("[data-plan-program]");
    const note = row.querySelector('input[type="text"]').value.trim();
    if (checkbox.checked || note) plan[checkbox.dataset.planProgram] = note;
  });
  datePlans.set(value, plan);
  const item = activeDateItem || document.createElement("button");
  item.className = "date-row";
  item.dataset.date = value;
  item.dataset.dateTitle = title;
  item.dataset.dateDetails = importantDateDetailsInput.value.trim();
  item.innerHTML = `<time datetime="${value}">${formatDateBadge(value)}</time><span><strong></strong>Planificar los programas de ese día</span><b>Abrir</b>`;
  item.querySelector("strong").textContent = title;
  if (!activeDateItem) document.querySelector("#dates-list").append(item);
  wireDateItems();
  dateDialog.close();
  showToast(activeDateItem ? "Fecha y programación actualizadas." : "Fecha añadida al calendario editorial.");
});

document.querySelector("#program-ai-button").addEventListener("click", () => showToast("Material ordenado. La propuesta queda lista para revisión."));
document.querySelectorAll("[data-state-tabs] button").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-state-tabs] button").forEach((item) => item.classList.toggle("is-active", item === button));
  showToast(button.dataset.state === "post" ? "Ahora estás documentando lo que salió al aire." : "Ahora estás preparando la emisión.");
}));

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function wireToasts() {
  document.querySelectorAll("[data-toast]").forEach((button) => {
    if (button.dataset.toastWired) return;
    button.dataset.toastWired = "true";
    button.addEventListener("click", () => showToast(button.dataset.toast));
  });
}

document.querySelector("#agenda-program-filter").addEventListener("change", renderTimeline);
document.querySelector("#new-block-button").addEventListener("click", () => showToast("Aquí se abrirá el alta modular de un programa o bloque especial."));
document.querySelectorAll("[data-week-shift]").forEach((button) => button.addEventListener("click", () => showToast(button.dataset.weekShift === "1" ? "Semana siguiente" : "Semana anterior")));
document.querySelectorAll(".board-item").forEach((item) => item.addEventListener("click", (event) => {
  if (event.target.closest("[data-open-person]")) return;
  showToast(`Abrir edición de ${item.dataset.editShow}`);
}));

const receptionTarget = document.querySelector("#reception-target");
const previewProgram = document.querySelector("#preview-program");
const previewTime = document.querySelector("#preview-time");

function syncReceptionDestination(time, program) {
  previewProgram.textContent = program;
  const slot = schedule.weekday.find((item) => item[0] === time && item[2] === program);
  previewTime.textContent = `Viernes 28 | ${time}${slot ? ` - ${slot[1]}` : ""}`;
  const exactTarget = `${time} | ${program}`;
  const matchingOption = [...receptionTarget.options].find((option) => option.textContent === exactTarget);
  if (matchingOption) receptionTarget.value = matchingOption.value;
}

function markCurrentRouteBlock() {
  const today = days[currentDayIndex()];
  const liveSlot = schedule[today.key].find((item) => isCurrentTimeSlot(item[0], item[1]));
  document.querySelectorAll(".route-block").forEach((button) => {
    button.classList.toggle("live-route", Boolean(liveSlot && button.dataset.routeProgram === liveSlot[2]));
    const status = button.querySelector("span").lastChild;
    if (button.classList.contains("live-route") && status) status.textContent = "Al aire ahora";
  });
}

function centerSelectedRoute() {
  const list = document.querySelector(".route-list");
  const selected = list.querySelector(".route-block.is-selected");
  if (!selected || !list.clientWidth) return;
  list.scrollLeft = selected.offsetLeft - (list.clientWidth - selected.clientWidth) / 2;
}

document.querySelectorAll(".route-block").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll(".route-block").forEach((item) => item.classList.toggle("is-selected", item === button));
  syncReceptionDestination(button.dataset.routeTime, button.dataset.routeProgram);
}));

receptionTarget.addEventListener("change", () => {
  const [time, ...programParts] = receptionTarget.value.split(" | ");
  syncReceptionDestination(time, programParts.join(" | "));
});

document.querySelector("#format-reception-button").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const message = document.querySelector("#reception-message").value.trim();
  if (!message) {
    showToast("Pega primero el mensaje que recibiste.");
    return;
  }
  button.disabled = true;
  button.textContent = "Ordenando contenido";
  document.querySelector("#reception-preview").classList.add("is-processing");
  window.setTimeout(() => {
    button.disabled = false;
    button.textContent = "Formatear de nuevo";
    document.querySelector("#reception-preview").classList.remove("is-processing");
    document.querySelector(".preview-status").textContent = "Lista para revisar";
    showToast("Mensaje ordenado. Revisa la propuesta antes de crear la pre-pauta.");
  }, 550);
});

document.querySelector("#confirm-reception-button").addEventListener("click", (event) => {
  event.currentTarget.textContent = "Pre-pauta creada";
  event.currentTarget.disabled = true;
  document.querySelector(".preview-status").textContent = "Guardada";
  showToast("La pre-pauta quedó ubicada en el bloque elegido.");
});

renderDayTabs();
renderTimeline();
renderPrograms();
renderEpisodeStrip();
renderFlowDays();
markCurrentRouteBlock();
wireBulletinItems();
wireDateItems();
wireToasts();
