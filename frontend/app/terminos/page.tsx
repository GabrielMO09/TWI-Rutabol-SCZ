import PublicShell from "@/components/PublicShell";

export const metadata = { title: "Términos de uso | RUTABOL-SCZ" };

export default function Terminos() {
  return (
    <PublicShell>
      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Términos de uso</h1>
        <p className="rounded-lg bg-soft p-3 text-sm text-muted">
          Prototipo académico. Las funciones de pago, recarga y verificación institucional son simuladas y no mueven
          dinero real.
        </p>
        <h2 className="text-lg font-semibold">1. Uso del servicio</h2>
        <p className="text-sm">
          RUTABOL-SCZ permite consultar líneas, tarifas y micros activos sin cuenta. Para pagar con Credicard y acceder
          a la tarifa estudiantil debes registrarte y mantener tus datos veraces.
        </p>
        <h2 className="text-lg font-semibold">2. Tarifa estudiantil</h2>
        <p className="text-sm">
          La tarifa preferencial se concede únicamente con una acreditación vigente aprobada. Las solicitudes
          pendientes, observadas, rechazadas o vencidas pagan la tarifa general.
        </p>
        <h2 className="text-lg font-semibold">3. Credicard y pagos</h2>
        <p className="text-sm">
          El importe lo calcula el sistema y no puede ser modificado por el chofer. Un reintento de pago no genera un
          segundo débito. Los reclamos se registran desde tu historial de viajes.
        </p>
        <h2 className="text-lg font-semibold">4. Cuentas</h2>
        <p className="text-sm">
          El Centro de Control puede suspender cuentas por uso indebido. Los roles de chofer y Centro de Control solo
          se asignan por autorización.
        </p>
      </article>
    </PublicShell>
  );
}
