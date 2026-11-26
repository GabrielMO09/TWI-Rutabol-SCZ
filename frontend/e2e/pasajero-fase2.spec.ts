import { expect, test, type Page } from "@playwright/test";

// Requiere ENABLE_DEMO_SEED=true. No confirma recargas ni pagos: no modifica datos.
async function login(page: Page) {
  await page.goto("/acceso/pasajero");
  await page.getByLabel("Código RUDE, correo institucional o CI", { exact: true }).fill("7654321");
  await page.getByLabel("Contraseña", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("/pasajero");
}

const shot = (page: Page, name: string) =>
  process.env.SHOTS_DIR ? page.screenshot({ path: `${process.env.SHOTS_DIR}/${name}.png` }) : undefined;
const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

for (const [width, height] of [[390, 844], [1366, 768]] as const) {
  test(`credicard: saldo enmascarado y recarga con resumen (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page);
    await page.goto("/pasajero/credicard");
    await expect(page.getByText("Saldo disponible").first()).toBeVisible();
    await expect(page.getByText(/^•••• •••• •••• \d{4}$/)).toBeVisible();
    await shot(page, `credicard-${width}`);
    await noOverflow(page);

    await page.getByRole("button", { name: "Recargar saldo", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Recargar saldo" });
    await dialog.getByRole("button", { name: "Bs 10", exact: true }).click();
    await shot(page, `recarga-${width}`);
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("dialog", { name: "Confirma tu recarga" })).toContainText("Pago simulado");
    await shot(page, `recarga-resumen-${width}`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test(`pago: resumen con saldo y botón principal (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page);
    await page.goto("/pasajero/pago");
    await expect(page.getByRole("heading", { name: "Resumen" })).toBeVisible();
    await expect(page.getByText("Saldo después del pago")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Pagar Bs/ })).toBeVisible();
    await shot(page, `pago-${width}`);
    await noOverflow(page);
  });

  test(`historial: filtros y detalle o estado vacío (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page);
    await page.goto("/pasajero/historial");
    await expect(page.getByLabel("Estado", { exact: true }).or(page.getByText("Todavía no pagaste ningún pasaje"))).toBeVisible();
    await shot(page, `historial-${width}`);
    await noOverflow(page);
    const first = page.getByRole("button", { name: /^Ver detalle/ }).first();
    if (await first.count()) {
      await first.click();
      await expect(page.getByRole("dialog", { name: "Detalle del viaje" })).toBeVisible();
      await shot(page, `historial-detalle-${width}`);
    }
  });
}

test("recarga rechazada con 400: se puede cambiar el monto y volver a enviar", async ({ page }) => {
  const sent: number[] = [];
  // El POST se simula: no crea recargas.
  await page.route("**/wallet/recharge", (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    sent.push(route.request().postDataJSON().amount);
    return route.fulfill({
      status: 400,
      headers: { "access-control-allow-origin": new URL(page.url()).origin, "access-control-allow-credentials": "true" },
      json: { message: "Rechazo de prueba." },
    });
  });
  await login(page);
  await page.goto("/pasajero/credicard");
  await page.getByRole("button", { name: "Recargar saldo", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const amount of ["50", "10"]) {
    await dialog.getByRole("button", { name: `Bs ${amount}`, exact: true }).click();
    await dialog.getByRole("button", { name: "Continuar" }).click();
    await dialog.getByRole("button", { name: /^(Confirmar|Pagar|Solicitar|Realizar)/ }).click();
    await expect(dialog).toContainText("Rechazo de prueba.");
    await dialog.getByRole("button", { name: /Volver|Editar|Atrás|Modificar|Cambiar/ }).click();
  }
  expect(sent).toEqual([50, 10]);
});
