const STORAGE_KEY = "training-log-v1";
const todayIso = () => new Date().toISOString().slice(0, 10);

const state = loadState();
const els = {};
let deferredPrompt = null;

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  bindNavigation();
  bindForms();
  bindDataActions();
  setDefaults();
  renderAll();
  registerServiceWorker();
});

function cacheElements() {
  [
    "todayPicker",
    "weeklyCards",
    "trendMetric",
    "trendChart",
    "loadHighlights",
    "checkinForm",
    "hungerValue",
    "energyValue",
    "checkinList",
    "clearCheckins",
    "workoutForm",
    "exerciseRows",
    "addExercise",
    "workoutList",
    "clearWorkouts",
    "weekCount",
    "weeklyTable",
    "exerciseFilter",
    "loadChart",
    "exportJson",
    "exportCsv",
    "importJson",
    "installButton",
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      checkins: Array.isArray(parsed?.checkins) ? parsed.checkins : [],
      workouts: Array.isArray(parsed?.workouts) ? parsed.workouts : [],
    };
  } catch {
    return { checkins: [], workouts: [] };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setDefaults() {
  const today = todayIso();
  els.todayPicker.value = today;
  els.checkinForm.elements.date.value = today;
  els.workoutForm.elements.date.value = today;
  addExerciseRow({ name: "Squat", sets: 3, reps: 5, load: "" });
}

function bindNavigation() {
  document.querySelectorAll("[data-tab], [data-open-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      openScreen(button.dataset.tab || button.dataset.openScreen);
    });
  });
}

function openScreen(screenName) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === screenName);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.tab === screenName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  renderAll();
}

function bindForms() {
  ["hunger", "energy"].forEach((name) => {
    const input = els.checkinForm.elements[name];
    const output = document.getElementById(`${name}Value`);
    input.addEventListener("input", () => {
      output.textContent = input.value;
    });
  });

  els.checkinForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.checkinForm).entries());
    const checkin = {
      id: crypto.randomUUID(),
      date: data.date,
      weight: numberOrNull(data.weight),
      waist: numberOrNull(data.waist),
      hunger: numberOrNull(data.hunger),
      energy: numberOrNull(data.energy),
      sleep: numberOrNull(data.sleep),
      adherence: clamp(numberOrNull(data.adherence), 0, 100),
      notes: data.notes.trim(),
    };
    state.checkins = state.checkins.filter((item) => item.date !== checkin.date);
    state.checkins.push(checkin);
    saveState();
    renderAll();
  });

  els.addExercise.addEventListener("click", () => addExerciseRow());

  els.workoutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.workoutForm).entries());
    const exercises = readExerciseRows();
    const workout = {
      id: crypto.randomUUID(),
      date: data.date,
      title: data.title.trim() || "Allenamento",
      duration: numberOrNull(data.duration),
      rpe: numberOrNull(data.rpe),
      notes: data.notes.trim(),
      exercises,
    };
    state.workouts.push(workout);
    saveState();
    els.workoutForm.reset();
    els.workoutForm.elements.date.value = todayIso();
    els.exerciseRows.innerHTML = "";
    addExerciseRow();
    renderAll();
  });

  els.clearCheckins.addEventListener("click", () => {
    if (confirm("Cancellare tutti i check-in?")) {
      state.checkins = [];
      saveState();
      renderAll();
    }
  });

  els.clearWorkouts.addEventListener("click", () => {
    if (confirm("Cancellare tutti gli allenamenti?")) {
      state.workouts = [];
      saveState();
      renderAll();
    }
  });

  els.trendMetric.addEventListener("change", renderTrendChart);
  els.weekCount.addEventListener("change", renderWeeklyTable);
  els.exerciseFilter.addEventListener("change", renderLoadChart);
}

