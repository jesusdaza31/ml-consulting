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
        .select('id')
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

      const { data: updated, error } = await supabaseAdmin
        .from('inscripciones')
        .update({
          estado: 'cancelado',
          vencimiento: null,
          horas_asignadas: null,
          horas_usadas: 0,
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
