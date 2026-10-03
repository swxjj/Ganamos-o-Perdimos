// Run a static server first: python -m http.server 3000 --directory public
// Requires Playwright with Chromium: npm exec --package=playwright -- playwright install chromium
// Then: NODE_PATH=<path to playwright's node_modules> node tests/ui.cjs
// All numeric fixtures below are synthetic, used only to exercise UI states.
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const baseURL = process.env.TEST_URL || "http://127.0.0.1:3000";
const metadata = {
  fecha_min: "2016-12-01",
  fecha_max: "2026-07-01",
  canasta_max: 350000,
  ponderaciones: Object.fromEntries(
    ["Baja", "Media", "Alta"].map((name) => [
      name,
      { Alimentos: 0.4, Vivienda: 0.35, Transporte: 0.25 },
    ]),
  ),
};
function fixture(query, outcome = "loss") {
  const end = outcome === "gain" ? 120 : outcome === "neutral" ? 100 : 80;
  return {
    fechas: ["2023-12-01", "2024-01-01", "2024-02-01"],
    isr: [100, 90, end],
    isal: [100, 117, end * 1.5],
    ipc: [100, 130, 150],
    ultimo_isr: end,
    clase: query.get("clase"),
    salario_key: query.get("salario"),
    fecha_datos: "2024-02-01",
  };
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? {
          executablePath: process.env.CHROMIUM_PATH,
          args: ["--no-sandbox", "--disable-gpu"],
        }
      : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let outcome = "loss",
      failMeta = false,
      failResult = false,
      delay = 0,
      lastQuery;
    await page.route("**/api/index*", async (route) => {
      const query = new URL(route.request().url()).searchParams;
      if (!query.has("clase"))
        return route.fulfill({ status: failMeta ? 503 : 200, json: metadata });
      lastQuery = query;
      const body = fixture(query, outcome);
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      try {
        await route.fulfill({ status: failResult ? 503 : 200, json: body });
      } catch (_) {
        /* Deliberately canceled stale request. */
      }
    });
    await page.goto(baseURL);
    await page.waitForFunction(
      () => !document.getElementById("calculate").disabled,
    );
    assert.equal(
      await page.locator("dialog").evaluate((dialog) => dialog.open),
      false,
      "No forced onboarding",
    );
    await page.locator("input[name=clase][value=Media]").check();
    await page.locator("input[name=salario][value=privado]").check();
    await page.locator('[data-date="2023-12"]').click();
    await page.locator("#calculate").click();
    await page.locator("#results").waitFor({ state: "visible" });
    assert.equal(await page.locator("#verdict").textContent(), "Perdimos.");
    assert.equal(await page.locator("#result-number").textContent(), "−20,0%");
    assert.equal(lastQuery.get("fecha"), "2023-12-01");
    assert.equal(await page.locator("#salary-total").textContent(), "+20,0%");
    await page.locator("#view-components").click();
    assert.equal(await page.locator("#chart-wrap polyline").count(), 2);
    await page.locator(".data-details summary").click();
    assert.equal(await page.locator("#data-table tr").count(), 3);
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#export-chart").click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.png$/);
    assert.equal(await download.failure(), null);
    for (const result of ["gain", "neutral"]) {
      outcome = result;
      await page.locator("#calculate").click();
      await page.locator("#results").waitFor({ state: "visible" });
      assert.equal(
        await page.locator("#verdict").textContent(),
        result === "gain" ? "Ganamos." : "Quedamos a mano.",
      );
    }
    // Existing API keys, all classes and all employment sectors are preserved.
    for (const className of ["Baja", "Media", "Alta"]) {
      for (const sector of ["privado", "publico", "informal", "general"]) {
        await page.locator(`input[name=clase][value=${className}]`).check();
        await page.locator(`input[name=salario][value=${sector}]`).check();
        await page.locator("#calculate").click();
        await page.locator("#results").waitFor({ state: "visible" });
        assert.equal(lastQuery.get("clase"), className);
        assert.equal(lastQuery.get("salario"), sector);
      }
    }
    await page.locator("#select-anio").selectOption("2016");
    assert.deepEqual(
      await page
        .locator("#select-mes option")
        .evaluateAll((options) => options.map((option) => option.value)),
      ["12"],
    );
    await page.locator("#select-anio").selectOption("2026");
    assert.equal(await page.locator("#select-mes option").count(), 7);
    await page.locator("#help-class").click();
    await page.locator("#income").fill("10000000");
    await page.locator("#household-size").fill("1");
    assert.equal(await page.locator("#estimated-class").textContent(), "Alta");
    await page.locator("#confirm-class").click();
    assert.equal(
      await page.locator("input[name=clase][value=Alta]").isChecked(),
      true,
    );
    await page.locator("#help-class").click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator("#help-class")
        .evaluate((element) => document.activeElement === element),
      true,
    );
    // Verify keyboard focus stays in native modal.
    await page.locator("#help-class").click();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(
          () =>
            document.activeElement.closest("dialog") !== null ||
            document.activeElement === document.body,
        ),
        true,
      );
    }
    await page.keyboard.press("Escape");
    failResult = true;
    await page.locator("#calculate").click();
    await page.locator("#error-state").waitFor({ state: "visible" });
    failResult = false;
    await page.locator("#retry-analysis").click();
    await page.locator("#results").waitFor({ state: "visible" });
    delay = 500;
    await page.locator("#calculate").click();
    await page.locator("input[name=clase][value=Baja]").check();
    await page.waitForTimeout(650);
    assert.equal(
      await page.locator("#results").isVisible(),
      false,
      "Stale response must not appear",
    );
    delay = 0;
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator("#calculate").click();
      await page.locator("#results").waitFor({ state: "visible" });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        true,
        `No horizontal overflow at ${width}px`,
      );
    }
    // Failure to fetch metadata is recoverable, rather than leaving an inert form.
    failMeta = true;
    await page.reload();
    await page.locator("#retry-meta").waitFor({ state: "visible" });
    failMeta = false;
    await page.locator("#retry-meta").click();
    await page.waitForFunction(
      () => !document.getElementById("calculate").disabled,
    );
    // Corrupt or blocked storage must not prevent startup.
    await page.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("Storage blocked");
        },
      }),
    );
    await page.reload();
    await page.waitForFunction(
      () => !document.getElementById("calculate").disabled,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 12 class/sector combinations; gain/loss/neutral; date limits; modal and keyboard; chart/table; PNG; API retry; stale requests; blocked storage; layouts 320–1440px.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