function bindDataActions() {
  els.exportJson.addEventListener("click", () => {
    download("training-log-backup.json", JSON.stringify(state, null, 2), "application/json");
  });

  els.exportCsv.addEventListener("click", () => {
    const rows = [
      ["type", "date", "name", "weight", "waist", "hunger", "energy", "sleep", "adherence", "exercise", "sets", "reps", "load", "notes"],
      ...state.checkins.map((item) => [
        "checkin",
        item.date,
        "",
        item.weight,
        item.waist,
        item.hunger,
        item.energy,
        item.sleep,
        item.adherence,
        "",
        "",
        "",
        "",
        item.notes,
      ]),
      ...state.workouts.flatMap((workout) =>
        (workout.exercises.length ? workout.exercises : [{}]).map((exercise) => [
          "workout",
          workout.date,
          workout.title,
          "",
          "",
          "",
          "",
          "",
          "",
          exercise.name || "",
          exercise.sets || "",
          exercise.reps || "",
          exercise.load || "",
          workout.notes,
        ])
      ),
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    download("training-log.csv", csv, "text/csv");
  });

  els.importJson.addEventListener("change", async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    const incoming = JSON.parse(await file.text());
    if (!Array.isArray(incoming.checkins) || !Array.isArray(incoming.workouts)) {
      alert("File non valido.");
      return;
    }
    state.checkins = incoming.checkins;
    state.workouts = incoming.workouts;
    saveState();
    renderAll();
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    els.installButton.hidden = false;
  });

  els.installButton.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    els.installButton.hidden = true;
  });
}

function addExerciseRow(value = {}) {
  const row = document.createElement("div");
  row.className = "exercise-row";
  row.innerHTML = `
    <label>Nome<input name="exerciseName" type="text" value="${escapeAttr(value.name || "")}" placeholder="Panca piana" /></label>
    <label>Serie<input name="sets" type="text" inputmode="numeric" value="${escapeAttr(value.sets || "")}" placeholder="4" /></label>
    <label>Rep<input name="reps" type="text" inputmode="numeric" value="${escapeAttr(value.reps || "")}" placeholder="8" /></label>
    <label>Kg<input name="load" type="text" inputmode="decimal" value="${escapeAttr(value.load || "")}" placeholder="100" /></label>
    <button type="button" title="Rimuovi riga">x</button>
  `;
  row.querySelector("button").addEventListener("click", () => {
    row.remove();
    if (!els.exerciseRows.children.length) addExerciseRow();
  });
  els.exerciseRows.appendChild(row);
}

function readExerciseRows() {
  return [...els.exerciseRows.querySelectorAll(".exercise-row")]
    .map((row) => ({
      name: row.querySelector('[name="exerciseName"]').value.trim(),
      sets: numberOrNull(row.querySelector('[name="sets"]').value),
      reps: numberOrNull(row.querySelector('[name="reps"]').value),
      load: numberOrNull(row.querySelector('[name="load"]').value),
    }))
    .filter((exercise) => exercise.name || exercise.load || exercise.sets || exercise.reps);
}

function renderAll() {
  sortState();
  renderWeeklyCards();
  renderTrendChart();
  renderLoadHighlights();
  renderCheckins();
  renderWorkouts();
  renderWeeklyTable();
  renderExerciseFilter();
  renderLoadChart();
}

function sortState() {
  state.checkins.sort((a, b) => b.date.localeCompare(a.date));
  state.workouts.sort((a, b) => b.date.localeCompare(a.date));
}

function renderWeeklyCards() {
  const week = currentWeekItems();
  const metrics = [
    ["Peso medio", avg(week.map((i) => i.weight)), "kg", "weight"],
    ["Vita media", avg(week.map((i) => i.waist)), "cm", "waist"],
    ["Fame", avg(week.map((i) => i.hunger)), "/10", "hunger"],
    ["Energia", avg(week.map((i) => i.energy)), "/10", "energy"],
    ["Sonno medio", avg(week.map((i) => i.sleep)), "h", "sleep"],
    ["Dieta", avg(week.map((i) => i.adherence)), "%", "adherence"],
  ];
  els.weeklyCards.innerHTML = metrics
    .map(([label, value, unit, key]) => {
      const previous = previousWeekAverage(key);
      const delta = value == null || previous == null ? "" : `${formatDelta(value - previous)} vs scorsa sett.`;
      return `<article class="metric-card"><span>${label}</span><strong>${formatValue(value)}${value == null ? "" : unit}</strong><small>${delta || "In attesa di dati"}</small></article>`;
    })
    .join("");
}

