import { expect, test } from "@playwright/test";

// Requiere ENABLE_DEMO_SEED=true. Solo navega y lee. SHOTS_DIR guarda capturas.
const SIZES = [[320, 640], [390, 844], [768, 1024], [1366, 768]] as const;
const PATHS = ["/control", "/control/acreditaciones", "/control/reclamos", "/control/incidentes", "/control/flota",
  "/control/paradas", "/control/instituciones", "/control/tarifas", "/control/usuarios", "/control/auditoria", "/control/reportes"];

for (const [width, height] of SIZES) {
  test(`Centro de Control sin desbordes a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/acceso/control");
    await page.getByLabel("Identificador", { exact: true }).fill("control@rutabol.bo");
    await page.getByLabel("Contraseña", { exact: true }).fill("control123");
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
    await expect(page).toHaveURL("/control");
    const mobile = width < 768;
    for (const path of PATHS) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
      await expect(page.getByRole("navigation", { name: mobile ? "Navegación inferior" : "Navegación principal" })).toBeVisible();
      if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/control${path.replace(/\//g, "-")}-${width}.png` });
    }
  });
}

test("el selector de acceso no ofrece consulta pública", async ({ page }) => {
  await page.goto("/acceso");
  await expect(page.getByRole("link", { name: /Estudiante o pasajero/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Conductor/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Centro de Control/ })).toBeVisible();
  await expect(page.getByText(/Solo consultar rutas/)).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Consultar rutas/ }).first()).toBeVisible();
});
