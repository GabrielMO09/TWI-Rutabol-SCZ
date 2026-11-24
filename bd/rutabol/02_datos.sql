BEGIN;
SET LOCAL search_path TO rutabol, public;

-- Claves de prueba: pasajeros 123456, control control123, choferes PIN 1234.
-- SOLO DATOS DE PRUEBA, no usar en produccion
-- Compatible con encodeSecret/decodeSecret: scrypt$sal$hash_hex.
-- Se recalculó el hash con Node.js para 123456 usando la sal como texto, igual que el backend.

INSERT INTO usuario (
  identificador, nombre_completo, correo, codigo, categoria, password_hash,
  acepto_terminos_en, creado_en
)
SELECT d.identificador, d.nombre, d.correo, d.codigo, d.categoria,
       CASE WHEN d.identificador = 'control@rutabol.bo' THEN 'scrypt$e4cf78189a244b85340321a07d34c1$5bb86bb55fabd42e551f0c493f26f3d754a1bf439dcc707f3cf32ededa0fa3ac9b8da5d2346e5083d54a47662560c60e5f3719d52e7432521879b867176fcf23'
            WHEN d.identificador LIKE 'chofer:%' THEN 'scrypt$e4cf78189a244b85340321a07d34c1$1597fcd47cdadc5a2d1413a53d9eb68b2374a6b5e86f711550d8e3d4c0d746d14f8174879c2c18cb4253ef244a0ab7f41726452b382275bf6c77ff0cd517c741'
            ELSE 'scrypt$e4cf78189a244b85340321a07d34c1$54a391c0d7178a14a2d5979c57ebe7d9873796e1d52d5f1c5170fc021585c724fa653c72a0cd6aa51dc360e9aee5e053e1ad0327339718d6e0f997423d76b2a6' END,
       now() - interval '30 days', now() - interval '30 days'
FROM (VALUES
  ('estudiante@upds.edu.bo', 'Estudiante de Prueba', 'estudiante@upds.edu.bo', 'estudiante@upds.edu.bo', 'universitario'),
  ('rude80480123', 'Diego Salvatierra', NULL, 'RUDE80480123', 'escolar'),
  ('lucia.vaca@upds.edu.bo', 'Lucía Vaca', 'lucia.vaca@upds.edu.bo', 'lucia.vaca@upds.edu.bo', 'universitario'),
  ('7654321', 'Pasajero General', NULL, '7654321', 'general'),
  ('control@rutabol.bo', 'Centro de Control', 'control@rutabol.bo', NULL, NULL),
  ('chofer:17-045', 'Carlos Mamani', NULL, '17-045', NULL),
  ('chofer:44-057', 'Raúl Justiniano', NULL, '44-057', NULL),
  ('chofer:11-033', 'José Taborga', NULL, '11-033', NULL)
) AS d(identificador, nombre, correo, codigo, categoria);

INSERT INTO usuario_rol (id_usuario, id_rol)
SELECT u.id_usuario, r.id_rol
FROM usuario u
JOIN rol r ON r.nombre = CASE
  WHEN u.identificador = 'control@rutabol.bo' THEN 'control'
  WHEN u.identificador IN ('chofer:17-045', 'chofer:44-057', 'chofer:11-033') THEN 'chofer'
  ELSE 'pasajero'
END;

-- Credenciales históricas para probar consultas de expiración y uso.
-- La tabla sesion se llena al iniciar sesión.
INSERT INTO recuperacion_clave (
  id_usuario, token_hash, expiracion, intentos, utilizado, creado_en
)
SELECT id_usuario, encode(sha256(convert_to('demo-recuperacion-expirada', 'UTF8')), 'hex'),
       now() - interval '2 days' + interval '10 minutes', 1, true, now() - interval '2 days'
FROM usuario WHERE identificador = '7654321';

INSERT INTO credencial_qr (id_credencial, id_usuario, expira_en, usado_en)
SELECT 'demo-qr-estudiante', id_usuario, now() - interval '9 minutes', now() - interval '10 minutes'
FROM usuario WHERE identificador = 'estudiante@upds.edu.bo';