function renderTrendChart() {
  const metric = els.trendMetric.value;
  const points = state.checkins
    .slice()
    .reverse()
    .filter((item) => daysBetween(item.date, todayIso()) <= 30 && item[metric] != null)
    .map((item) => ({ label: item.date.slice(5), value: item[metric] }));
  drawLineChart(els.trendChart, points, metric === "adherence" ? "%" : "");
}

function renderLoadHighlights() {
  const best = bestLoadsByExercise().slice(0, 5);
  els.loadHighlights.innerHTML = best.length
    ? best
        .map(
          (item) => `
          <div class="load-item">
            <div><strong>${escapeHtml(item.name)}</strong><small>${item.date} · ${item.sets || "-"}x${item.reps || "-"}</small></div>
            <span class="pill">${formatValue(item.load)} kg</span>
          </div>`
        )
        .join("")
    : `<div class="empty">Aggiungi un allenamento per vedere i carichi chiave.</div>`;
}

function renderCheckins() {
  els.checkinList.innerHTML = state.checkins.length
    ? state.checkins
        .slice(0, 14)
        .map(
          (item) => `
          <div class="timeline-item">
            <div>
              <strong>${formatDate(item.date)}</strong>
              <small>Peso ${formatValue(item.weight)} kg · Vita ${formatValue(item.waist)} cm · Sonno ${formatValue(item.sleep)} h</small>
            </div>
            <span class="pill">${formatValue(item.adherence)}%</span>
          </div>`
        )
        .join("")
    : `<div class="empty">Nessun check-in salvato.</div>`;
}

function renderWorkouts() {
  els.workoutList.innerHTML = state.workouts.length
    ? state.workouts
        .slice(0, 12)
        .map((workout) => {
          const summary = workout.exercises
            .slice(0, 3)
            .map((exercise) => `${escapeHtml(exercise.name || "Esercizio")} ${formatValue(exercise.load)}kg`)
            .join(" · ");
          return `
            <div class="timeline-item">
              <div>
                <strong>${escapeHtml(workout.title)} · ${formatDate(workout.date)}</strong>
                <small>${summary || "Nessun esercizio"}${workout.duration ? ` · ${workout.duration} min` : ""}</small>
              </div>
              <span class="pill">RPE ${formatValue(workout.rpe)}</span>
            </div>`;
        })
        .join("")
    : `<div class="empty">Nessun allenamento salvato.</div>`;
}

function renderWeeklyTable() {
  const weeks = weeklyBuckets(Number(els.weekCount.value));
  els.weeklyTable.innerHTML = weeks
    .map(
      (week) => `
      <tr>
        <td>${week.label}</td>
        <td>${formatValue(avg(week.items.map((i) => i.weight)))}</td>
        <td>${formatValue(avg(week.items.map((i) => i.waist)))}</td>
        <td>${formatValue(avg(week.items.map((i) => i.hunger)))}</td>
        <td>${formatValue(avg(week.items.map((i) => i.energy)))}</td>
        <td>${formatValue(avg(week.items.map((i) => i.sleep)))}</td>
        <td>${formatValue(avg(week.items.map((i) => i.adherence)))}</td>
      </tr>`
    )
    .join("");
}

function renderExerciseFilter() {
  const selected = els.exerciseFilter.value;
  const names = [...new Set(state.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.name).filter(Boolean)))].sort();
  els.exerciseFilter.innerHTML = names.length
    ? names.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join("")
    : `<option value="">Nessun esercizio</option>`;
  if (names.includes(selected)) els.exerciseFilter.value = selected;
}

function renderLoadChart() {
  const name = els.exerciseFilter.value;
  const points = state.workouts
    .slice()
    .reverse()
    .flatMap((workout) =>
      workout.exercises
        .filter((exercise) => exercise.name === name && exercise.load != null)
        .map((exercise) => ({ label: workout.date.slice(5), value: exercise.load }))
    );
  drawLineChart(els.loadChart, points, "kg");
}

