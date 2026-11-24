BEGIN;
SET LOCAL search_path TO academico, public;
-- SOLO DATOS DE PRUEBA, no usar en produccion.

-- Universidades de Santa Cruz de la Sierra. El orden fija los id (1..19): bd/rutabol/02_datos.sql usa 1 (UPDS).
INSERT INTO institucion_educativa(nombre,tipo,dominio_correo,dominios_alternos) VALUES
 ('Universidad Privada Domingo Savio (UPDS)','universitaria','upds.edu.bo','{upds.net.bo}'),
 ('Universidad Autonoma Gabriel Rene Moreno (UAGRM)','universitaria','uagrm.edu.bo','{}'),
 ('Universidad Tecnologica Privada de Santa Cruz (UTEPSA)','universitaria','utepsa.edu','{}'),
 ('Universidad Privada de Santa Cruz de la Sierra (UPSA)','universitaria','upsa.edu.bo','{}'),
 ('Universidad Franz Tamayo (UNIFRANZ)','universitaria','unifranz.edu.bo','{}'),
 ('Universidad Catolica Boliviana (UCB)','universitaria','ucb.edu.bo','{}'),
 ('Universidad NUR','universitaria','nur.edu','{}'),
 ('Universidad de Aquino Bolivia (UDABOL)','universitaria','udabol.edu.bo','{}'),
 ('Universidad Cristiana de Bolivia (UCEBOL)','universitaria','ucebol.edu.bo','{}'),
 ('Universidad del Valle (UNIVALLE)','universitaria','univalle.edu','{}'),
 ('Escuela Militar de Ingenieria (EMI)','universitaria','emi.edu.bo','{}'),
 ('Universidad Privada Boliviana (UPB)','universitaria','upb.edu','{}'),
 ('Universidad Unibeth (UNIBETH)','universitaria','unibeth.edu.bo','{}'),
 ('Universidad Ecologica','universitaria','uecologica.edu.bo','{}'),
 ('Universidad Evangelica Boliviana (UEB)','universitaria','ueb.edu.bo','{}'),
 ('Universidad Salesiana de Bolivia','universitaria','usalesiana.edu.bo','{}'),
 ('Universidad Cumbre','universitaria','cumbre.edu.bo','{}'),
 ('Universidad UNO','universitaria','uno.edu.bo','{}'),            -- verificar el nombre completo
 ('Universidad para el Desarrollo y la Innovacion (UNID)','universitaria','unid.edu.bo','{}');

-- Escolares: cada unidad educativa se agrega aqui o desde el Centro de Control.
INSERT INTO institucion_educativa(nombre,tipo,dominio_correo) VALUES
 ('Unidad educativa (por completar)','secundaria',NULL);

