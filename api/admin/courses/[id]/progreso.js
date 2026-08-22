const { requireAuth, requireAdmin } = require('../../../lib/auth');
const { supabaseAdmin } = require('../../../lib/supabase');
const { getCourseWithDetails } = require('../index');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const courseId = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const { data: course } = await supabaseAdmin
        .from('courses')
        .select('id, tipo')
        .eq('id', courseId)
        .single();

      if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

      if (course.tipo !== 'servicio') {
        return res.status(400).json({ error: 'Solo los servicios registran horas de progreso.' });
      }

      const body = req.body || {};
      const clienteId = String(body.clienteId || '');
      const horasUsadas = Number(body.horasUsadas);

      if (!Number.isFinite(horasUsadas) || horasUsadas < 1) {
        return res.status(400).json({ error: 'Indica cuantas horas se usaron.' });
      }

      const { data: inscripcion } = await supabaseAdmin
        .from('inscripciones')
        .select('*')
        .eq('course_id', courseId)
        .eq('client_id', clienteId)
        .eq('estado', 'activo')
        .maybeSingle();

      if (!inscripcion) return res.status(404).json({ error: 'Inscripcion no encontrada' });

      const newHorasUsadas = Math.min(inscripcion.horas_asignadas, inscripcion.horas_usadas + horasUsadas);
      const newEstado = newHorasUsadas >= inscripcion.horas_asignadas ? 'completado' : 'activo';

      const { data: updated, error } = await supabaseAdmin
        .from('inscripciones')
        .update({
          horas_usadas: newHorasUsadas,
          estado: newEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', inscripcion.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });

      const detail = await getCourseWithDetails(courseId);
      res.json({ curso: detail.public, inscripcion: updated });
    });
  });
};
