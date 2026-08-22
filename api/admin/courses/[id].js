const { requireAuth, requireAdmin } = require('../../../lib/auth');
const { supabaseAdmin } = require('../../../lib/supabase');
const { getCourseWithDetails, validateCourseInput } = require('./index');

module.exports = async (req, res) => {
  const id = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      if (req.method === 'GET') {
        const detail = await getCourseWithDetails(id);
        if (!detail) return res.status(404).json({ error: 'Curso no encontrado' });
        res.json({ curso: detail.public });

      } else if (req.method === 'PUT') {
        const validated = validateCourseInput(req.body || {});
        if (validated.error) return res.status(400).json({ error: validated.error });

        const v = validated.value;
        const { data: course, error } = await supabaseAdmin
          .from('courses')
          .update({
            nombre: v.nombre,
            tipo: v.tipo,
            descripcion: v.descripcion,
            objetivo_general: v.objetivoGeneral,
            resultado_esperado: v.resultadoEsperado,
            modulos: v.modulos,
            cupo_max: v.cupoMax,
            horas: v.horas,
            duracion_dias: v.duracionDias,
            price: v.price,
            payment_link: v.paymentLink,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) return res.status(500).json({ error: error.message });
        if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

        const detail = await getCourseWithDetails(id);
        res.json({ curso: detail.public });

      } else if (req.method === 'DELETE') {
        const { error } = await supabaseAdmin
          .from('courses')
          .delete()
          .eq('id', id);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ ok: true });

      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });
  });
};
