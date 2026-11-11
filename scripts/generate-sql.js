const fs = require('fs');
const courses = require('../courses');

const c = courses.findCourse('47606ff5-c85d-4954-8b77-e98fbbf7105c');
const textItems = c.contenido.filter(it => it.tipo === 'texto').sort((a, b) => a.orden - b.orden);

let sql = `-- ====================================================================
-- SCRIPT MAESTRO COMPLETO: CURSO 1040 + MÓDULO 0 + MÓDULO 1 + INSCRIPCIONES
-- ====================================================================

DO $$
DECLARE
  v_course_id UUID := '47606ff5-c85d-4954-8b77-e98fbbf7105c';
BEGIN
  -- 1. Crear o actualizar el curso principal con su temario oficial
  INSERT INTO courses (
    id, nombre, tipo, descripcion, objetivo_general, resultado_esperado, 
    modulos, duracion_dias, created_at
  )
  VALUES (
    v_course_id,
    'Curso Profesional de Preparación de Impuestos Personales en EE.UU. (Form 1040)',
    'curso',
    'Formación integral para convertirte en preparador de impuestos profesional habilitado por el IRS. Aprende el marco legal de la profesión, trámite del PTIN, dominio del Form 1040, créditos familiares, trabajadores independientes, casos con ITIN, software profesional y estrategias comerciales para conseguir tus primeros clientes.',
    'Capacitar al estudiante para tramitar su PTIN ante el IRS, preparar y firmar declaraciones de impuestos personales (Form 1040 y anexos) con total apego normativo, y construir una práctica tributaria rentable y ética.',
    'Al finalizar el curso completo, tendrás tu PTIN activo, sabrás preparar declaraciones W-2, trabajadores por cuenta propia (Schedule C), casos con ITIN e inversiones, manejarás software profesional y contarás con una estrategia clara para captar y atender a tus primeros clientes.',
    '[
      "Módulo 0 — Orientación y fundamentos legales",
      "Módulo 1 — Fundamentos del Form 1040",
      "Módulo 2 — Trabajadores independientes y pequeños negocios",
      "Módulo 3 — Situaciones especiales",
      "Módulo 4 — Software y flujo de trabajo profesional",
      "Módulo 5 — Construir el negocio"
    ]'::jsonb,
    365,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    objetivo_general = EXCLUDED.objetivo_general,
    resultado_esperado = EXCLUDED.resultado_esperado,
    modulos = EXCLUDED.modulos,
    duracion_dias = 365;

  -- 2. Limpiar lecciones de texto anteriores para evitar duplicados
  DELETE FROM contenido WHERE course_id = v_course_id AND tipo = 'texto';

  -- 3. Insertar todas las lecciones del Módulo 0 y Módulo 1 (contenido completo)
  INSERT INTO contenido (course_id, tipo, titulo, texto, orden, width_pct)
  VALUES
`;

const values = textItems.map((it, i) => {
  const escapedTitle = it.titulo.replace(/'/g, "''");
  return `  (\n    v_course_id,\n    'texto',\n    '${escapedTitle}',\n    $lesson$${it.texto}$lesson$,\n    ${i + 1},\n    100\n  )`;
});

sql += values.join(',\n') + `;

  -- 4. Auto-inscribir a los usuarios existentes en estado 'activo' (sin usar ON CONFLICT)
  INSERT INTO inscripciones (course_id, client_id, estado, vencimiento, horas_usadas, created_at)
  SELECT 
    v_course_id, 
    p.id, 
    'activo', 
    NOW() + INTERVAL '365 days', 
    0, 
    NOW()
  FROM profiles p
  WHERE NOT EXISTS (
    SELECT 1 FROM inscripciones i 
    WHERE i.course_id = v_course_id 
      AND i.client_id = p.id 
      AND i.estado = 'activo'
  );

  RAISE NOTICE '¡Script maestro completado con éxito! % lecciones insertadas.', ${textItems.length};
END $$;
`;

fs.writeFileSync('scripts/seed-all-supabase.sql', sql, 'utf8');
console.log('Generated scripts/seed-all-supabase.sql with', textItems.length, 'lessons.');
