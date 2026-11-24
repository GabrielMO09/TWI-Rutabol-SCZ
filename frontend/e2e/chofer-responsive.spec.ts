import { expect, test, type Page } from "@playwright/test";

// Requiere ENABLE_DEMO_SEED=true. Solo navega: no inicia jornada ni cobra. SHOTS_DIR guarda capturas.
const SIZES = [[320, 640], [390, 844], [768, 1024], [1366, 768]] as const;
const PAGES = [
  ["/chofer", "Jornada"],
  ["/chofer/validacion", "Verificar carnet QR"],
  ["/chofer/incidentes", "Tipo de incidente"],
  ["/chofer/trasbordo", "Trasbordo de emergencia"],
] as const;

async function login(page: Page) {
  await page.goto("/acceso/chofer");
  await expect(page.locator("#line option")).not.toHaveCount(0);
  await page.locator("#line").selectOption("17");
  await page.locator("#int").fill("045");
  await page.locator("#pin").fill("1234");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("/chofer");
}

for (const [width, height] of SIZES) {
  test(`panel del chofer sin desbordes a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page);
    const mobile = width < 768;
    for (const [path, text] of PAGES) {
      await page.goto(path);
      await expect(page.locator("main").getByText(text).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await expect(page.getByRole("navigation", { name: mobile ? "Navegación inferior" : "Navegación principal" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: mobile ? "Navegación principal" : "Navegación inferior" })).toBeHidden();
      if (process.env.SHOTS_DIR) await page.screenshot({ path: `${process.env.SHOTS_DIR}/chofer${path.replace(/\//g, "-")}-${width}.png` });
    }
  });
}