-- Validación estudiantil. El registro oficial está en registro_academico (bd/academico/02_datos.sql):
-- aquí solo el vínculo. id_institucion 1 = UPDS y 20 = unidad educativa de prueba (orden de ese seed).
INSERT INTO estudiante (
  id_usuario, id_institucion, institucion_nombre, nivel, rude, codigo_institucional, correo_institucional
)
SELECT u.id_usuario, d.id_institucion, d.institucion, d.nivel, d.rude, d.codigo, d.correo
FROM (VALUES
  ('estudiante@upds.edu.bo', 1, 'Universidad Privada Domingo Savio (UPDS)', 'universitario',
   NULL, 'estudiante@upds.edu.bo', 'estudiante@upds.edu.bo'),
  ('rude80480123', 20, 'Unidad educativa (por completar)', 'secundario',
   'RUDE80480123', NULL, NULL),
  ('lucia.vaca@upds.edu.bo', 1, 'Universidad Privada Domingo Savio (UPDS)', 'universitario',
   NULL, 'lucia.vaca@upds.edu.bo', 'lucia.vaca@upds.edu.bo')
) AS d(identificador, id_institucion, institucion, nivel, rude, codigo, correo)
JOIN usuario u ON u.identificador = d.identificador;

INSERT INTO solicitud_validacion (
  id_estudiante, fecha_solicitud, estado, ref_app, correo_verificado,
  fecha_resolucion, id_revisor, vigencia_hasta
)
SELECT e.id_estudiante, now() - interval '20 days', d.estado, d.ref, d.verificado,
       CASE WHEN d.estado = 'aprobada' THEN now() - interval '19 days' END,
       CASE WHEN d.estado = 'aprobada' THEN c.id_usuario END,
       CASE WHEN d.estado = 'aprobada' THEN now() + interval '180 days' END
FROM (VALUES
  ('estudiante@upds.edu.bo', 'DEMO-AC-UPDS', 'aprobada', true),
  ('rude80480123', 'DEMO-AC-RUDE', 'aprobada', false),
  ('lucia.vaca@upds.edu.bo', 'DEMO-AC-LUCIA', 'pendiente', false)
) AS d(identificador, ref, estado, verificado)
JOIN usuario u ON u.identificador = d.identificador
JOIN estudiante e ON e.id_usuario = u.id_usuario
JOIN usuario c ON c.identificador = 'control@rutabol.bo';

-- Referencias espejo de registro_transporte (bd/transporte/02_datos.sql): líneas y puntos del recorrido.
INSERT INTO linea (numero, nombre) VALUES
  ('17', 'Línea 17 - Norte'),
  ('44', 'Línea 44 - Sur'),
  ('11', 'Línea 11 - Este');

-- Puntos del recorrido solo para generar GPS e incidencias de prueba (el trazado oficial vive en registro_transporte).
CREATE TEMP TABLE puntos(numero, orden, latitud, longitud) AS VALUES
  ('17'::text, 1, -17.7834::numeric, -63.1821::numeric),
  ('17', 2, -17.7700, -63.1790), ('17', 3, -17.7560, -63.1760), ('17', 4, -17.7420, -63.1730),
  ('44', 1, -17.7834, -63.1821), ('44', 2, -17.7990, -63.1800),
  ('44', 3, -17.8150, -63.1760), ('44', 4, -17.8310, -63.1720),
  ('11', 1, -17.7834, -63.1821), ('11', 2, -17.7850, -63.1620),
  ('11', 3, -17.7880, -63.1430), ('11', 4, -17.7900, -63.1260);

-- Micros, conductores y viajes.
INSERT INTO unidad_transporte (id_linea, numero_interno, placa, capacidad_maxima, estado_operativo)
SELECT l.id_linea, d.interno, d.placa, d.capacidad, d.estado
FROM (VALUES
  ('17', '045', '2345-ABC', 25, 'activo'),
  ('17', '078', '2346-BCD', 20, 'activo'),
  ('44', '057', '2347-CDE', 22, 'activo'),
  ('11', '033', '2348-DEF', 18, 'activo'),
  ('11', '099', '2349-EFG', 25, 'activo')
) AS d(numero, interno, placa, capacidad, estado)
JOIN linea l ON l.numero = d.numero;

INSERT INTO conductor (id_usuario, licencia, habilitado, licencia_vigente_hasta)
SELECT id_usuario, 'DEMO-' || codigo, true, CURRENT_DATE + 365
FROM usuario WHERE identificador IN ('chofer:17-045', 'chofer:44-057', 'chofer:11-033');

INSERT INTO asignacion_conductor (id_conductor, id_unidad, fecha_inicio)
SELECT c.id_conductor, b.id_unidad, now() - interval '7 days'
FROM conductor c
JOIN usuario u ON u.id_usuario = c.id_usuario
JOIN linea l ON l.numero = split_part(u.codigo, '-', 1)
JOIN unidad_transporte b ON b.id_linea = l.id_linea
  AND b.numero_interno = split_part(u.codigo, '-', 2);

