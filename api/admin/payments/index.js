const { requireAuth, requireAdmin } = require('../../lib/auth');
const { supabaseAdmin } = require('../../lib/supabase');

const DAY_MS = 24 * 60 * 60 * 1000;

function calcularVencimiento(duracionDias) {
  return new Date(Date.now() + (duracionDias || 30) * DAY_MS).toISOString();
}

module.exports = async (req, res) => {
  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      if (req.method === 'GET') {
        try {
          const [{ data: payments, error: payErr }, { data: profiles }, { data: courses }] = await Promise.all([
            supabaseAdmin.from('payments').select('*').order('created_at', { ascending: false }),
            supabaseAdmin.from('profiles').select('id, name, role'),
            supabaseAdmin.from('courses').select('id, nombre, tipo, price')
          ]);

          if (payErr) {
            // Tabla aún no migrada en Supabase
            return res.json({
              payments: [],
              stats: {
                totalRecaudado: 0,
                totalCompletados: 0,
                totalPendientes: 0,
                totalManuales: 0,
                totalPagos: 0
              }
            });
          }

          const clientMap = {};
          if (profiles) {
            profiles.forEach(p => { clientMap[p.id] = { name: p.name, email: '' }; });
          }

          // Obtener emails de auth.users si es posible
          try {
            const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
            if (usersData && usersData.users) {
              usersData.users.forEach(u => {
                if (clientMap[u.id]) clientMap[u.id].email = u.email || '';
              });
            }
          } catch (e) { /* ignore */ }

          const courseMap = {};
          if (courses) {
            courses.forEach(c => { courseMap[c.id] = c; });
          }

          const list = (payments || []).map(p => {
            const client = clientMap[p.client_id] || { name: '—', email: '—' };
            const course = courseMap[p.course_id] || { nombre: '—', tipo: 'curso', price: null };
            return {
              id: p.id,
              clientId: p.client_id,
              clienteNombre: client.name || '—',
              clienteEmail: client.email || '',
              courseId: p.course_id,
              cursoNombre: course.nombre || '—',
              cursoTipo: course.tipo || 'curso',
              monto: Number(p.monto) || 0,
              moneda: p.moneda || 'USD',
              metodo: p.metodo || 'manual',
              estado: p.estado || 'completado',
              referencia: p.referencia || '',
              notas: p.notas || '',
              createdAt: p.created_at,
              updatedAt: p.updated_at
            };
          });

          const completados = list.filter(p => p.estado === 'completado');
          const pendientes = list.filter(p => p.estado === 'pendiente');
          const manuales = list.filter(p => ['manual', 'cortesia', 'efectivo', 'transferencia', 'zelle'].includes(p.metodo));
          const totalRecaudado = completados.reduce((sum, p) => sum + p.monto, 0);

          return res.json({
            payments: list,
            stats: {
              totalRecaudado: Number(totalRecaudado.toFixed(2)),
              totalCompletados: completados.length,
              totalPendientes: pendientes.length,
              totalManuales: manuales.length,
              totalPagos: list.length
            }
          });
        } catch (e) {
          return res.status(500).json({ error: e.message || 'Error al obtener pagos' });
        }
      }

      if (req.method === 'POST') {
        const body = req.body || {};
        const clientId = String(body.clientId || body.clienteId || '').trim();
        const courseId = String(body.courseId || '').trim();
        const monto = Number(body.monto) || 0;
        const metodo = body.metodo || 'manual';
        const estado = body.estado || 'completado';
        const referencia = String(body.referencia || '').trim();
        const notas = String(body.notas || '').trim();
        const activarInscripcion = body.activarInscripcion !== false;

        if (!clientId) return res.status(400).json({ error: 'Selecciona un cliente válido.' });
        if (!courseId) return res.status(400).json({ error: 'Selecciona un curso válido.' });

        const { data: course } = await supabaseAdmin
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();

        if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

        let inscripcionResult = null;

        // Si se solicita activar la inscripción y el estado es completado (o manual)
        if (activarInscripcion && estado === 'completado') {
          const vencimiento = calcularVencimiento(course.duracion_dias || 30);
          const horasAsignadas = course.tipo === 'servicio' ? course.horas : null;

          // Buscar inscripción previa
          const { data: existingInsc } = await supabaseAdmin
            .from('inscripciones')
            .select('*')
            .eq('course_id', courseId)
            .eq('client_id', clientId)
            .maybeSingle();

          if (existingInsc) {
            const { data: updated } = await supabaseAdmin
              .from('inscripciones')
              .update({
                estado: 'activo',
                vencimiento: vencimiento,
                horas_asignadas: horasAsignadas,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingInsc.id)
              .select()
              .single();
            inscripcionResult = updated;
          } else {
            const { data: created } = await supabaseAdmin
              .from('inscripciones')
              .insert({
                course_id: courseId,
                client_id: clientId,
                estado: 'activo',
                fecha_inscripcion: new Date().toISOString(),
                vencimiento: vencimiento,
                horas_asignadas: horasAsignadas,
                horas_usadas: 0
              })
              .select()
              .single();
            inscripcionResult = created;
          }
        }

        // Registrar pago
        const { data: payment, error: payError } = await supabaseAdmin
          .from('payments')
          .insert({
            client_id: clientId,
            course_id: courseId,
            monto: monto,
            moneda: 'USD',
            metodo: metodo,
            estado: estado,
            referencia: referencia,
            notas: notas
          })
          .select()
          .single();

        if (payError) {
          return res.status(500).json({ error: payError.message });
        }

        return res.status(201).json({
          ok: true,
          payment: payment,
          inscripcion: inscripcionResult
        });
      }

      return res.status(405).json({ error: 'Method not allowed' });
    });
  });
};
