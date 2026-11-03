const { requireAuth, requireAdmin } = require('../../../lib/auth');
const { supabaseAdmin } = require('../../../lib/supabase');

const DAY_MS = 24 * 60 * 60 * 1000;

function calcularVencimiento(duracionDias) {
  return new Date(Date.now() + (duracionDias || 30) * DAY_MS).toISOString();
}

module.exports = async (req, res) => {
  const paymentId = req.query.id;

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      if (req.method === 'PUT') {
        const body = req.body || {};

        const { data: existingPay, error: findErr } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('id', paymentId)
          .single();

        if (findErr || !existingPay) {
          return res.status(404).json({ error: 'Pago no encontrado' });
        }

        const updateData = { updated_at: new Date().toISOString() };
        if (body.monto !== undefined) updateData.monto = Number(body.monto) || 0;
        if (body.metodo !== undefined) updateData.metodo = body.metodo;
        if (body.estado !== undefined) updateData.estado = body.estado;
        if (body.referencia !== undefined) updateData.referencia = String(body.referencia).trim();
        if (body.notas !== undefined) updateData.notas = String(body.notas).trim();

        const { data: updatedPay, error: updateErr } = await supabaseAdmin
          .from('payments')
          .update(updateData)
          .eq('id', paymentId)
          .select()
          .single();

        if (updateErr) return res.status(500).json({ error: updateErr.message });

        // Si se cambió a completado, asegurar activación del curso para el cliente
        if (body.estado === 'completado') {
          const { data: course } = await supabaseAdmin
            .from('courses')
            .select('*')
            .eq('id', existingPay.course_id)
            .single();

          if (course) {
            const vencimiento = calcularVencimiento(course.duracion_dias || 30);
            const horasAsignadas = course.tipo === 'servicio' ? course.horas : null;

            const { data: existingInsc } = await supabaseAdmin
              .from('inscripciones')
              .select('*')
              .eq('course_id', existingPay.course_id)
              .eq('client_id', existingPay.client_id)
              .maybeSingle();

            if (existingInsc) {
              await supabaseAdmin
                .from('inscripciones')
                .update({
                  estado: 'activo',
                  vencimiento,
                  horas_asignadas: horasAsignadas,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingInsc.id);
            } else {
              await supabaseAdmin
                .from('inscripciones')
                .insert({
                  course_id: existingPay.course_id,
                  client_id: existingPay.client_id,
                  estado: 'activo',
                  fecha_inscripcion: new Date().toISOString(),
                  vencimiento,
                  horas_asignadas: horasAsignadas,
                  horas_usadas: 0
                });
            }
          }
        }

        return res.json({ ok: true, payment: updatedPay });
      }

      if (req.method === 'DELETE') {
        const { error } = await supabaseAdmin
          .from('payments')
          .delete()
          .eq('id', paymentId);

        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ok: true });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    });
  });
};
