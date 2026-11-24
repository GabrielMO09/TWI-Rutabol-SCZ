import { expect, test, type Page } from "@playwright/test";

// Requiere ENABLE_DEMO_SEED=true. Con SHOTS_DIR=<carpeta> guarda capturas de cada resolución.
const SIZES = [
  [320, 640], [360, 740], [390, 844], [430, 932], [768, 1024], [1024, 768], [1366, 768], [1920, 1080],
] as const;

async function login(page: Page) {
  await page.goto("/acceso/pasajero");
  await page.getByLabel("Código RUDE, correo institucional o CI", { exact: true }).fill("7654321");
  await page.getByLabel("Contraseña", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("/pasajero");
}

for (const [width, height] of SIZES) {
  test(`mapa del pasajero sin desbordes a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page);
    await expect(page.getByRole("heading", { name: "Micros cercanos" })).toBeVisible();
    await page.waitForTimeout(1500); // el mapa y las unidades terminan de cargar

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const mobile = width < 768;
    const bottom = page.getByRole("navigation", { name: "Navegación inferior" });
    const side = page.getByRole("navigation", { name: "Navegación principal" });
    if (mobile) {
      await expect(bottom).toBeVisible();
      await expect(side).toBeHidden();
      await expect(page.getByRole("link", { name: "Pagar pasaje" })).toBeVisible();
    } else {
      await expect(side).toBeVisible();
      await expect(bottom).toBeHidden();
    }
    if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/mapa-${width}.png` });
  });
}
