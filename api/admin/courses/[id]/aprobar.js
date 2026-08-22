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

      const clienteId = String((req.body || {}).clienteId || '');

      const { data: insc } = await supabaseAdmin
        .from('inscripciones')
        .select('*')
        .eq('course_id', courseId)
        .eq('client_id', clienteId)
        .eq('estado', 'pendiente')
        .maybeSingle();

      if (!insc) return res.status(404).json({ error: 'No hay una solicitud pendiente de este cliente' });

      if (course.tipo === 'curso' && course.cupo_max) {
        const { count } = await supabaseAdmin
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId)
          .eq('estado', 'activo');

        if (count >= course.cupo_max) return res.status(409).json({ error: 'Curso completo' });
      }

      const vencimiento = calcularVencimiento(course.duracion_dias || 30);
      const horasAsignadas = course.tipo === 'servicio' ? course.horas : null;

      const { data: updated, error } = await supabaseAdmin
        .from('inscripciones')
        .update({
          estado: 'activo',
          vencimiento,
          horas_asignadas: horasAsignadas,
          updated_at: new Date().toISOString()
        })
        .eq('id', insc.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      const detail = await getCourseWithDetails(courseId);
      res.json({ curso: detail.public, inscripcion: updated });
    });
  });
};
