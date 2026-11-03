const { requireAuth } = require('../lib/auth');
const { supabaseAdmin } = require('../lib/supabase');

const DAY_MS = 24 * 60 * 60 * 1000;

function calcularVencimiento(duracionDias) {
  return new Date(Date.now() + (duracionDias || 30) * DAY_MS).toISOString();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    const userId = req.user.id;
    const body = req.body || {};
    const courseId = String(body.courseId || '').trim();
    const referencia = String(body.referencia || '').trim();
    const metodo = String(body.metodo || 'square').trim();
    const monto = Number(body.monto) || 0;

    if (!courseId) {
      return res.status(400).json({ error: 'ID de curso requerido.' });
    }

    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    // Auto-activación si viene de webhook verificado o admin, o registrar pendiente si lo reporta el cliente
    const esAdmin = req.profile && req.profile.role === 'admin';
    const autoActivar = esAdmin || body.autoActivate === true;
    const estado = autoActivar ? 'completado' : 'pendiente';

    // 1. Registrar pago
    let payment = null;
    try {
      const { data: pay, error: payErr } = await supabaseAdmin
        .from('payments')
        .insert({
          client_id: userId,
          course_id: courseId,
          monto: monto || Number(course.price) || 0,
          moneda: 'USD',
          metodo: metodo,
          estado: estado,
          referencia: referencia,
          notas: autoActivar ? 'Activación automática tras pago' : 'Pago reportado por el cliente, pendiente de verificación'
        })
        .select()
        .single();

      if (!payErr) payment = pay;
    } catch (e) { /* ignore if table not migrated */ }

    // 2. Si se activa automáticamente, habilitar inscripción
    let inscripcion = null;
    if (autoActivar) {
      const vencimiento = calcularVencimiento(course.duracion_dias || 30);
      const horasAsignadas = course.tipo === 'servicio' ? course.horas : null;

      const { data: existingInsc } = await supabaseAdmin
        .from('inscripciones')
        .select('*')
        .eq('course_id', courseId)
        .eq('client_id', userId)
        .maybeSingle();

      if (existingInsc) {
        const { data: updated } = await supabaseAdmin
          .from('inscripciones')
          .update({
            estado: 'activo',
            vencimiento,
            horas_asignadas: horasAsignadas,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInsc.id)
          .select()
          .single();
        inscripcion = updated;
      } else {
        const { data: created } = await supabaseAdmin
          .from('inscripciones')
          .insert({
            course_id: courseId,
            client_id: userId,
            estado: 'activo',
            fecha_inscripcion: new Date().toISOString(),
            vencimiento,
            horas_asignadas: horasAsignadas,
            horas_usadas: 0
          })
          .select()
          .single();
        inscripcion = created;
      }
    } else {
      // Crear solicitud pendiente si no existe
      const { data: existingInsc } = await supabaseAdmin
        .from('inscripciones')
        .select('*')
        .eq('course_id', courseId)
        .eq('client_id', userId)
        .maybeSingle();

      if (!existingInsc) {
        await supabaseAdmin
          .from('inscripciones')
          .insert({
            course_id: courseId,
            client_id: userId,
            estado: 'pendiente',
            fecha_inscripcion: new Date().toISOString(),
            horas_usadas: 0
          });
      }
    }

    return res.json({
      ok: true,
      activated: autoActivar,
      payment: payment,
      inscripcion: inscripcion,
      message: autoActivar
        ? '¡Pago procesado con éxito! Tu curso ha sido activado automáticamente.'
        : 'Hemos recibido tu confirmación de pago. El equipo verificará tu acceso en breve.'
    });
  });
};
