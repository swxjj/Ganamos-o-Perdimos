"use strict";

const $ = (id) => document.getElementById(id);
const state = {
  meta: null,
  data: null,
  view: "real",
  request: 0,
  controller: null,
  suggestion: null,
};
const number = (value, digits = 1) =>
  new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
const percent = (value) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${number(Math.abs(value))}%`;
const month = (value) =>
  new Date(value.slice(0, 10) + "T00:00:00").toLocaleDateString("es-AR", {
    month: "short",
    year: "numeric",
  });
const sectors = {
  privado: "Sector privado",
  publico: "Sector público",
  informal: "Trabajo no registrado",
  general: "Promedio general",
};
const escapeHTML = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const selected = (name) =>
  document.querySelector(`input[name="${name}"]:checked`)?.value;
const selectedMonth = () =>
  `${$("select-anio").value}-${$("select-mes").value}`;
const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function showState(name) {
  for (const id of ["empty-state", "loading-state", "error-state", "results"])
    $(id).hidden = id !== name;
  $("output").setAttribute("aria-busy", String(name === "loading-state"));
}

async function getJSON(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("No pudimos consultar la fuente de datos.");
  const data = await response.json();
  if (data.error)
    throw new Error(
      "La fuente no pudo completar esta consulta. Probá con un mes anterior.",
    );
  return data;
}

async function loadMeta() {
  $("retry-meta").hidden = true;
  $("meta-status").textContent = "Buscando las fechas disponibles…";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const meta = await getJSON("/api/index", controller.signal);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(meta.fecha_min) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(meta.fecha_max) ||
      !meta.ponderaciones
    )
      throw new Error("Datos incompletos.");
    state.meta = meta;
    const min = meta.fecha_min.slice(0, 7),
      max = meta.fecha_max.slice(0, 7);
    $("select-anio").replaceChildren();
    for (let year = +max.slice(0, 4); year >= +min.slice(0, 4); year--)
      $("select-anio").add(new Option(year, year));
    // Preserve the original default: four years before the latest available date.
    const initial = `${+max.slice(0, 4) - 4}${max.slice(4)}`;
    const date = initial < min ? min : initial;
    $("select-anio").value = date.slice(0, 4);
    populateMonths(date.slice(5, 7));
    $("date-fields").disabled = false;
    $("calculate").disabled = false;
    $("meta-status").textContent =
      "Fuente: INDEC · El cálculo usa el último mes disponible en ambas series.";
    document.querySelectorAll("[data-date]").forEach((button) => {
      button.disabled = button.dataset.date < min || button.dataset.date > max;
    });
    updatePresets();
    updateEstimate();
  } catch (error) {
    $("meta-status").textContent =
      "No pudimos cargar las fechas. Revisá tu conexión y volvé a intentar.";
    $("retry-meta").hidden = false;
  } finally {
    clearTimeout(timeout);
  }
}

function populateMonths(preferred = $("select-mes").value) {
  const year = $("select-anio").value;
  const min = state.meta.fecha_min.slice(0, 7),
    max = state.meta.fecha_max.slice(0, 7);
  $("select-mes").replaceChildren();
  months.forEach((name, index) => {
    const value = String(index + 1).padStart(2, "0");
    if (`${year}-${value}` >= min && `${year}-${value}` <= max)
      $("select-mes").add(new Option(name, value));
  });
  if ([...$("select-mes").options].some((option) => option.value === preferred))
    $("select-mes").value = preferred;
}

function updatePresets() {
  document
    .querySelectorAll("[data-date]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.date === selectedMonth()),
      ),
    );
}

function inputsChanged() {
  // Cancel in-flight requests so an older selection can never replace the current result.
  state.request++;
  state.controller?.abort();
  state.data = null;
  showState("empty-state");
  $("calculate").querySelector("span").textContent = "Ver resultado";
  $("result-status").textContent = "";
  updatePresets();
}

async function analyze() {
  if (!state.meta || !$("analysis-form").reportValidity()) return;
  const request = ++state.request;
  state.controller?.abort();
  const controller = new AbortController();
  state.controller = controller;
  const timeout = setTimeout(() => controller.abort(), 45000);
  const query = new URLSearchParams({
    clase: selected("clase"),
    salario: selected("salario"),
    fecha: selectedMonth() + "-01",
  });
  showState("loading-state");
  $("calculate").querySelector("span").textContent = "Consultando…";
  try {
    const data = await getJSON(`/api/index?${query}`, controller.signal);
    if (request !== state.request) return;
    if (
      !Array.isArray(data.fechas) ||
      !data.fechas.length ||
      !Number.isFinite(data.ultimo_isr) ||
      !["ipc", "isal", "isr"].every(
        (key) =>
          Array.isArray(data[key]) &&
          data[key].length === data.fechas.length &&
          data[key].every(Number.isFinite),
      )
    ) {
      throw new Error(
        "No hay una serie completa para ese período. Probá con un mes anterior.",
      );
    }
    state.data = data;
    renderResults();
    showState("results");
    $("calculate").querySelector("span").textContent = "Volver a calcular";
    $("result-status").textContent =
      `${$("verdict").textContent} ${$("result-number").textContent} de poder de compra.`;
    // This movement follows an explicit submit, never a change of a filter.
    $("verdict").focus({ preventScroll: true });
    if (matchMedia("(max-width: 760px)").matches)
      $("output").scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  } catch (error) {
    if (request !== state.request) return;
    $("error-detail").textContent =
      error.name === "AbortError"
        ? "La consulta está tardando demasiado. Volvé a intentar en un momento."
        : error.message || "Revisá tu conexión e intentá de nuevo.";
    showState("error-state");
    $("calculate").querySelector("span").textContent = "Ver resultado";
  } finally {
    clearTimeout(timeout);
  }
}

function renderResults() {
  const data = state.data;
  const delta = data.ultimo_isr - 100;
  // Match the verdict to the displayed precision, avoiding “Perdimos −0,0%”.
  const rounded =
    (Math.sign(delta) * Math.round((Math.abs(delta) + 1e-9) * 10)) / 10;
  const last = data.fechas.length - 1;
  const start = month(data.fechas[0]),
    end = month(data.fecha_datos || data.fechas[last]);
  $("results-context").textContent =
    `Clase ${data.clase.toLowerCase()} / ${sectors[data.salario_key]}`;
  $("verdict").textContent =
    rounded > 0 ? "Ganamos." : rounded < 0 ? "Perdimos." : "Quedamos a mano.";
  $("result-number").textContent = percent(rounded);
  $("result-number").className =
    "result-number " +
    (rounded > 0 ? "gain" : rounded < 0 ? "loss" : "neutral");
  $("result-explanation").textContent =
    `Por cada $100 de poder de compra al inicio, al final del período tenés $${number(data.ultimo_isr, 0)}.`;
  $("result-period").textContent =
    `De ${start} a ${end} · Último mes con datos compartidos.`;
  $("salary-total").textContent = percent(data.isal[last] - 100);
  $("price-total").textContent = percent(data.ipc[last] - 100);
  $("salary-total").previousElementSibling.textContent =
    data.isal[last] < 100 ? "Los sueldos bajaron" : "Los sueldos subieron";
  $("price-total").previousElementSibling.textContent =
    data.ipc[last] < 100 ? "Los precios bajaron" : "Los precios subieron";
  const windowSize = Math.min(6, last);
  $("trend").hidden = windowSize === 0;
  if (windowSize) {
    const difference = data.isr[last] - data.isr[last - windowSize];
    $("trend").textContent =
      `En los últimos ${windowSize} ${windowSize === 1 ? "mes" : "meses"}, el índice de poder de compra ${difference > 0 ? "subió" : difference < 0 ? "bajó" : "no cambió"}${difference === 0 ? "" : ` ${number(Math.abs(difference))} puntos`}.`;
  }
  $("data-table").innerHTML = data.fechas
    .map(
      (date, index) =>
        `<tr><th scope="row">${escapeHTML(month(date))}</th><td>${number(data.isr[index])}</td><td>${number(data.isal[index])}</td><td>${number(data.ipc[index])}</td></tr>`,
    )
    .join("");
  renderBasket();
  renderChart();
}

function renderBasket() {
  const weights = state.meta.ponderaciones[state.data.clase] || {};
  $("basket-bars").innerHTML = Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .map(([name, weight]) => {
      const width = Math.max(0, Math.min(100, weight * 100));
      return `<div class="basket-row"><div class="basket-label"><span>${escapeHTML(name)}</span><strong>${number(weight * 100)}%</strong></div><div class="basket-track" aria-hidden="true"><div class="basket-fill" style="width:${width}%"></div></div></div>`;
    })
    .join("");
}

// Native SVG: no CDN or chart library required. The table exposes every value to
// keyboard and screen-reader users; SVG titles provide pointer inspection.
function chartSVG(width = 720, height = 290, exporting = false) {
  const data = state.data;
  const components = state.view === "components";
  const sets = components
    ? [
        { values: data.isal, name: "Sueldos", color: "#285a86", dash: "" },
        { values: data.ipc, name: "Precios", color: "#b63825", dash: "7 4" },
      ]
    : [
        {
          values: data.isr,
          name: "Poder de compra",
          color: "#20231f",
          dash: "",
        },
      ];
  const values = sets.flatMap((set) => set.values).concat(100);
  const lowest = Math.min(...values),
    highest = Math.max(...values);
  const padding = Math.max((highest - lowest) * 0.13, 2);
  const lower = Math.max(0, lowest - padding),
    upper = highest + padding;
  const left = 54,
    right = 22,
    top = 20,
    bottom = 42;
  const plotWidth = width - left - right,
    plotHeight = height - top - bottom;
  const x = (index) =>
    left +
    (data.fechas.length === 1
      ? plotWidth / 2
      : (index / (data.fechas.length - 1)) * plotWidth);
  const y = (value) => top + ((upper - value) / (upper - lower)) * plotHeight;
  const fontSize = width < 500 ? 11 : 12;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-description"><title id="chart-title">${components ? "Evolución de sueldos y precios" : "Evolución del poder de compra"}</title><desc id="chart-description">De ${escapeHTML(month(data.fechas[0]))} a ${escapeHTML(month(data.fechas.at(-1)))}. Todos los índices empiezan en 100. Los valores mensuales están disponibles en la tabla debajo del gráfico.</desc><g font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" fill="#62665f">`;
  for (let tick = 0; tick <= 4; tick++) {
    const value = lower + ((upper - lower) * tick) / 4;
    svg += `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" stroke="#d9dcd3" stroke-width="1"/><text x="${left - 10}" y="${y(value) + 4}" text-anchor="end">${number(value, 0)}</text>`;
  }
  svg += `<line x1="${left}" y1="${y(100)}" x2="${width - right}" y2="${y(100)}" stroke="#777e73" stroke-dasharray="3 4"/>`;
  const maxTicks = width < 500 ? 3 : 5;
  const ticks = [
    ...new Set(
      Array.from(
        { length: Math.min(maxTicks, data.fechas.length) },
        (_, index) =>
          Math.round(
            (index * (data.fechas.length - 1)) /
              Math.max(1, Math.min(maxTicks, data.fechas.length) - 1),
          ),
      ),
    ),
  ];
  for (const index of ticks)
    svg += `<text x="${x(index)}" y="${height - 12}" text-anchor="${index === 0 ? "start" : index === data.fechas.length - 1 ? "end" : "middle"}">${escapeHTML(month(data.fechas[index]))}</text>`;
  for (const set of sets) {
    const points = set.values
      .map((value, index) => `${x(index)},${y(value)}`)
      .join(" ");
    svg += `<polyline points="${points}" fill="none" stroke="${set.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" ${set.dash ? `stroke-dasharray="${set.dash}"` : ""}/>`;
    set.values.forEach((value, index) => {
      if (!exporting)
        svg += `<circle cx="${x(index)}" cy="${y(value)}" r="9" fill="transparent"><title>${escapeHTML(month(data.fechas[index]))} · ${set.name}: ${number(value)}</title></circle>`;
    });
    const last = set.values.length - 1;
    svg += `<circle cx="${x(last)}" cy="${y(set.values[last])}" r="4.5" fill="${set.color}" stroke="#f4f3ed" stroke-width="2"/>`;
  }
  return svg + "</g></svg>";
}

