import { expect, test } from "@playwright/test";

// Las cuentas demo requieren ENABLE_DEMO_SEED=true en el backend.
const passengerId = "7654321";
const passengerIdLabel = "Código RUDE, correo institucional o CI";

test("el pasajero ingresa a su panel con la cuenta demo", async ({ page }) => {
  await page.goto("/acceso/pasajero");
  await page.getByLabel(passengerIdLabel, { exact: true }).fill(passengerId);
  await page.getByLabel("Contraseña", { exact: true }).fill("123456");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  await expect(page).toHaveURL("/pasajero");
  // Menú lateral del rediseño del pasajero (reemplaza la doble barra "Secciones/Subsecciones").
  const navigation = page.getByRole("navigation", { name: "Navegación principal", exact: true });
  await expect(navigation.getByRole("link", { name: "Explorar mapa", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Notificaciones/ })).toBeVisible();
});

test("una contraseña incorrecta muestra un error y mantiene al pasajero en el formulario", async ({ page }) => {
  await page.goto("/acceso/pasajero");
  await page.getByLabel(passengerIdLabel, { exact: true }).fill(passengerId);
  await page.getByLabel("Contraseña", { exact: true }).fill("123457");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  const error = page.getByRole("main").getByRole("alert");
  await expect(error).toBeVisible();
  await expect(error).toContainText("Identificador o contraseña incorrectos.");
  await expect(page).toHaveURL("/acceso/pasajero");
});

test("la cuenta demo del Centro de Control ingresa al resumen", async ({ page }) => {
  await page.goto("/acceso/control");
  await page.getByLabel("Identificador", { exact: true }).fill("control@rutabol.bo");
  await page.getByLabel("Contraseña", { exact: true }).fill("control123");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  await expect(page).toHaveURL("/control");
  await expect(page.getByRole("heading", { name: "Centro de Control", level: 1, exact: true })).toBeVisible();
});

test("el chofer elige su línea (cargada desde la API) e ingresa", async ({ page }) => {
  await page.goto("/acceso/chofer");
  await expect(page.locator("#line option")).not.toHaveCount(0);
  await page.locator("#line").selectOption("17");
  await page.locator("#int").fill("045");
  await page.locator("#pin").fill("1234");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("/chofer");
});

test("el botón volver arriba aparece al bajar y regresa al inicio", async ({ page }) => {
  await page.goto("/terminos");
  await page.evaluate(() => { document.body.style.minHeight = "4000px"; window.scrollTo(0, 1500); });
  const button = page.getByRole("button", { name: "Volver al inicio de la página" });
  await expect(button).toBeVisible();
  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("tras salir, el login de Control vuelve en blanco y permite ingresar otra vez", async ({ page }) => {
  await page.goto("/acceso/control");
  await page.getByLabel("Identificador", { exact: true }).fill("control@rutabol.bo");
  await page.getByLabel("Contraseña", { exact: true }).fill("control123");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("/control");
  await page.getByRole("button", { name: "Menú de usuario" }).click();
  // El último es el del menú de usuario; el primero es el de la barra lateral.
  await page.getByRole("button", { name: "Cerrar sesión y volver al inicio" }).last().click();

  // Navegación del lado del cliente (sin recargar): ahí es donde la página conservaba su estado.
  await page.evaluate(() => (window as unknown as { next: { router: { push(url: string): void } } }).next.router.push("/acceso/control"));
  await expect(page).toHaveURL("/acceso/control");
  await expect(page.getByLabel("Identificador", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("");
  await page.getByLabel("Identificador", { exact: true }).fill("control@rutabol.bo");
  await page.getByLabel("Contraseña", { exact: true }).fill("control123");
  await expect(page.getByRole("button", { name: "Ingresar", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL("/control");
});
