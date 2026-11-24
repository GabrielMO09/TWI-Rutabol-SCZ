BEGIN;
SET LOCAL search_path TO transporte, public;
-- SOLO DATOS DE PRUEBA, no usar en produccion.

INSERT INTO linea (numero, nombre) VALUES
  ('17', 'Línea 17 - Norte'),
  ('44', 'Línea 44 - Sur'),
  ('11', 'Línea 11 - Este');

INSERT INTO ruta (id_linea, nombre, origen, destino, sentido)
SELECT l.id_linea, 'Recorrido', 'Centro', d.destino, 'circular'
FROM linea l
JOIN (VALUES ('17', 'Zona norte'), ('44', 'Zona sur'), ('11', 'Zona este'))
  AS d(numero, destino) ON d.numero = l.numero;

CREATE TEMP TABLE puntos(numero, orden, latitud, longitud, descripcion) AS VALUES
  ('17'::text, 1, -17.7834::numeric, -63.1821::numeric, 'Centro'::text),
  ('17', 2, -17.7700, -63.1790, 'Norte intermedio'),
  ('17', 3, -17.7560, -63.1760, 'Norte exterior'),
  ('17', 4, -17.7420, -63.1730, 'Terminal de prueba norte'),
  ('44', 1, -17.7834, -63.1821, 'Centro'),
  ('44', 2, -17.7990, -63.1800, 'Sur intermedio'),
  ('44', 3, -17.8150, -63.1760, 'Sur exterior'),
  ('44', 4, -17.8310, -63.1720, 'Terminal de prueba sur'),
  ('11', 1, -17.7834, -63.1821, 'Centro'),
  ('11', 2, -17.7850, -63.1620, 'Este intermedio'),
  ('11', 3, -17.7880, -63.1430, 'Este exterior'),
  ('11', 4, -17.7900, -63.1260, 'Terminal de prueba este');

INSERT INTO punto_ruta (id_ruta, orden, latitud, longitud, tipo, descripcion)
SELECT r.id_ruta, p.orden, p.latitud, p.longitud,
       CASE p.orden WHEN 1 THEN 'inicio' WHEN 4 THEN 'destino' ELSE 'parada' END, p.descripcion
FROM puntos p
JOIN linea l ON l.numero = p.numero
JOIN ruta r ON r.id_linea = l.id_linea AND r.nombre = 'Recorrido';

-- Paradas publicadas: los puntos intermedios del recorrido.
INSERT INTO parada (id_parada, id_linea, nombre, referencia, latitud, longitud, orden)
SELECT 'DEMO-STOP-' || l.numero || '-' || p.orden, l.id_linea, p.descripcion, l.nombre,
       p.latitud, p.longitud, p.orden
FROM puntos p JOIN linea l ON l.numero = p.numero
WHERE p.orden IN (2, 3);

INSERT INTO unidad_transporte (id_linea, numero_interno, placa, capacidad_maxima)
SELECT l.id_linea, d.interno, d.placa, d.capacidad
FROM (VALUES
  ('17', '045', '2345-ABC', 25),
  ('17', '078', '2346-BCD', 20),
  ('44', '057', '2347-CDE', 22),
  ('11', '033', '2348-DEF', 18),
  ('11', '099', '2349-EFG', 25)
) AS d(numero, interno, placa, capacidad)
JOIN linea l ON l.numero = d.numero;
COMMIT;