function renderChart() {
  if (!state.data) return;
  const components = state.view === "components";
  $("view-real").setAttribute("aria-pressed", String(!components));
  $("view-components").setAttribute("aria-pressed", String(components));
  $("chart-legend").innerHTML = components
    ? '<span><i style="border-color:#285a86"></i>Sueldos</span><span><i class="dashed" style="border-color:#b63825"></i>Precios</span>'
    : '<span><i></i>Poder de compra</span><span><i class="dashed" style="border-color:#777e73"></i>Punto de partida: 100</span>';
  // The two views use a single scale each. Unlike the previous dual-axis graph,
  // salaries and prices can be compared directly without misleading crossings.
  $("chart-wrap").innerHTML = chartSVG(
    matchMedia("(max-width: 760px)").matches ? 380 : 720,
    matchMedia("(max-width: 760px)").matches ? 260 : 290,
  );
  $("chart-caption").textContent = components
    ? "Ambas líneas empiezan en 100 y usan la misma escala. Si los sueldos quedan por encima de los precios, ganamos poder de compra."
    : "100 es el punto de partida. Por encima, el sueldo alcanza para más. Por debajo, alcanza para menos.";
}

async function exportChart() {
  if (!state.data) return;
  const data = state.data;
  const svg = chartSVG(1120, 360, true);
  const url = URL.createObjectURL(
    new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 760;
    const context = canvas.getContext("2d");
    context.fillStyle = "#f4f3ed";
    context.fillRect(0, 0, 1200, 760);
    context.fillStyle = "#20231f";
    context.font = "bold 27px Arial";
    context.fillText("¿Ganamos o perdimos?", 40, 52);
    context.font = "16px Arial";
    context.fillStyle = "#62665f";
    context.fillText(
      `Clase ${data.clase.toLowerCase()} / ${sectors[data.salario_key]} / ${month(data.fechas[0])} a ${month(data.fechas.at(-1))}`,
      40,
      85,
    );
    context.fillStyle = "#20231f";
    context.font = "bold 55px Arial";
    context.fillText(
      `${$("verdict").textContent} ${$("result-number").textContent}`,
      40,
      160,
    );
    context.font = "20px Arial";
    context.fillText("de poder de compra", 40, 194);
    context.font = "16px Arial";
    context.fillText(
      `Sueldos: ${percent(data.isal.at(-1) - 100)}   /   Precios: ${percent(data.ipc.at(-1) - 100)}`,
      40,
      231,
    );
    context.font = "bold 18px Arial";
    context.fillText(
      state.view === "real"
        ? "Poder de compra · Punto de partida: 100"
        : "Sueldos (azul, línea continua) y precios (rojo, línea discontinua) · Base 100",
      40,
      281,
    );
    context.drawImage(image, 40, 301, 1120, 360);
    context.font = "14px Arial";
    context.fillStyle = "#62665f";
    context.fillText(
      "Fuente: INDEC vía datos.gob.ar · Canasta y cálculo: Ganamos o Perdimos.",
      40,
      703,
    );
    context.fillText(
      "Evolución del sector y de la canasta elegidos. No representa el sueldo exacto de cada persona.",
      40,
      730,
    );
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("No se pudo crear la imagen.");
    const downloadURL = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadURL;
    link.download = `ganamos-o-perdimos-${data.clase}-${data.salario_key}.png`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadURL), 10000);
    $("result-status").textContent = "Imagen lista para descargar.";
  } catch (_) {
    $("result-status").textContent =
      "No pudimos generar la imagen. Volvé a intentar.";
  } finally {
    URL.revokeObjectURL(url);
  }
}

