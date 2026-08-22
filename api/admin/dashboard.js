const { requireAuth, requireAdmin } = require('../lib/auth');
const { supabaseAdmin } = require('../lib/supabase');

const DAY_MS = 24 * 60 * 60 * 1000;

function diasRestantes(vencimiento) {
  if (!vencimiento) return null;
  const diff = new Date(vencimiento).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await requireAuth(req, res, async () => {
    await requireAdmin(req, res, async () => {
      const [{ data: profiles }, { data: courses }, { data: inscripciones }] = await Promise.all([
        supabaseAdmin.from('profiles').select('id, name, role'),
        supabaseAdmin.from('courses').select('id, nombre, tipo, cupo_max, horas, duracion_dias'),
        supabaseAdmin.from('inscripciones').select('id, course_id, client_id, estado, vencimiento, horas_asignadas, horas_usadas')
      ]);

      const totalClientes = (profiles || []).filter(p => p.role === 'client').length;
      const totalCursos = (courses || []).length;
      const activas = (inscripciones || []).filter(i => i.estado === 'activo');

      const nameById = {};
      if (profiles) profiles.forEach(p => { nameById[p.id] = p.name; });

      const courseMap = {};
      if (courses) courses.forEach(c => { courseMap[c.id] = c; });

      const porVencer = activas
        .map(a => {
          const dias = diasRestantes(a.vencimiento);
          const course = courseMap[a.course_id] || {};
          const horasRest = (course.tipo === 'servicio' && a.horas_asignadas)
            ? a.horas_asignadas - a.horas_usadas
            : null;
          return {
            clienteId: a.client_id,
            clienteNombre: nameById[a.client_id] || '—',
            cursoId: a.course_id,
            cursoNombre: course.nombre || '',
            diasRestantes: dias,
            horasRestantes: horasRest
          };
        })
        .filter(a => a.diasRestantes !== null && a.diasRestantes <= 7)
        .sort((a, b) => a.diasRestantes - b.diasRestantes);

      const cuposLibresTotales = (courses || []).reduce((sum, c) => {
        if (c.tipo !== 'curso' || !c.cupo_max) return sum;
        const active = activas.filter(i => i.course_id === c.id).length;
        return sum + Math.max(0, c.cupo_max - active);
      }, 0);

      const cursosIlimitados = (courses || []).filter(c => c.tipo === 'curso' && !c.cupo_max).length;
      const solicitudesPendientes = (inscripciones || []).filter(i => i.estado === 'pendiente').length;

      res.json({
        totalClientes,
        totalCursos,
        totalInscripciones: activas.length,
        cuposLibresTotales,
        cursosIlimitados,
        solicitudesPendientes,
        porVencer
      });
    });
  });
};
