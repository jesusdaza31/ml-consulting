const { requireAuth, requireAdmin } = require('../../../lib/auth');
const { supabaseAdmin } = require('../../../lib/supabase');
const { getCourseWithDetails } = require('../index');

const DAY_MS = 24 * 60 * 60 * 1000;

function calcularVencimiento(duracionDias) {
  return new Date(Date.now() + duracionDias * DAY_MS).toISOString();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const courseId = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

      const body = req.body || {};
      const clienteId = String(body.clienteId || '');

      if (!clienteId) return res.status(400).json({ error: 'Selecciona un cliente valido.' });

      const { data: cliente } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('id', clienteId)
        .single();

      if (!cliente || cliente.role !== 'client') {
        return res.status(400).json({ error: 'Selecciona un cliente valido.' });
      }

      const { data: existing } = await supabaseAdmin
        .from('inscripciones')
        .select('id')
        .eq('course_id', courseId)
        .eq('client_id', clienteId)
        .eq('estado', 'activo')
        .maybeSingle();

      if (existing) return res.status(409).json({ error: 'Ya inscrito' });

      if (course.tipo === 'curso' && course.cupo_max) {
        const { count } = await supabaseAdmin
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('estado', 'activo');

        if (count >= course.cupo_max) return res.status(409).json({ error: 'Curso completo' });
      }

      let horasAsignadas = null;
      if (course.tipo === 'servicio') {
        const horas = Number(body.horas);
        if (!Number.isFinite(horas) || horas < 1) {
          return res.status(400).json({ error: 'Se requieren horas para el servicio.' });
        }
        horasAsignadas = horas;
      }

      const vencimiento = calcularVencimiento(course.duracion_dias || 30);

      const { data: inscripcion, error } = await supabaseAdmin
        .from('inscripciones')
        .insert({
          course_id: courseId,
          client_id: clienteId,
          estado: 'activo',
          fecha_inscripcion: new Date().toISOString(),
          vencimiento,
          horas_asignadas: horasAsignadas,
          horas_usadas: 0
        })
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      const detail = await getCourseWithDetails(courseId);
      res.status(201).json({ curso: detail.public, inscripcion });
    });
  });
};