-- Estudiantes de prueba (el codigo institucional de los demo coincide con su correo, como en el backend).
INSERT INTO estudiante(id_institucion,nombre_completo,nivel,rude,codigo_institucional,correo_institucional,programa)
SELECT i.id_institucion, d.nombre, d.nivel, d.rude, d.codigo, d.correo, d.programa
FROM (VALUES
  ('Universidad Privada Domingo Savio (UPDS)', 'Estudiante de Prueba', 'universitario', NULL,
   'estudiante@upds.edu.bo', 'estudiante@upds.edu.bo', 'Ingeniería de Sistemas'),
  ('Universidad Privada Domingo Savio (UPDS)', 'Lucía Vaca', 'universitario', NULL,
   'lucia.vaca@upds.edu.bo', 'lucia.vaca@upds.edu.bo', 'Ingeniería de Sistemas'),
  ('Universidad Autonoma Gabriel Rene Moreno (UAGRM)', 'Marcelo Rojas', 'universitario', NULL,
   '218001234', 'marcelo.rojas@uagrm.edu.bo', 'Ingeniería Informática'),
  ('Universidad Privada de Santa Cruz de la Sierra (UPSA)', 'Andrea Suárez', 'universitario', NULL,
   'UPSA-2024-0456', 'andrea.suarez@upsa.edu.bo', 'Administración de Empresas'),
  ('Unidad educativa (por completar)', 'Diego Salvatierra', 'secundario', 'RUDE80480123', NULL, NULL, '6° de secundaria')
) AS d(institucion, nombre, nivel, rude, codigo, correo, programa)
JOIN institucion_educativa i ON i.nombre = d.institucion;
-- Más estudiantes de prueba (nombres inventados), al menos uno por universidad y algunos escolares.
INSERT INTO estudiante(id_institucion,nombre_completo,nivel,rude,codigo_institucional,correo_institucional,programa)
SELECT i.id_institucion, d.nombre, 'universitario', NULL, d.codigo, d.usuario || '@' || d.dominio, d.programa
FROM (VALUES
  ('upds.edu.bo',        'Camila Rivero',       'camila.rivero',       'UPDS-2023-1001', 'Derecho'),
  ('upds.net.bo',        'Bruno Echeverría',    'bruno.echeverria',    'UPDS-2022-2002', 'Administración de Empresas'),
  ('uagrm.edu.bo',       'Valeria Montero',     'valeria.montero',     '219004567',      'Medicina'),
  ('uagrm.edu.bo',       'Jhon Cuéllar',        'jhon.cuellar',        '220007890',      'Arquitectura'),
  ('utepsa.edu',         'Sofía Barba',         'sofia.barba',         'UTP-2024-0301',  'Ingeniería Comercial'),
  ('upsa.edu.bo',        'Mateo Peña',          'mateo.pena',          'UPSA-2023-0789', 'Ingeniería Industrial'),
  ('unifranz.edu.bo',    'Daniela Roca',        'daniela.roca',        'UNF-2024-0412',  'Psicología'),
  ('ucb.edu.bo',         'Sebastián Vargas',    'sebastian.vargas',    'UCB-2022-0555',  'Ingeniería Civil'),
  ('nur.edu',            'Lorena Chávez',       'lorena.chavez',       'NUR-2023-0621',  'Comunicación Social'),
  ('udabol.edu.bo',      'Gustavo Flores',      'gustavo.flores',      'UDB-2024-0188',  'Contaduría Pública'),
  ('ucebol.edu.bo',      'Natalia Suárez',      'natalia.suarez',      'UCE-2023-0344',  'Educación'),
  ('univalle.edu',       'Rodrigo Añez',        'rodrigo.anez',        'UVA-2022-0912',  'Ingeniería Electrónica'),
  ('emi.edu.bo',         'Marco Antelo',        'marco.antelo',        'EMI-2024-0076',  'Ingeniería de Sistemas'),
  ('upb.edu',            'Paola Justiniano',    'paola.justiniano',    'UPB-2023-0203',  'Ingeniería Mecatrónica'),
  ('unibeth.edu.bo',     'Iván Soliz',          'ivan.soliz',          'UNB-2024-0131',  'Enfermería'),
  ('uecologica.edu.bo',  'Alejandra Durán',     'alejandra.duran',     'UEC-2023-0258',  'Ingeniería Ambiental'),
  ('ueb.edu.bo',         'Samuel Ribera',       'samuel.ribera',       'UEB-2022-0467',  'Teología'),
  ('usalesiana.edu.bo',  'Fabiola Mendoza',     'fabiola.mendoza',     'USB-2024-0094',  'Ingeniería Agroindustrial'),
  ('cumbre.edu.bo',      'Diego Parada',        'diego.parada',        'CUM-2023-0310',  'Turismo'),
  ('uno.edu.bo',         'Karen Vaca',          'karen.vaca',          'UNO-2024-0045',  'Administración'),
  ('unid.edu.bo',        'Hugo Salvatierra',    'hugo.salvatierra',    'UNI-2023-0157',  'Ingeniería de Software')
) AS d(dominio, nombre, usuario, codigo, programa)
JOIN institucion_educativa i ON d.dominio IN (i.dominio_correo) OR d.dominio = ANY(i.dominios_alternos)
ON CONFLICT DO NOTHING;

INSERT INTO estudiante(id_institucion,nombre_completo,nivel,rude,programa)
SELECT i.id_institucion, d.nombre, 'secundario', d.rude, d.curso
FROM (VALUES
  ('Mariana Choque',   'RUDE80480124', '5° de secundaria'),
  ('Joaquín Egüez',    'RUDE80480125', '4° de secundaria'),
  ('Brenda Cuéllar',   'RUDE80480126', '6° de secundaria'),
  ('Álvaro Terrazas',  'RUDE80480127', '3° de secundaria'),
  ('Ximena Roca',      'RUDE80480128', '2° de secundaria'),
  ('Leonardo Mamani',  'RUDE80480129', '6° de secundaria')
) AS d(nombre, rude, curso)
JOIN institucion_educativa i ON i.nombre = 'Unidad educativa (por completar)'
ON CONFLICT DO NOTHING;
COMMIT;
