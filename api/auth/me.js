const { requireAuth } = require('../lib/auth');
const { supabaseAdmin } = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    const userId = req.user.id;
    const profile = req.profile;

    let inscripciones = [];
    if (profile.role === 'client') {
      const { data: insc } = await supabaseAdmin
        .from('inscripciones')
        .select(`
          *,
          courses:course_id (id, nombre, tipo, horas, duracion_dias)
        `)
        .eq('client_id', userId);

      if (insc) {
        inscripciones = insc.map(i => {
          const course = i.courses || {};
          const diasRestantes = i.vencimiento
            ? Math.max(0, Math.ceil((new Date(i.vencimiento).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
            : null;
          return {
            cursoId: course.id || i.course_id,
            cursoNombre: course.nombre || '',
            tipo: course.tipo || '',
            estado: i.estado,
            fechaInscripcion: i.fecha_inscripcion,
            vencimiento: i.vencimiento,
            diasRestantes: diasRestantes,
            horasAsignadas: course.tipo === 'servicio' ? i.horas_asignadas : null,
            horasUsadas: course.tipo === 'servicio' ? i.horas_usadas : null,
            horasRestantes: course.tipo === 'servicio' && i.horas_asignadas
              ? i.horas_asignadas - i.horas_usadas
              : null
          };
        });
      }
    }

    res.json({
      user: {
        id: profile.id,
        name: profile.name,
        email: req.user.email,
        role: profile.role,
        createdAt: profile.created_at
      },
      inscripciones
    });
  });
};