function updateEstimate() {
  const income = Number($("income").value),
    people = Number($("household-size").value);
  const valid =
    income > 0 &&
    Number.isFinite(income) &&
    Number.isInteger(people) &&
    people >= 1 &&
    people <= 10;
  const base = state.meta?.canasta_max;
  state.suggestion =
    valid && Number.isFinite(base) && base > 0
      ? income / people > base * 3.5
        ? "Alta"
        : income / people < base * 1.2
          ? "Baja"
          : "Media"
      : null;
  $("estimated-class").textContent = state.suggestion || "—";
  $("confirm-class").disabled = !state.suggestion;
  $("estimate-note").textContent = !base
    ? "Necesitamos cargar los datos para sugerirte una canasta. También podés elegirla directamente."
    : !valid
      ? "Ingresá un monto mayor a cero y entre 1 y 10 personas."
      : "Es una orientación del proyecto, no una clasificación oficial. Podés cambiarla cuando quieras.";
}

$("analysis-form").addEventListener("submit", (event) => {
  event.preventDefault();
  analyze();
});
$("analysis-form").addEventListener("change", (event) => {
  if (event.target.id === "select-anio") populateMonths();
  inputsChanged();
  if (event.target.name === "clase") {
    try {
      localStorage.setItem("selectedClass", selected("clase"));
    } catch (_) {
      /* Storage is optional. */
    }
  }
});
document.querySelectorAll("[data-date]").forEach((button) =>
  button.addEventListener("click", () => {
    const [year, chosenMonth] = button.dataset.date.split("-");
    $("select-anio").value = year;
    populateMonths(chosenMonth);
    inputsChanged();
  }),
);
$("retry-meta").addEventListener("click", loadMeta);
$("retry-analysis").addEventListener("click", analyze);
$("view-real").addEventListener("click", () => {
  state.view = "real";
  renderChart();
});
$("view-components").addEventListener("click", () => {
  state.view = "components";
  renderChart();
});
$("export-chart").addEventListener("click", exportChart);
$("help-class").addEventListener("click", () => {
  updateEstimate();
  $("class-dialog").showModal();
});
$("close-dialog").addEventListener("click", () => $("class-dialog").close());
$("income").addEventListener("input", updateEstimate);
$("household-size").addEventListener("input", updateEstimate);
$("person-minus").addEventListener("click", () => {
  $("household-size").value = Math.max(
    1,
    (+$("household-size").value || 1) - 1,
  );
  updateEstimate();
});
$("person-plus").addEventListener("click", () => {
  $("household-size").value = Math.min(
    10,
    (+$("household-size").value || 1) + 1,
  );
  updateEstimate();
});
$("confirm-class").addEventListener("click", () => {
  if (!state.suggestion) return;
  document.querySelector(
    `input[name="clase"][value="${state.suggestion}"]`,
  ).checked = true;
  try {
    localStorage.setItem("selectedClass", state.suggestion);
  } catch (_) {
    /* Storage is optional. */
  }
  inputsChanged();
  $("class-dialog").close();
});
matchMedia("(max-width: 760px)").addEventListener("change", renderChart);
try {
  const saved = localStorage.getItem("selectedClass");
  if (["Alta", "Media", "Baja"].includes(saved))
    document.querySelector(`input[name="clase"][value="${saved}"]`).checked =
      true;
} catch (_) {
  /* Work normally in private or restricted browsing contexts. */
}
loadMeta();
