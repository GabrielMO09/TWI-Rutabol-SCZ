
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  CreditCard,
  GraduationCap,
  Hash,
  ImagePlus,
  LockKeyhole,
  Mail,
  Phone,
  School,
  ShieldCheck,
  UserRound,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";

import AuthFrame, {
  ErrorNote,
} from "@/components/AuthFrame";

import {
  PasswordInput,
  SubmitButton,
  TextField,
} from "@/components/auth/fields";

import { useFetch } from "@/lib/api";

import {
  CATEGORY_LABEL,
  FARES,
  type Category,
} from "@/lib/data";

import { useApp } from "@/lib/store";

/* =========================================
   CONFIGURACIÓN DE CATEGORÍAS
========================================= */

const CAT_ICON: Record<Category, LucideIcon> = {
  escolar: School,
  universitario: GraduationCap,
  general: UserRound,
};

const CAT_DESCRIPTION: Record<Category, string> = {
  escolar: "Estudiantes de unidades educativas.",
  universitario: "Estudiantes universitarios.",
  general: "Pasajeros del transporte urbano.",
};

type Institution = {
  id: string;
  type: "colegio" | "universidad";
  name: string;
};

/* =========================================
   PROCESAMIENTO DE FOTOGRAFÍA
========================================= */

function resizePhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const size = 256;

        const canvas =
          document.createElement("canvas");

        canvas.width = size;

        canvas.height = size;

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error(
            "No se pudo procesar la fotografía."
          );
        }

        const side = Math.min(
          img.width,
          img.height
        );

        context.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          size,
          size
        );

        resolve(
          canvas.toDataURL("image/jpeg", 0.8)
        );

      } catch (error) {
        reject(error);

      } finally {
        URL.revokeObjectURL(url);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error("No se pudo leer la imagen.")
      );
    };

    img.src = url;
  });
}

/* =========================================
   CONTENEDOR DE SECCIONES
========================================= */

function FormSection({
  number,
  icon: Icon,
  title,
  description,
  children,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="animate-fade-up min-w-0 rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      {/* Encabezado de sección */}

      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-5">

        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">

          <Icon
            size={23}
            aria-hidden="true"
          />

        </span>

        <div className="min-w-0 flex-1">

          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            {title}
          </h2>

          <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
            {description}
          </p>

        </div>

        <span
          aria-hidden="true"
          className="text-xl font-extrabold tracking-tight text-emerald-200"
        >
          {number}
        </span>

      </div>

      {children}

    </section>
  );
}

/* =========================================
   TARJETAS DE CATEGORÍAS
========================================= */