INSERT INTO viaje (id_linea, ruta_nombre, id_asignacion, fecha_inicio, fecha_fin, estado)
SELECT b.id_linea, l.nombre, a.id_asignacion, now() - interval '1 day 1 hour',
       now() - interval '1 day', 'finalizado'
FROM asignacion_conductor a
JOIN unidad_transporte b ON b.id_unidad = a.id_unidad
JOIN linea l ON l.id_linea = b.id_linea;

INSERT INTO viaje (id_linea, ruta_nombre, id_asignacion, fecha_inicio)
SELECT b.id_linea, l.nombre, a.id_asignacion, now() - interval '40 minutes'
FROM asignacion_conductor a
JOIN unidad_transporte b ON b.id_unidad = a.id_unidad
JOIN linea l ON l.id_linea = b.id_linea;

INSERT INTO ubicacion_gps (id_viaje, latitud, longitud, fecha_hora, precision_m)
SELECT v.id_viaje, p.latitud, p.longitud,
       v.fecha_inicio + (p.orden - 1) * interval '10 minutes', 8.00
FROM viaje v
JOIN linea l ON l.id_linea = v.id_linea
JOIN puntos p ON p.numero = l.numero
WHERE v.estado = 'finalizado' OR p.orden <= 2;

INSERT INTO registro_ocupacion (
  ref_app, id_unidad, id_viaje, tipo, ocupacion_anterior,
  ocupacion_resultante, motivo, id_usuario, fecha_hora
)
SELECT 'DEMO-OC-' || l.numero || '-' || b.numero_interno, b.id_unidad, v.id_viaje,
       'correccion', 0, d.ocupacion, 'Conteo de pasajeros a bordo',
       c.id_usuario, now() - interval '5 minutes'
FROM (VALUES
  ('17', '045', 12), ('17', '078', 17), ('44', '057', 9), ('11', '033', 6), ('11', '099', 2)
) AS d(numero, interno, ocupacion)
JOIN linea l ON l.numero = d.numero
JOIN unidad_transporte b ON b.id_linea = l.id_linea AND b.numero_interno = d.interno
LEFT JOIN asignacion_conductor a ON a.id_unidad = b.id_unidad AND a.estado = 'activa'
LEFT JOIN conductor c ON c.id_conductor = a.id_conductor
LEFT JOIN viaje v ON v.id_asignacion = a.id_asignacion AND v.estado = 'activo';

-- Incidencias e historial de atención.
INSERT INTO incidencia (
  ref_app, id_unidad, id_viaje, id_reportante, tipo, severidad,
  descripcion, latitud, longitud, fecha, estado
)
SELECT d.ref, b.id_unidad, v.id_viaje, c.id_usuario, d.tipo, d.severidad,
       d.descripcion, p.latitud, p.longitud, now() - d.antiguedad, d.estado
FROM (VALUES
  ('DEMO-INC-17', '17', 'finalizado', 'falla_mecanica', 'media',
   'La unidad se detuvo por una falla de refrigeración.', interval '1 day 25 minutes', 'resuelta'),
  ('DEMO-INC-44', '44', 'activo', 'bloqueo', 'media',
   'El conductor reportó un bloqueo parcial de la vía.', interval '12 minutes', 'en_atencion')
) AS d(ref, numero, estado_viaje, tipo, severidad, descripcion, antiguedad, estado)
JOIN linea l ON l.numero = d.numero
JOIN viaje v ON v.id_linea = l.id_linea AND v.estado = d.estado_viaje
JOIN asignacion_conductor a ON a.id_asignacion = v.id_asignacion
JOIN unidad_transporte b ON b.id_unidad = a.id_unidad
JOIN conductor c ON c.id_conductor = a.id_conductor
JOIN puntos p ON p.numero = l.numero AND p.orden = 2;

INSERT INTO historial_incidencia (id_incidencia, estado, id_usuario, fecha)
SELECT id_incidencia, 'reportada', id_reportante, fecha
FROM incidencia WHERE ref_app IN ('DEMO-INC-17', 'DEMO-INC-44')
UNION ALL
SELECT i.id_incidencia, i.estado, c.id_usuario, i.fecha + interval '6 minutes'
FROM incidencia i
JOIN usuario c ON c.identificador = 'control@rutabol.bo'
WHERE i.ref_app IN ('DEMO-INC-17', 'DEMO-INC-44');

INSERT INTO alerta (ref_app, id_unidad, tipo, mensaje, fecha, atendida_en)
SELECT 'DEMO-AL-' || split_part(ref_app, '-', 3), id_unidad, 'incidente', descripcion, fecha,
       CASE WHEN estado = 'resuelta' THEN fecha + interval '6 minutes' END
