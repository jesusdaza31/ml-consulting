const { requireAuth } = require('../../../../lib/auth');
const { supabaseAdmin } = require('../../../../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const courseId = req.query.id;

  await requireAuth(req, res, async () => {
    if (req.profile.role !== 'client') {
      return res.status(403).json({ error: 'Solo los clientes pueden solicitar' });
    }

    const userId = req.user.id;

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', courseId)
      .single();

    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const { data: existing } = await supabaseAdmin
      .from('inscripciones')
      .select('id, estado')
      .eq('course_id', courseId)
      .eq('client_id', userId)
      .in('estado', ['pendiente', 'activo'])
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'Ya solicitado o inscrito' });

    const { data: inscripcion, error } = await supabaseAdmin
      .from('inscripciones')
      .insert({
        course_id: courseId,
        client_id: userId,
        estado: 'pendiente',
        fecha_inscripcion: new Date().toISOString(),
        horas_usadas: 0
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ inscripcion });
  });
};