function currentWeekItems() {
  const now = new Date(`${todayIso()}T12:00:00`);
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return state.checkins.filter((item) => {
    const date = new Date(`${item.date}T12:00:00`);
    return date >= start && date < end;
  });
}

function previousWeekAverage(key) {
  const now = new Date(`${todayIso()}T12:00:00`);
  const start = startOfWeek(now);
  const prevStart = new Date(start);
  prevStart.setDate(start.getDate() - 7);
  const prevEnd = start;
  return avg(
    state.checkins
      .filter((item) => {
        const date = new Date(`${item.date}T12:00:00`);
        return date >= prevStart && date < prevEnd;
      })
      .map((item) => item[key])
  );
}

function weeklyBuckets(count) {
  const current = startOfWeek(new Date(`${todayIso()}T12:00:00`));
  return Array.from({ length: count }, (_, index) => {
    const start = new Date(current);
    start.setDate(current.getDate() - index * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const items = state.checkins.filter((item) => {
      const date = new Date(`${item.date}T12:00:00`);
      return date >= start && date < end;
    });
    return { label: `${toShortDate(start)} - ${toShortDate(addDays(end, -1))}`, items };
  });
}

function startOfWeek(date) {
  const next = new Date(date);
  const day = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - day);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function bestLoadsByExercise() {
  const best = new Map();
  state.workouts.forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (!exercise.name || exercise.load == null) return;
      const current = best.get(exercise.name);
      if (!current || exercise.load > current.load) {
        best.set(exercise.name, { ...exercise, date: workout.date });
      }
    });
  });
  return [...best.values()].sort((a, b) => b.load - a.load);
}

function drawLineChart(canvas, points, suffix) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(rect.width, 320);
  const height = Number(canvas.getAttribute("height"));
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fbfcfc";
  ctx.fillRect(0, 0, width, height);

  if (points.length < 2) {
    ctx.fillStyle = "#64707d";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Servono almeno due dati per il grafico", width / 2, height / 2);
    return;
  }

  const padding = { top: 18, right: 16, bottom: 34, left: 38 };
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const x = (index) => padding.left + (index / (points.length - 1)) * (width - padding.left - padding.right);
  const y = (value) => padding.top + (1 - (value - min) / range) * (height - padding.top - padding.bottom);

  ctx.strokeStyle = "#d8dee5";
  ctx.lineWidth = 1;
  [0, 0.5, 1].forEach((ratio) => {
    const yy = padding.top + ratio * (height - padding.top - padding.bottom);
    ctx.beginPath();
    ctx.moveTo(padding.left, yy);
    ctx.lineTo(width - padding.right, yy);
    ctx.stroke();
  });

  ctx.strokeStyle = "#0f766e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(x(index), y(point.value));
    else ctx.lineTo(x(index), y(point.value));
  });
  ctx.stroke();

  ctx.fillStyle = "#0b554f";
  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(x(index), y(point.value), 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#64707d";
  ctx.font = "12px system-ui";
  ctx.textAlign = "left";
  ctx.fillText(`${formatValue(max)}${suffix}`, 6, padding.top + 4);
  ctx.fillText(`${formatValue(min)}${suffix}`, 6, height - padding.bottom);
  ctx.textAlign = "center";
  ctx.fillText(points[0].label, padding.left, height - 10);
  ctx.fillText(points[points.length - 1].label, width - padding.right - 12, height - 10);
}

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  if (value == null) return null;
  return Math.min(max, Math.max(min, value));
}

function avg(values) {
  const numbers = values.filter((value) => value != null && Number.isFinite(value));
  if (!numbers.length) return null;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

function formatValue(value) {
  if (value == null || !Number.isFinite(value)) return "-";
  return Number(value.toFixed(1)).toLocaleString("it-IT");
}

function formatDelta(value) {
  if (!Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatValue(value)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function toShortDate(value) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" }).format(value);
}

function daysBetween(from, to) {
  return Math.abs((new Date(`${to}T12:00:00`) - new Date(`${from}T12:00:00`)) / 86400000);
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