FROM incidencia WHERE ref_app IN ('DEMO-INC-17', 'DEMO-INC-44');

-- Tarjetas, recargas y pasajes. Los importes pasan por las funciones del esquema.
INSERT INTO tarjeta_credicard (id_usuario, identificador, creada_en)
SELECT u.id_usuario, 'CRD-0000-0000-' || d.sufijo, now() - interval '21 days'
FROM (VALUES
  ('estudiante@upds.edu.bo', '8101'),
  ('rude80480123', '8102'),
  ('lucia.vaca@upds.edu.bo', '8103'),
  ('7654321', '8104')
) AS d(identificador, sufijo)
JOIN usuario u ON u.identificador = d.identificador;

SELECT registrar_movimiento(jsonb_build_object(
  'ref', 'DEMO-REC-' || d.numero, 'usuario', d.identificador,
  'tipo', 'recarga', 'estado', 'confirmado', 'monto', d.monto,
  'fecha', extract(epoch FROM (now() - interval '2 days')) * 1000,
  'canal', 'efectivo', 'motivo', 'Carga inicial de prueba'
))
FROM (VALUES
  ('01', 'estudiante@upds.edu.bo', 20.00),
  ('02', 'rude80480123', 15.00),
  ('03', 'lucia.vaca@upds.edu.bo', 10.00),
  ('04', '7654321', 30.00)
) AS d(numero, identificador, monto);

DO $$
DECLARE
  p record;
  importe numeric(12,2);
  fecha_ms numeric;
BEGIN
  FOR p IN
    SELECT *
    FROM (VALUES
      ('01', 'estudiante@upds.edu.bo', '17', '045', 'credicard', 'universitario',
       'Validación universitaria vigente', interval '1 day 35 minutes',
       'pase_temporal', '17', '078', 'DEMO-PASE-17'),
      ('02', 'rude80480123', '44', '057', 'credicard', 'escolar',
       'Validación escolar vigente', interval '20 minutes',
       'abordado', NULL, NULL, NULL),
      ('03', 'lucia.vaca@upds.edu.bo', '11', '033', 'credicard', 'general',
       'Validación universitaria pendiente', interval '17 minutes',
       'abordado', NULL, NULL, NULL),
      ('04', '7654321', '17', '045', 'efectivo', 'general',
       'Tarifa general', interval '10 minutes',
       'abordado', NULL, NULL, NULL)
    ) AS d(numero, identificador, linea, interno, metodo, categoria, razon, antiguedad,
           estado_abordaje, linea_destino, interno_destino, codigo_pase)
  LOOP
    SELECT t.monto INTO STRICT importe
    FROM tarifa t
    JOIN categoria_pasajero c ON c.id_categoria = t.id_categoria
    WHERE c.nombre = p.categoria AND t.vigente_hasta IS NULL;

    fecha_ms := extract(epoch FROM (now() - p.antiguedad)) * 1000;

    IF p.metodo = 'credicard' THEN
      PERFORM registrar_movimiento(jsonb_build_object(
        'ref', 'DEMO-TKT-' || p.numero, 'usuario', p.identificador,
        'tipo', 'pasaje', 'estado', 'confirmado', 'monto', -importe,
        'fecha', fecha_ms
      ));
    END IF;

    PERFORM registrar_ticket(jsonb_build_object(
      'ref', 'DEMO-TKT-' || p.numero, 'usuario', p.identificador,
      'linea', p.linea, 'interno', p.interno, 'metodo', p.metodo,
      'monto', importe, 'categoria', p.categoria, 'razon', p.razon,
      'fecha', fecha_ms, 'comprobante', 'R-DEMO-' || p.numero,
      'estado_abordaje', p.estado_abordaje, 'linea_destino', p.linea_destino,
      'interno_destino', p.interno_destino, 'codigo_pase', p.codigo_pase
    ));
  END LOOP;
END $$;

-- Trasbordo histórico por incidencia y pase canjeado.
INSERT INTO trasbordo (
  ref_app, motivo, id_incidencia, id_unidad_origen, id_unidad_destino,
  id_autorizador, fecha, pasajeros, monto_total, acreditado_a
)
SELECT 'DEMO-TR-17', 'incidencia', i.id_incidencia, t.id_unidad, t.id_unidad_destino,
       u.id_usuario, i.fecha + interval '2 minutes', 1, t.monto, 'saliente'
