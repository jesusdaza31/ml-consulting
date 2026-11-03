const { supabaseAdmin } = require('../lib/supabase');

const DAY_MS = 24 * 60 * 60 * 1000;

function calcularVencimiento(duracionDias) {
  return new Date(Date.now() + (duracionDias || 30) * DAY_MS).toISOString();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = req.body || {};

  try {
    // Soporta formato directo o payload de Square
    const courseId = payload.courseId || payload.course_id || (payload.data && payload.data.object && payload.data.object.payment && payload.data.object.payment.note);
    const email = payload.email || (payload.data && payload.data.object && payload.data.object.payment && payload.data.object.payment.buyer_email_address);
    const clientId = payload.clientId || payload.client_id;
    const monto = Number(payload.monto) || (payload.data && payload.data.object && payload.data.object.payment && (payload.data.object.payment.amount_money.amount / 100)) || 0;
    const referencia = payload.referencia || (payload.data && payload.data.object && payload.data.object.payment && payload.data.object.payment.id) || ('pay_' + Date.now());

    let client = null;
    if (clientId) {
      const { data } = await supabaseAdmin.from('profiles').select('id, name').eq('id', clientId).maybeSingle();
      client = data;
    } else if (email) {
      // Buscar por email en auth.users
      try {
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const found = (usersData && usersData.users) ? usersData.users.find(u => u.email && u.email.toLowerCase() === email.toLowerCase()) : null;
        if (found) {
          const { data } = await supabaseAdmin.from('profiles').select('id, name').eq('id', found.id).maybeSingle();
          client = data;
        }
      } catch (e) { /* ignore */ }
    }

    if (!client) {
      return res.status(200).json({ ok: false, warning: 'Cliente no identificado en el webhook', payload });
    }

    let course = null;
    if (courseId) {
      const { data } = await supabaseAdmin.from('courses').select('*').eq('id', courseId).maybeSingle();
      course = data;
    }

    if (!course) {
      return res.status(200).json({ ok: false, warning: 'Curso no identificado en el webhook', payload });
    }

    // 1. Activar inscripción inmediatamente
    const vencimiento = calcularVencimiento(course.duracion_dias || 30);
    const horasAsignadas = course.tipo === 'servicio' ? course.horas : null;

    const { data: existingInsc } = await supabaseAdmin
      .from('inscripciones')
      .select('*')
      .eq('course_id', course.id)
      .eq('client_id', client.id)
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
          course_id: course.id,
          client_id: client.id,
          estado: 'activo',
          fecha_inscripcion: new Date().toISOString(),
          vencimiento,
          horas_asignadas: horasAsignadas,
          horas_usadas: 0
        });
    }

    // 2. Registrar en payments
    try {
      await supabaseAdmin
        .from('payments')
        .insert({
          client_id: client.id,
          course_id: course.id,
          monto: monto || Number(course.price) || 0,
          moneda: 'USD',
          metodo: 'square',
          estado: 'completado',
          referencia: String(referencia),
          notas: 'Pago recibido automáticamente vía Webhook'
        });
    } catch (e) { /* ignore if table not created */ }

    return res.json({ ok: true, active: true, client: client.id, course: course.id });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
};
