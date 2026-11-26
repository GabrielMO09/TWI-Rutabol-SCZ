import { expect, test } from "@playwright/test";

// SHOTS_DIR=<carpeta> guarda capturas. No inicia sesión: solo revisa la interfaz de acceso.
const SIZES = [[320, 568], [360, 800], [390, 844], [768, 1024], [1024, 768], [1366, 768], [1920, 1080]] as const;
const PATHS = ["/acceso", "/acceso/pasajero", "/acceso/chofer", "/acceso/control", "/acceso/recuperar", "/registro"];

for (const [width, height] of SIZES) {
  test(`acceso sin desbordes a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const path of PATHS) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), path).toBeLessThanOrEqual(0);
      const brand = page.locator("aside").first();
      if (width >= 1024) await expect(brand).toBeVisible();
      else await expect(brand).toBeHidden();
      if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/auth${path.replace(/\//g, "-")}-${width}.png` });
    }
  });
}

test("el selector ofrece exactamente tres perfiles y ninguna consulta sin cuenta", async ({ page }) => {
  await page.goto("/acceso");
  // Los enlaces de registro y ayuda no son perfiles: solo se cuentan los de /acceso/.
  await expect(page.getByRole("main").locator('a[href^="/acceso/"]')).toHaveCount(3);
  await expect(page.getByRole("link", { name: /Estudiante o pasajero/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Conductor/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Centro de Control/ })).toBeVisible();
  await expect(page.getByText(/consultar rutas/i)).toHaveCount(0);
  for (const path of ["/acceso/pasajero", "/acceso/chofer", "/acceso/control"]) {
    await page.goto(path);
    await expect(page.getByText(/consultar rutas|sin cuenta/i)).toHaveCount(0);
  }
});

test("la contraseña se puede mostrar y ocultar, y solo el pasajero ofrece registro y recuperación", async ({ page }) => {
  await page.goto("/acceso/pasajero");
  const pw = page.getByLabel("Contraseña", { exact: true });
  await expect(pw).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(pw).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar contraseña" }).click();
  await expect(pw).toHaveAttribute("type", "password");
  await expect(page.getByRole("link", { name: "Crear cuenta" })).toBeVisible();
  await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toBeVisible();
  for (const path of ["/acceso/chofer", "/acceso/control"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "¿Olvidaste tu contraseña?" })).toHaveCount(0);
  }
});