FROM incidencia i
JOIN transaccion_pago t ON t.id_unidad = i.id_unidad AND t.ref_app = 'DEMO-TKT-01'
JOIN usuario u ON u.identificador = 'control@rutabol.bo'
WHERE i.ref_app = 'DEMO-INC-17';

INSERT INTO pase_temporal (
  ref_app, codigo, id_unidad_origen, id_unidad_destino, expira_en, usado_en
)
SELECT 'DEMO-PASE-17', t.codigo_pase, tr.id_unidad_origen, tr.id_unidad_destino,
       tr.fecha + interval '30 minutes', tr.fecha + interval '3 minutes'
FROM trasbordo tr
JOIN transaccion_pago t ON t.ref_app = 'DEMO-TKT-01'
WHERE tr.ref_app = 'DEMO-TR-17';

-- Reclamos relacionados con pasajes y seguimiento del Centro de Control.
INSERT INTO reclamo (
  ref_app, id_usuario, id_linea, id_unidad, id_viaje, id_transaccion, tipo,
  descripcion, fecha_hecho, fecha, actualizado_en, estado
)
SELECT d.ref, t.id_usuario, b.id_linea, b.id_unidad, v.id_viaje, t.id_transaccion,
       d.tipo, d.descripcion, d.hecho, d.hecho + interval '5 minutes',
       CASE WHEN d.estado = 'en_revision' THEN d.hecho + interval '20 minutes'
            ELSE d.hecho + interval '5 minutes' END,
       d.estado
FROM (VALUES
  ('DEMO-REC-TRAYECTO', 'DEMO-TKT-01', 'finalizado', 'recorrido',
   'La unidad de reemplazo omitió una parada del recorrido.', now() - interval '1 day 15 minutes', 'en_revision'),
  ('DEMO-REC-TARIFA', 'DEMO-TKT-03', 'activo', 'tarifa_negada',
   'La pasajera solicita revisar el cobro mientras su validación está pendiente.', now() - interval '17 minutes', 'recibido')
) AS d(ref, ticket, estado_viaje, tipo, descripcion, hecho, estado)
JOIN transaccion_pago t ON t.ref_app = d.ticket
JOIN unidad_transporte b ON b.id_unidad = t.id_unidad
JOIN asignacion_conductor a ON a.id_unidad = b.id_unidad AND a.estado = 'activa'
JOIN viaje v ON v.id_asignacion = a.id_asignacion AND v.estado = d.estado_viaje;

INSERT INTO seguimiento_reclamo (id_reclamo, id_administrador, estado_nuevo, accion, fecha)
SELECT r.id_reclamo, u.id_usuario, r.estado,
       'Se solicitó revisar el recorrido de la unidad de reemplazo.', r.actualizado_en
FROM reclamo r
JOIN usuario u ON u.identificador = 'control@rutabol.bo'
WHERE r.ref_app = 'DEMO-REC-TRAYECTO';

-- Notificaciones y trazabilidad.
INSERT INTO notificacion (ref_app, id_usuario, tipo, titulo, mensaje, fecha)
SELECT 'DEMO-NOT-AC', e.id_usuario, 'acreditacion',
       'Validación aprobada', 'Ya puedes usar la tarifa universitaria.', s.fecha_resolucion
FROM solicitud_validacion s
JOIN estudiante e ON e.id_estudiante = s.id_estudiante
WHERE s.ref_app = 'DEMO-AC-UPDS'
UNION ALL
SELECT 'DEMO-NOT-RECLAMO', id_usuario, 'reclamo',
       'Reclamo en revisión', 'El Centro de Control está revisando el recorrido.', actualizado_en
FROM reclamo WHERE ref_app = 'DEMO-REC-TRAYECTO';

INSERT INTO auditoria (
  ref_app, id_usuario, rol_actor, entidad, id_registro, accion, objetivo, detalle, fecha
)
SELECT 'DEMO-AUD-AC', s.id_revisor, 'control', 'solicitud_validacion', s.id_solicitud,
       'aprobar_validacion', s.ref_app, jsonb_build_object('estado', s.estado), s.fecha_resolucion
FROM solicitud_validacion s WHERE s.ref_app = 'DEMO-AC-UPDS'
UNION ALL
SELECT 'DEMO-AUD-RECLAMO', sg.id_administrador, 'control', 'reclamo', r.id_reclamo,
       'actualizar_reclamo', r.ref_app, jsonb_build_object('estado', sg.estado_nuevo), sg.fecha
FROM reclamo r
JOIN seguimiento_reclamo sg ON sg.id_reclamo = r.id_reclamo
WHERE r.ref_app = 'DEMO-REC-TRAYECTO';

COMMIT;