function CategoryCard({
  category,
  selected,
  disabled,
  onSelect,
}: {
  category: Category;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const Icon = CAT_ICON[category];

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`group relative flex min-w-0 flex-col items-start rounded-2xl border p-4 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
        selected
          ? "border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/15"
          : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/30"
      }`}
    >

      <div className="mb-3 flex w-full items-center justify-between gap-2">

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
            selected
              ? "bg-emerald-700 text-white"
              : "bg-slate-100 text-slate-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"
          }`}
        >

          <Icon
            size={23}
            aria-hidden="true"
          />

        </span>

        {selected ? (
          <CheckCircle2
            size={21}
            aria-hidden="true"
            className="shrink-0 text-emerald-600"
          />
        ) : (
          <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-200" />
        )}

      </div>

      <span className="text-sm font-bold text-slate-900 sm:text-base">
        {CATEGORY_LABEL[category]}
      </span>

      <span className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
        {CAT_DESCRIPTION[category]}
      </span>

      <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-700">

        <CreditCard
          size={14}
          aria-hidden="true"
        />

        Bs {FARES[category].toFixed(2)}

      </span>

    </button>
  );
}

/* =========================================
   REGISTRO DE USUARIOS
========================================= */

export default function Registro() {
  const { registerStudent } = useApp();

  const router = useRouter();

  const lock = useRef(false);

  const photoRequest = useRef(0);

  /* =====================================
     ESTADOS DEL FORMULARIO
  ===================================== */

  const [category, setCategory] =
    useState<Category>("universitario");

  const [name, setName] = useState("");

  const [ci, setCi] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [code, setCode] = useState("");

  const [password, setPassword] = useState("");

  const [
    passwordConfirmation,
    setPasswordConfirmation,
  ] = useState("");

  const [photo, setPhoto] = useState("");

  const [photoLoading, setPhotoLoading] =
    useState(false);

  const [institution, setInstitution] =
    useState("");

  const [acceptTerms, setAcceptTerms] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);

  /* =====================================
     CATÁLOGO DE INSTITUCIONES
  ===================================== */

  const catalog = useFetch<Institution[]>(
    "/public/institutions"
  );

  const student = category !== "general";

  const options =
    catalog.data?.filter(
      ({ type }) =>
        type ===
        (category === "escolar"
          ? "colegio"
          : "universidad")
    ) ?? [];

  /* =====================================
     CAMBIO DE CATEGORÍA
  ===================================== */

  function changeCategory(value: Category) {
    if (value === category || busy) return;

    setCategory(value);

    setCode("");

    setInstitution("");

    setError(null);
  }

  /* =====================================
     CARGAR FOTOGRAFÍA
  ===================================== */

  async function onPhoto(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const request = ++photoRequest.current;

    if (!file.type.startsWith("image/")) {
      setError(
        "Selecciona un archivo de imagen válido."
      );

      setPhotoLoading(false);

      return;
    }

    setPhotoLoading(true);

    setError(null);

    try {
      const result = await resizePhoto(file);

      if (request !== photoRequest.current) return;

      setPhoto(result);

    } catch (failure) {
      if (request !== photoRequest.current) return;

      setError(
        failure instanceof Error
          ? failure.message
          : "No se pudo procesar la fotografía."
      );

    } finally {
      if (request === photoRequest.current) {
        setPhotoLoading(false);
      }
    }
  }

  /* =====================================
     VALIDACIONES VISUALES
  ===================================== */

  const passwordMismatch =
    passwordConfirmation.length > 0 &&
    password !== passwordConfirmation;

  const passwordChecks = [
    {
      label: "Mínimo 8 caracteres",
      valid: password.length >= 8,
    },
    {
      label: "Las contraseñas coinciden",
      valid:
        password.length > 0 &&
        password === passwordConfirmation,
    },
  ];

  /* =====================================
     PROCESAR REGISTRO
  ===================================== */

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (lock.current || photoLoading) return;

    setError(null);

    /* Datos personales */

    if (
      !name.trim() ||
      !ci.trim() ||
      !email.trim() ||
      !phone.trim()
    ) {
      setError(
        "Completa todos tus datos personales."
      );

      return;
    }

    /* Longitud de contraseña */

    if (password.length < 8) {
      setError(
        "La contraseña debe tener al menos 8 caracteres."
      );

      return;
    }

    /* Confirmación de contraseña */

    if (password !== passwordConfirmation) {
      setError(
        "Las contraseñas deben coincidir."
      );

      return;
    }

    /* Fotografía obligatoria */

    if (!photo) {
      setError(
        "Sube una fotografía del rostro."
      );

      return;
    }

    /* Validación de institución */

    if (
      student &&
      (
        catalog.loading ||
        !!catalog.error ||
        !options.some(
          ({ id }) => id === institution
        )
      )
    ) {
      setError(
        "Selecciona una institución habilitada."
      );

      return;
    }

    /* Código de estudiante */

    if (student && !code.trim()) {
      setError(
        "Ingresa tu código de estudiante."
      );

      return;
    }

    /* Términos de uso */

    if (!acceptTerms) {
      setError(
        "Debes aceptar los términos de uso y la política de privacidad."
      );

      return;
    }

    /* Bloquear registros simultáneos */

    lock.current = true;

    setBusy(true);

    try {
      /*
       * Conservamos la estructura original
       * enviada al backend.
       */

      const failure = await registerStudent({
        name: name.trim(),
        category,
        ci: ci.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        passwordConfirmation,
        photo,
        acceptTerms,

        ...(student
          ? { institution }
          : {}),

        ...(category === "escolar"
          ? { code: code.trim() }
          : {}),

        ...(category === "universitario"
          ? { institutionalCode: code.trim() }
          : {}),
      });

      if (failure) {
        setError(failure);

        return;
      }

      /* Limpiar información sensible */

      setName("");

      setCi("");

      setEmail("");

      setPhone("");

      setCode("");

      setInstitution("");

      setPassword("");

      setPasswordConfirmation("");

      setPhoto("");

      setAcceptTerms(false);

      /* Redirección original */

      router.replace(
        category === "general"
          ? "/pasajero"
          : "/pasajero/acreditacion"
      );

    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "No fue posible crear la cuenta. Inténtalo nuevamente."
      );

    } finally {
      lock.current = false;

      setBusy(false);
    }
  }

  /* =====================================
     INTERFAZ PRINCIPAL
  ===================================== */

  return (
    <AuthFrame
      icon={UserPlus}
      title="Crea tu cuenta"
      subtitle="Completa tus datos para acceder a los servicios de transporte de RUTABOL-SCZ."
      message="Tu próxima parada comienza aquí."
      back="/acceso/pasajero"
      backLabel="Iniciar sesión"
      desktopWide
      home
    >

      <div className="mx-auto w-full max-w-[1080px]">

        {/* =================================
            INFORMACIÓN INICIAL
        ================================= */}

        <div className="animate-fade-up mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-white p-4">

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">

            <ShieldCheck
              size={22}
              aria-hidden="true"
            />

          </span>

          <div>

            <h2 className="text-sm font-bold text-emerald-900">
              Bienvenido a RUTABOL-SCZ
            </h2>

            <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
              Selecciona tu categoría y completa
              la información solicitada.
              La tarifa estudiantil se aplicará
              cuando tu acreditación sea aprobada.
            </p>

          </div>

        </div>

        {/* =================================
            FORMULARIO PRINCIPAL
        ================================= */}

        <form
          onSubmit={submit}
          aria-busy={busy}
          className="space-y-5"
        >

          {/* =================================
              01. CATEGORÍA DE PASAJERO
          ================================= */}

          <FormSection
            number="01"
            icon={GraduationCap}
            title="Categoría de pasajero"
            description="Selecciona la categoría que corresponde a tu perfil."
          >

            <fieldset>

              <legend className="sr-only">
                Categoría de pasajero
              </legend>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                {(
                  Object.keys(
                    CATEGORY_LABEL
                  ) as Category[]
                ).map((item) => (
                  <CategoryCard
                    key={item}
                    category={item}
                    selected={category === item}
                    disabled={busy}
                    onSelect={() =>
                      changeCategory(item)
                    }
                  />
                ))}

              </div>

            </fieldset>

            {student && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">

                <CircleAlert
                  size={17}
                  aria-hidden="true"
                  className="mt-0.5 shrink-0"
                />

                <p>
                  La tarifa estudiantil está sujeta
                  a la aprobación de tu acreditación
                  académica.
                </p>

              </div>
            )}

          </FormSection>

          {/* =================================
              02. DATOS PERSONALES
          ================================= */}

          <FormSection
            number="02"
            icon={UserRound}
            title="Datos personales"
            description="Introduce tus datos de identificación y contacto."
          >

            <div className="grid min-w-0 gap-5 sm:grid-cols-2">

              <TextField
                id="name"
                name="name"
                label="Nombre completo"
                icon={UserRound}
                placeholder="Nombres y apellidos"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                autoComplete="name"
                required
                disabled={busy}
              />

              <TextField
                id="ci"
                name="ci"
                label="Número de CI"
                icon={Hash}
                placeholder="Ej. 7654321 o 7654321-1A"
                value={ci}
                onChange={(event) =>
                  setCi(event.target.value)
                }
                maxLength={15}
                required
                disabled={busy}
              />

              <TextField
                id="email"
                name="email"
                label={
                  category === "universitario"
                    ? "Correo institucional"
                    : "Correo electrónico"
                }
                icon={Mail}
                type="email"
                placeholder={
                  category === "universitario"
                    ? "usuario@universidad.edu"
                    : "usuario@correo.com"
                }
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                autoComplete="email"
                maxLength={254}
                required
                disabled={busy}
              />

              <TextField
                id="phone"
                name="phone"
                label="Teléfono"
                icon={Phone}
                type="tel"
                placeholder="Ej. +591 71234567"
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                autoComplete="tel"
                maxLength={30}
                required
                disabled={busy}
              />

            </div>

          </FormSection>

          {/* =================================
              03. INFORMACIÓN ACADÉMICA
          ================================= */}

          {student && (
            <FormSection
              number="03"
              icon={
                category === "escolar"
                  ? School
                  : GraduationCap
              }
              title="Información académica"
              description="Completa los datos necesarios para tu acreditación estudiantil."
            >

              <div className="grid min-w-0 gap-5 sm:grid-cols-2">

                {/* Institución */}

                <div className="min-w-0">

                  <label
                    htmlFor="inst"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    {category === "escolar"
                      ? "Unidad educativa"
                      : "Universidad"}

                    <span
                      aria-hidden="true"
                      className="ml-1 text-red-500"
                    >
                      *
                    </span>
                  </label>

                  <div className="relative">

                    <span className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-emerald-600">

                      <School
                        size={19}
                        aria-hidden="true"
                      />

                    </span>

                    <select
                      id="inst"
                      name="institution"
                      value={institution}
                      onChange={(event) => {
                        setInstitution(
                          event.target.value
                        );

                        setError(null);
                      }}
                      required
                      disabled={
                        busy ||
                        catalog.loading ||
                        !!catalog.error ||
                        !options.length
                      }
                      className="block min-h-[52px] w-full min-w-0 appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-10 text-sm text-slate-800 outline-none transition-all hover:border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >

                      <option value="">

                        {catalog.loading
                          ? "Cargando instituciones..."
                          : "Selecciona una institución"}

                      </option>

                      {options.map(
                        ({ id, name }) => (
                          <option
                            key={id}
                            value={id}
                          >
                            {name}
                          </option>
                        )
                      )}

                    </select>

                    <ChevronDown
                      size={18}
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                  </div>

                  {catalog.error && (
                    <div className="mt-3 space-y-2">

                      <ErrorNote
                        text={catalog.error}
                      />

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void catalog.reload()
                        }
                        className="rounded-lg border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                      >
                        Reintentar
                      </button>

                    </div>
                  )}

                  {!catalog.loading &&
                    !catalog.error &&
                    !options.length && (
                      <p className="mt-2 text-xs leading-relaxed text-amber-700">
                        No hay instituciones
                        habilitadas para esta categoría.
                      </p>
                    )}

                </div>

                {/* Código académico */}

                <TextField
                  id="code"
                  name="code"
                  icon={Hash}
                  label={
                    category === "escolar"
                      ? "Código RUDE"
                      : "Código institucional"
                  }
                  placeholder={
                    category === "escolar"
                      ? "Ingresa tu código RUDE"
                      : "Ingresa tu código institucional"
                  }
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value)
                  }
                  minLength={
                    category === "escolar"
                      ? 8
                      : 1
                  }
                  maxLength={
                    category === "escolar"
                      ? 20
                      : 70
                  }
                  required
                  disabled={busy}
                />

              </div>

            </FormSection>
          )}

          {/* =================================
              SEGURIDAD DE LA CUENTA
          ================================= */}

          <FormSection
            number={student ? "04" : "03"}
            icon={LockKeyhole}
            title="Seguridad de la cuenta"
            description="Crea una contraseña para proteger el acceso a tu cuenta."
          >

            <div className="grid min-w-0 gap-5 sm:grid-cols-2">

              <PasswordInput
                id="pw"
                name="password"
                label="Contraseña"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={busy}
              />

              <PasswordInput
                id="confirmation"
                name="passwordConfirmation"
                label="Repetir contraseña"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(
                    event.target.value
                  )
                }
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                minLength={8}
                required
                disabled={busy}
                error={
                  passwordMismatch
                    ? "Las contraseñas no coinciden."
                    : null
                }
              />

            </div>

            {/* Indicadores de validación */}

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <p className="mb-3 text-xs font-bold text-slate-700">
                Requisitos de la contraseña
              </p>

              <div
                aria-live="polite"
                className="grid gap-3 sm:grid-cols-2"
              >

                {passwordChecks.map(
                  ({ label, valid }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                        valid
                          ? "text-emerald-700"
                          : "text-slate-500"
                      }`}
                    >

                      {valid ? (
                        <CheckCircle2
                          size={17}
                          aria-hidden="true"
                          className="shrink-0"
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300"
                        />
                      )}

                      {label}

                    </div>
                  )
                )}

              </div>

            </div>

          </FormSection>

          {/* =================================
              FOTOGRAFÍA DEL USUARIO
          ================================= */}

          <FormSection
            number={student ? "05" : "04"}
            icon={Camera}
            title="Fotografía del rostro"
            description="Tu fotografía es obligatoria para generar tu carnet digital."
          >

            <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 sm:flex-row">

              {/* Vista previa */}

              <div className="relative shrink-0">

                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-[24px] border border-emerald-100 bg-white text-emerald-300 shadow-sm">

                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photo}
                      alt="Vista previa de tu fotografía"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound
                      size={48}
                      aria-hidden="true"
                    />
                  )}

                </div>

                {photo && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      photoRequest.current++;

                      setPhoto("");

                      setPhotoLoading(false);
                    }}
                    aria-label="Eliminar fotografía"
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    <X
                      size={15}
                      aria-hidden="true"
                    />
                  </button>
                )}

              </div>

              {/* Información y carga */}

              <div className="min-w-0 flex-1 text-center sm:text-left">

                <h3 className="font-bold text-slate-800">
                  {photo
                    ? "Fotografía cargada"
                    : "Sube una fotografía de tu rostro"}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  Utiliza una imagen clara, con buena
                  iluminación y el rostro visible.
                  La fotografía será utilizada para
                  generar tu carnet digital antifraude.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">

                  <div className="relative">

                    <input
                      id="photo"
                      type="file"
                      accept="image/*"
                      capture="user"
                      className="peer sr-only"
                      disabled={
                        busy || photoLoading
                      }
                      onChange={onPhoto}
                    />

                    <label
                      htmlFor="photo"
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-emerald-200 ${
                        busy || photoLoading
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer hover:border-emerald-400 hover:bg-emerald-50"
                      }`}
                    >

                      <ImagePlus
                        size={18}
                        aria-hidden="true"
                      />

                      {photoLoading
                        ? "Procesando..."
                        : photo
                          ? "Cambiar foto"
                          : "Subir fotografía"}

                    </label>

                  </div>

                  {photo && !photoLoading && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">

                      <CheckCircle2
                        size={16}
                        aria-hidden="true"
                      />

                      Imagen lista

                    </span>
                  )}

                </div>

              </div>

            </div>

          </FormSection>

          {/* =================================
              CONFIRMACIÓN Y REGISTRO
          ================================= */}

          <section className="animate-fade-up rounded-[22px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

            <div className="mb-5 flex items-start gap-3">

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">

                <ShieldCheck
                  size={23}
                  aria-hidden="true"
                />

              </span>

              <div>

                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Finaliza tu registro
                </h2>

                <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                  Revisa tu información y acepta
                  las condiciones de uso.
                </p>

              </div>

            </div>

            {/* Términos y condiciones */}

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <input
                id="acceptTerms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) =>
                  setAcceptTerms(
                    event.target.checked
                  )
                }
                required
                disabled={busy}
                aria-labelledby="terms-label"
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-emerald-600"
              />

              <div
                id="terms-label"
                className="text-sm leading-relaxed text-slate-600"
              >

                <label htmlFor="acceptTerms">
                  Acepto los{" "}
                </label>

                <Link
                  href="/terminos"
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  términos de uso
                </Link>

                {" "}y la{" "}

                <Link
                  href="/privacidad"
                  className="font-semibold text-emerald-700 hover:underline"
                >
                  política de privacidad
                </Link>

                {" "}de RUTABOL-SCZ.

              </div>

            </div>

            {/* Mensaje de error */}

            {error && (
              <div className="mt-4">
                <ErrorNote text={error} />
              </div>
            )}

            {/* Botón principal */}

            <div className="mt-5">

              <SubmitButton
                busy={busy}
                busyText="Creando tu cuenta..."
                tone="emerald"
                icon={UserPlus}
                disabled={
                  photoLoading ||
                  (
                    student &&
                    (
                      catalog.loading ||
                      !!catalog.error ||
                      !options.length
                    )
                  )
                }
              >
                Crear mi cuenta
              </SubmitButton>

            </div>

            {/* Acceso para usuarios registrados */}

            <div className="mt-5 border-t border-slate-100 pt-5 text-center">

              <p className="text-sm text-slate-500">

                ¿Ya tienes una cuenta?

                {" "}

                <Link
                  href="/acceso/pasajero"
                  className="inline-flex items-center gap-1 font-bold text-emerald-700 transition-colors hover:text-emerald-950 hover:underline"
                >

                  Iniciar sesión

                  <ArrowRight
                    size={15}
                    aria-hidden="true"
                  />

                </Link>

              </p>

            </div>

          </section>

        </form>

      </div>

    </AuthFrame>
  );
}
