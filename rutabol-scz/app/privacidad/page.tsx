import PublicShell from "@/components/PublicShell";

export const metadata = { title: "Política de privacidad | RUTABOL-SCZ" };

export default function Privacidad() {
  return (
    <PublicShell>
      <article className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Política de privacidad</h1>
        <h2 className="text-lg font-semibold">Datos que recopilamos</h2>
        <p className="text-sm">
          Nombre, fotografía, categoría, código RUDE o correo institucional, historial de viajes y movimientos de tu
          Credicard. Solo se solicitan los datos necesarios para verificar tu tarifa.
        </p>
        <h2 className="text-lg font-semibold">Qué se muestra a otras personas</h2>
        <p className="text-sm">
          El mapa público muestra únicamente unidades activas con datos recientes. Tu código RUDE nunca aparece en el
          código QR ni en pantallas públicas; el chofer solo ve tu nombre, fotografía y categoría.
        </p>
        <h2 className="text-lg font-semibold">Ubicación</h2>
        <p className="text-sm">
          Tu ubicación se usa solo con tu permiso para filtrar micros en un radio de 5 km y no se almacena. La
          ubicación de los micros deja de publicarse cuando el chofer finaliza su jornada.
        </p>
        <h2 className="text-lg font-semibold">Menores de edad</h2>
        <p className="text-sm">
          Los datos de estudiantes escolares se limitan a lo indispensable y su acceso queda restringido al Centro de
          Control y al chofer durante la validación.
        </p>
        <h2 className="text-lg font-semibold">Tus derechos</h2>
        <p className="text-sm">
          Puedes corregir tus datos desde tu perfil o solicitar su corrección escribiendo a contacto@rutabol.bo.
        </p>
      </article>
    </PublicShell>
  );
}
