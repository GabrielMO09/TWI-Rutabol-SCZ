import { expect, test, type Page } from "@playwright/test";

// Requiere ENABLE_DEMO_SEED=true. Solo lectura: no envía reclamos, solicitudes ni cambios.
async function login(page: Page, user = "7654321") {
  await page.goto("/acceso/pasajero");
  await page.getByLabel("Código RUDE, correo institucional o CI", { exact: true }).fill(user);
  await page.getByLabel("Contraseña", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("/pasajero");
}
const shot = (page: Page, name: string) =>
  process.env.SHOTS_DIR ? page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png` }) : undefined;
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

for (const [width, height] of [[320, 640], [390, 844], [1366, 768]] as const) {
  test(`fase 3: carnet, acreditación, reclamos, perfil y notificaciones (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page, "estudiante@upds.edu.bo");

    await page.goto("/pasajero/carnet");
    await expect(page.getByAltText("Código QR temporal para validar tu identidad")).toBeVisible();
    await shot(page, `carnet-${width}`);
    await noOverflow(page);

    await page.goto("/pasajero/acreditacion");
    await expect(page.getByRole("list", { name: "Progreso de la acreditación" })).toBeVisible();
    await shot(page, `acreditacion-${width}`);
    await noOverflow(page);

    await page.goto("/pasajero/reclamos");
    await page.getByRole("button", { name: "Nuevo reclamo" }).click();
    await expect(page.getByRole("dialog", { name: "Nuevo reclamo" })).toBeVisible();
    await shot(page, `reclamos-${width}`);
    await page.keyboard.press("Escape");
    await noOverflow(page);

    await page.goto("/pasajero/perfil");
    await expect(page.getByRole("navigation", { name: "Secciones del perfil" })).toBeVisible();
    await shot(page, `perfil-${width}`);
    await noOverflow(page);

    await page.getByRole("button", { name: /Notificaciones/ }).click();
    await expect(page.getByRole("dialog", { name: "Notificaciones" })).toBeVisible();
    await shot(page, `notificaciones-${width}`);
  });
}

test("reclamo prellenado desde el historial abre el formulario", async ({ page }) => {
  await login(page);
  await page.goto("/pasajero/reclamos?line=17&internal=045&ticket=t1");
  await expect(page.getByRole("dialog", { name: "Nuevo reclamo" })).toBeVisible();
  await expect(page.getByLabel("Línea", { exact: true })).toHaveValue("17");
});
